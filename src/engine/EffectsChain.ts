import type * as Tone from 'tone'
import type { EffectConfig } from '../schema/composition'
import { createEffect } from './effect-factory'

/**
 * A linear effects chain that routes audio through a series of Tone.js effect
 * nodes. Effect construction is delegated to the effect-factory, so EffectsChain
 * itself knows nothing about specific effect types — it just chains whatever
 * the factory produces.
 */
export class EffectsChain {
  private effects: Tone.ToneAudioNode[] = []

  /**
   * Build the effects chain and connect `source → effects → destination`.
   * If no effects are provided (or all fail to construct), the source is
   * connected directly to the destination.
   */
  connect(
    source: Tone.ToneAudioNode,
    destination: Tone.ToneAudioNode,
    effectConfigs?: EffectConfig[],
  ): void {
    if (!effectConfigs || effectConfigs.length === 0) {
      source.connect(destination)
      return
    }

    const nodes: Tone.ToneAudioNode[] = []
    for (const config of effectConfigs) {
      if (config.bypass) continue
      const effect = createEffect(config)
      if (effect) nodes.push(effect)
    }

    if (nodes.length === 0) {
      source.connect(destination)
      return
    }

    this.effects = nodes

    source.connect(nodes[0])
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].connect(nodes[i + 1])
    }
    nodes[nodes.length - 1].connect(destination)
  }

  dispose(): void {
    for (const effect of this.effects) {
      effect.dispose()
    }
    this.effects = []
  }
}
