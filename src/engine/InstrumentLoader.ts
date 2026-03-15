import * as Tone from "tone";
import type { InstrumentDef, Section } from "../schema/composition";
import { drumHitToNote } from "../util/music";
import { DrumKit } from "./DrumKit";

const CDN_BASE = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM";

/**
 * Sharps-to-flats mapping for CDN note names.
 * The CDN uses flats (Bb, Eb, etc.) while our internal format uses sharps.
 */
const SHARP_TO_FLAT: Record<string, string> = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
};

/**
 * Convert our internal note name (e.g. "C#4") to CDN key format (e.g. "Db4").
 */
function toCdnNoteName(note: string): string {
  const match = note.match(/^([A-G]#?)(\d+)$/);
  if (!match) return note;
  const [, name, octave] = match;
  const flat = SHARP_TO_FLAT[name];
  return flat ? flat + octave : note;
}

/**
 * Fetch the soundfont JS file for an instrument and extract the data URIs.
 * The file format is JS that assigns MIDI.Soundfont.xxx = { "A0": "data:...", ... }
 * We evaluate it to extract the note→dataURI map.
 */
async function fetchSoundfontData(sampleName: string): Promise<Record<string, string>> {
  const url = `${CDN_BASE}/${sampleName}-ogg.js`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch soundfont: ${url} (${response.status})`);
  }
  const text = await response.text();

  // Evaluate the JS in a sandboxed scope to extract the soundfont data
  const MIDI: { Soundfont: Record<string, Record<string, string>> } = { Soundfont: {} };
  const fn = new Function("MIDI", text);
  fn(MIDI);

  // The file sets MIDI.Soundfont[instrumentName]
  const keys = Object.keys(MIDI.Soundfont);
  if (keys.length === 0) {
    throw new Error(`No soundfont data found for ${sampleName}`);
  }

  return MIDI.Soundfont[keys[0]];
}

/** Union type for instrument audio sources — Sampler for melodic, DrumKit for drums. */
export type InstrumentSource = Tone.ToneAudioNode & {
  triggerAttackRelease(...args: unknown[]): unknown;
};

export interface LoadedInstrument {
  id: string;
  sampler: InstrumentSource;
  isDrum: boolean;
}

/**
 * Load all instruments needed for a composition.
 * Each sampler is left disconnected — the caller is responsible for routing
 * (e.g., through an EffectsChain → MixBus channel).
 */
export async function loadInstruments(
  instruments: InstrumentDef[],
  _sections: Section[]
): Promise<Map<string, LoadedInstrument>> {
  const loaded = new Map<string, LoadedInstrument>();
  const promises: Promise<void>[] = [];

  for (const inst of instruments) {
    const isDrum = inst.category === "drums";

    const promise = (async () => {
      try {
        // Drums use synthesized DrumKit — no soundfont needed
        if (isDrum) {
          const drumKit = new DrumKit();
          loaded.set(inst.id, { id: inst.id, sampler: drumKit, isDrum: true });
          return;
        }

        const soundfontData = await fetchSoundfontData(inst.sample);

        // Build urls map: Tone.Sampler accepts data URIs directly
        const urls: Record<string, string> = {};
        for (const [noteName, dataUri] of Object.entries(soundfontData)) {
          urls[noteName] = dataUri;
        }

        // Create sampler and wait for it to load (not connected to anything yet)
        await new Promise<void>((resolve, reject) => {
          const sampler = new Tone.Sampler({
            urls,
            onload: () => {
              loaded.set(inst.id, { id: inst.id, sampler, isDrum });
              resolve();
            },
            onerror: (err) => {
              console.warn(`Failed to decode samples for ${inst.id}`, err);
              reject(err);
            },
          });
        });
      } catch (err) {
        console.warn(`Failed to load instrument ${inst.id}:`, err);
      }
    })();

    promises.push(promise);
  }

  await Promise.all(promises);
  return loaded;
}

/**
 * Map a drum hit name to its MIDI note representation for Tone.Sampler.
 */
export function getDrumNote(hit: string): string | null {
  return drumHitToNote(hit);
}
