import * as Tone from 'tone'
import type { InstrumentDef, Section } from '../schema/composition'
import { drumHitToNote } from '../util/music'
import { DrumKit } from './DrumKit'
import { MultiLayerSampler } from './MultiLayerSampler'
import { loadSampleData } from './SampleLoader'

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
