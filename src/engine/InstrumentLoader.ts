import * as Tone from 'tone'
import type { InstrumentDef, Section } from '../schema/composition'
import { drumHitToNote } from '../util/music'
import { DrumKit } from './DrumKit'
import { MultiLayerSampler } from './MultiLayerSampler'
import { loadSampleData } from './SampleLoader'
import { SynthInstrument } from './SynthInstrument'

/** Union type for instrument audio sources — Sampler for melodic, DrumKit for drums. */
export type InstrumentSource = Tone.ToneAudioNode & {
  triggerAttackRelease(...args: unknown[]): unknown
}

export interface LoadedInstrument {
  id: string
  sampler: InstrumentSource
  isDrum: boolean
}

/**
 * Load all instruments needed for a composition.
 * Each sampler is left disconnected — the caller is responsible for routing
 * (e.g., through an EffectsChain → MixBus channel).
 */
export async function loadInstruments(
  instruments: InstrumentDef[],
  _sections: Section[],
): Promise<Map<string, LoadedInstrument>> {
  const loaded = new Map<string, LoadedInstrument>()
  const promises: Promise<void>[] = []

  for (const inst of instruments) {
    const isDrum = inst.category === 'drums'

    const promise = (async () => {
      try {
        // Drums use synthesized DrumKit — no soundfont needed
        if (isDrum) {
          const drumKit = new DrumKit()
          loaded.set(inst.id, { id: inst.id, sampler: drumKit, isDrum: true })
          return
        }

        // Synth instruments — wrap Tone.js synths via SynthInstrument.
        if (inst.source === 'synth') {
          if (!inst.synth) {
            throw new Error(
              `Instrument "${inst.id}": source "synth" requires a synth patch or preset name`,
            )
          }
          const synthInstrument = new SynthInstrument(inst.synth)
          loaded.set(inst.id, { id: inst.id, sampler: synthInstrument, isDrum: false })
          return
        }

        // One-shot instruments are not yet supported — ships in sub-epic #5.
        if (inst.source === 'oneshot') {
          throw new Error(
            `Instrument "${inst.id}": source "oneshot" is not yet supported at runtime. One-shot instruments ship in sub-epic #5.`,
          )
        }

        // Default path: 'sampled' instruments via MultiLayerSampler / Tone.Sampler.
        if (!inst.sample) {
          throw new Error(`Instrument "${inst.id}": sampled source requires a "sample" field`)
        }

        const sampleData = await loadSampleData(inst.sample)

        if (sampleData.layers.length === 1 && sampleData.layers[0].velocity === 0) {
          // Legacy single-layer manifest — use plain Tone.Sampler
          const layer = sampleData.layers[0]
          await new Promise<void>((resolve, reject) => {
            const sampler = new Tone.Sampler({
              urls: layer.urls,
              baseUrl: layer.baseUrl,
              onload: () => {
                loaded.set(inst.id, { id: inst.id, sampler, isDrum })
                resolve()
              },
              onerror: (err) => {
                console.warn(`Failed to decode samples for ${inst.id}`, err)
                reject(err)
              },
            })
          })
        } else {
          // Multi-layer manifest — use MultiLayerSampler
          const multiSampler = new MultiLayerSampler()
          await multiSampler.load(sampleData.layers)
          loaded.set(inst.id, { id: inst.id, sampler: multiSampler, isDrum })
        }
      } catch (err) {
        console.warn(`Failed to load instrument ${inst.id}:`, err)
      }
    })()

    promises.push(promise)
  }

  await Promise.all(promises)
  return loaded
}

/**
 * Map a drum hit name to its MIDI note representation for Tone.Sampler.
 */
export function getDrumNote(hit: string): string | null {
  return drumHitToNote(hit)
}
