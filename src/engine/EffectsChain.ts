import type * as Tone from 'tone'
import type { EffectConfig } from '../schema/composition'
import { createEffect } from './effect-factory'

/**
 * A linear effects chain that routes audio through a series of Tone.js effect
 * nodes. Effect construction is delegated to the effect-factory, so EffectsChain
 * itself knows nothing about specific effect types — it just chains whatever
 * the factory produces.
 *
 * Each constructed effect is tracked by its explicit `id` (if set) and by its
 * `type` (for the first effect of each type). The AutomationEngine uses these
 * lookups to resolve target paths like `"pad.mainReverb.wet"` (id-based) or
 * `"pad.reverb.wet"` (type-based first-match).
 */
export class EffectsChain {
  private effects: Tone.ToneAudioNode[] = []
  private byId = new Map<string, Tone.ToneAudioNode>()
  private byType = new Map<string, Tone.ToneAudioNode>()

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
      if (!effect) continue
      nodes.push(effect)
      if (config.id) {
        this.byId.set(config.id, effect)
      }
      // Type lookup resolves to the FIRST effect of that type in the chain.
      if (!this.byType.has(config.type)) {
        this.byType.set(config.type, effect)
      }
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

  /**
   * Look up an effect by identifier. Tries explicit `id` first, then falls
   * back to `type` (first match). Returns `null` if nothing matches.
   *
   * Used by the AutomationEngine to resolve target paths.
   */
  getEffect(idOrType: string): Tone.ToneAudioNode | null {
    return this.byId.get(idOrType) ?? this.byType.get(idOrType) ?? null
  }

  dispose(): void {
    for (const effect of this.effects) {
      effect.dispose()
    }
    this.effects = []
    this.byId.clear()
    this.byType.clear()
  }
}
