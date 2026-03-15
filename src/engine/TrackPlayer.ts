import * as Tone from "tone";
import type { Note, Track, Section, Metadata } from "../schema/composition";
import type { LoadedInstrument } from "./InstrumentLoader";
import type { SectionOffset } from "./Transport";
import { getDrumNote } from "./InstrumentLoader";
import { durationToSeconds } from "../util/timing";
import { parseNote } from "../util/music";

interface ScheduledNote {
  time: number; // in seconds (Tone.Transport time)
  pitch: string;
  duration: number; // in seconds
  velocity: number; // 0–1
}

function applyArticulation(
  note: Note,
  baseDuration: number,
  baseVelocity: number
): { duration: number; velocity: number } {
  let duration = baseDuration;
  let velocity = baseVelocity;

  switch (note.articulation) {
    case "staccato":
      duration *= 0.5;
      break;
    case "legato":
      duration *= 1.1;
      break;
    case "accent":
      velocity = Math.min(1, velocity * 1.3);
      break;
    case "ghost":
      velocity *= 0.4;
      break;
    case "tenuto":
      // full duration, no change
      break;
  }

  return { duration, velocity };
}

export class TrackPlayer {
  private scheduledEvents: number[] = [];

  constructor(
    private instrument: LoadedInstrument,
    private metadata: Metadata
  ) {}

  /**
   * Schedule all notes for a track within a section.
   */
  scheduleTrack(track: Track, sectionOffset: SectionOffset): void {
    const { section, startBar } = sectionOffset;
    const repeats = section.repeat ?? 1;
    const bpm = this.metadata.bpm;
    const beatsPerBar = this.metadata.timeSignature[0];
    const beatDuration = 60 / bpm;
    const baseBeatDuration = beatDuration * (4 / this.metadata.timeSignature[1]);

    for (let rep = 0; rep < repeats; rep++) {
      const repBarOffset = startBar + rep * section.bars;

      for (const note of track.notes) {
        if (note.pitch === "rest") continue;

        // Parse time "bar:beat:sixteenth"
        const timeParts = note.time.split(":").map(Number);
        const noteBar = (timeParts[0] ?? 0) + repBarOffset;
        const noteBeat = timeParts[1] ?? 0;
        const noteSixteenth = timeParts[2] ?? 0;

        const timeInSeconds =
          (noteBar * beatsPerBar + noteBeat + noteSixteenth / 4) * baseBeatDuration;

        const baseDuration = durationToSeconds(note.duration, bpm);
        const baseVelocity = (note.velocity ?? 80) / 127;

        const { duration, velocity } = applyArticulation(note, baseDuration, baseVelocity);

        // Determine the pitch to play
        let pitch: string;
        if (this.instrument.isDrum) {
          const drumNote = getDrumNote(note.pitch);
          if (!drumNote) continue;
          pitch = drumNote;
        } else {
          const parsed = parseNote(note.pitch);
          if (!parsed) continue;
          pitch = parsed.name + parsed.octave;
        }

        // Schedule with Tone.Transport
        const eventId = Tone.getTransport().schedule((time) => {
          this.instrument.sampler.triggerAttackRelease(pitch, duration, time, velocity);
        }, timeInSeconds);

        this.scheduledEvents.push(eventId);
      }
    }
  }

  dispose(): void {
    for (const id of this.scheduledEvents) {
      Tone.getTransport().clear(id);
    }
    this.scheduledEvents = [];
  }
}
