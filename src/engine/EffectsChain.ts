import * as Tone from "tone";
import type { EffectDef } from "../schema/composition";

type ToneEffect = Tone.Reverb | Tone.FeedbackDelay | Tone.Chorus | Tone.Distortion | Tone.EQ3 | Tone.Compressor;

function createEffect(def: EffectDef): ToneEffect | null {
  switch (def.type) {
    case "reverb":
      return new Tone.Reverb({
        decay: def.params.decay ?? 2.5,
        wet: def.params.wet ?? 0.3,
      });
    case "delay":
      return new Tone.FeedbackDelay({
        delayTime: def.params.delayTime ?? 0.25,
        feedback: def.params.feedback ?? 0.3,
        wet: def.params.wet ?? 0.2,
      });
    case "chorus":
      return new Tone.Chorus({
        frequency: def.params.frequency ?? 1.5,
        depth: def.params.depth ?? 0.7,
        wet: def.params.wet ?? 0.3,
      }).start();
    case "distortion":
      return new Tone.Distortion({
        distortion: def.params.distortion ?? 0.4,
        wet: def.params.wet ?? 0.5,
      });
    case "eq":
      return new Tone.EQ3({
        low: def.params.low ?? 0,
        mid: def.params.mid ?? 0,
        high: def.params.high ?? 0,
      });
    case "compressor":
      return new Tone.Compressor({
        threshold: def.params.threshold ?? -24,
        ratio: def.params.ratio ?? 4,
        attack: def.params.attack ?? 0.003,
        release: def.params.release ?? 0.25,
      });
    default:
      return null;
  }
}

export class EffectsChain {
  private effects: ToneEffect[] = [];

  /**
   * Build the effects chain and connect: source → effects → destination.
   * Returns the first node to connect the source to (or destination if no effects).
   */
  connect(
    source: Tone.ToneAudioNode,
    destination: Tone.ToneAudioNode,
    effectDefs?: EffectDef[]
  ): void {
    if (!effectDefs || effectDefs.length === 0) {
      source.connect(destination);
      return;
    }

    const nodes: ToneEffect[] = [];
    for (const def of effectDefs) {
      const effect = createEffect(def);
      if (effect) nodes.push(effect);
    }

    if (nodes.length === 0) {
      source.connect(destination);
      return;
    }

    this.effects = nodes;

    // Chain: source → effect[0] → effect[1] → ... → destination
    source.connect(nodes[0]);
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].connect(nodes[i + 1]);
    }
    nodes[nodes.length - 1].connect(destination);
  }

  dispose(): void {
    for (const effect of this.effects) {
      effect.dispose();
    }
    this.effects = [];
  }
}
