import * as Tone from 'tone'
import type { LayerSampleData } from './SampleLoader'

/**
 * Select the velocity layer closest to the given velocity value.
 * Velocity is 0–1 (Tone.js scale), layers are 0–127 (MIDI scale).
 */
export function selectVelocityLayer(velocity: number, layers: number[]): number {
  const midiVelocity = Math.round(velocity * 127)
  let closest = layers[0]
  let closestDist = Math.abs(midiVelocity - closest)

  for (let i = 1; i < layers.length; i++) {
    const dist = Math.abs(midiVelocity - layers[i])
    if (dist < closestDist) {
      closest = layers[i]
      closestDist = dist
    }
  }

  return closest
}

/**
 * A multi-velocity-layer sampler that wraps multiple Tone.Sampler instances.
 * At trigger time, selects the layer whose extracted velocity is closest to
 * the requested velocity. The layer provides the timbre; amplitude scaling
 * is still applied via the velocity parameter to Tone.Sampler.
 */
export class MultiLayerSampler extends Tone.Gain {
  private samplers: Map<number, Tone.Sampler> = new Map()
  private velocityLayers: number[] = []

  /**
   * Create samplers for each velocity layer. Returns a promise that resolves
   * when all samplers have loaded their samples.
   */
  async load(layers: LayerSampleData[]): Promise<void> {
    this.velocityLayers = layers.map((l) => l.velocity).sort((a, b) => a - b)

    const promises = layers.map(
      (layer) =>
        new Promise<void>((resolve, reject) => {
          const sampler = new Tone.Sampler({
            urls: layer.urls,
            baseUrl: layer.baseUrl,
            onload: () => {
              sampler.connect(this)
              this.samplers.set(layer.velocity, sampler)
              resolve()
            },
            onerror: (err) => reject(err),
          })
        }),
    )

    await Promise.all(promises)
  }

  triggerAttackRelease(
    note: string | number,
    duration: string | number,
    time?: number,
    velocity?: number,
  ): this {
    const vel = velocity ?? 0.5
    const layerVelocity = selectVelocityLayer(vel, this.velocityLayers)
    const sampler = this.samplers.get(layerVelocity)
    if (sampler) {
      sampler.triggerAttackRelease(note, duration, time, vel)
    }
    return this
  }

  dispose(): this {
    for (const sampler of this.samplers.values()) {
      sampler.dispose()
    }
    this.samplers.clear()
    return super.dispose()
  }
}
