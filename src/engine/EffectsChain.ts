import * as Tone from 'tone'
import type { EffectConfig } from '../schema/composition'

type ToneEffect =
  | Tone.Reverb
  | Tone.FeedbackDelay
  | Tone.Chorus
  | Tone.Distortion
  | Tone.EQ3
  | Tone.Compressor

function createEffect(def: EffectConfig): ToneEffect | null {
  // This engine only handles numeric params. Sub-epic #2 will replace this with a
  // full effect-factory that supports the broader Tone.js vocabulary and handles
  // string params (e.g., note-value frequencies like "4n").
  const p = def.params as Record<string, number>
  switch (def.type) {
    case 'reverb':
      return new Tone.Reverb({
        decay: p.decay ?? 2.5,
        wet: p.wet ?? 0.3,
      })
    case 'delay':
      return new Tone.FeedbackDelay({
        delayTime: p.delayTime ?? 0.25,
        feedback: p.feedback ?? 0.3,
        wet: p.wet ?? 0.2,
      })
    case 'chorus':
      return new Tone.Chorus({
        frequency: p.frequency ?? 1.5,
        depth: p.depth ?? 0.7,
        wet: p.wet ?? 0.3,
      }).start()
    case 'distortion':
      return new Tone.Distortion({
        distortion: p.distortion ?? 0.4,
        wet: p.wet ?? 0.5,
      })
    case 'eq3':
      return new Tone.EQ3({
        low: p.low ?? 0,
        mid: p.mid ?? 0,
        high: p.high ?? 0,
      })
    case 'compressor':
      return new Tone.Compressor({
        threshold: p.threshold ?? -24,
        ratio: p.ratio ?? 4,
        attack: p.attack ?? 0.003,
        release: p.release ?? 0.25,
      })
    default:
      // Unknown effect types (e.g., bitcrusher, phaser) are silently skipped here.
      // Sub-epic #2 will expand this factory to support the full vocabulary.
      return null
  }
}

export class EffectsChain {
  private effects: ToneEffect[] = []

  /**
   * Build the effects chain and connect: source → effects → destination.
   * Returns the first node to connect the source to (or destination if no effects).
   */
  connect(
    source: Tone.ToneAudioNode,
    destination: Tone.ToneAudioNode,
    effectDefs?: EffectConfig[],
  ): void {
    if (!effectDefs || effectDefs.length === 0) {
      source.connect(destination)
      return
    }

    const nodes: ToneEffect[] = []
    for (const def of effectDefs) {
      const effect = createEffect(def)
      if (effect) nodes.push(effect)
    }

    if (nodes.length === 0) {
      source.connect(destination)
      return
    }

    this.effects = nodes

    // Chain: source → effect[0] → effect[1] → ... → destination
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
