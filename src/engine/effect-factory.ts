import * as Tone from 'tone'
import type { EffectConfig } from '../schema/composition'

/**
 * Factory that maps an `EffectConfig` to a constructed Tone.js effect node.
 *
 * Each case applies sensible defaults for any params the config doesn't supply,
 * so a minimal `{ type: 'reverb', params: {} }` still produces a usable effect.
 *
 * Returns `null` for unknown effect types — callers should skip those. This
 * function never throws; validation of effect types happens at schema level.
 */
export function createEffect(config: EffectConfig): Tone.ToneAudioNode | null {
  // Tone.js constructors accept `number | string` for most time-like params,
  // so casting to a permissive shape keeps the factory straightforward.
  const p = config.params as Record<string, number | string | undefined>

  switch (config.type) {
    case 'reverb':
      return new Tone.Reverb({
        decay: numeric(p.decay, 2.5),
        preDelay: numeric(p.preDelay, 0.01),
        wet: numeric(p.wet, 0.3),
      })

    case 'delay':
      return new Tone.FeedbackDelay({
        delayTime: p.delayTime ?? 0.25,
        feedback: numeric(p.feedback, 0.3),
        wet: numeric(p.wet, 0.2),
      })

    case 'pingpong':
      return new Tone.PingPongDelay({
        delayTime: p.delayTime ?? 0.25,
        feedback: numeric(p.feedback, 0.3),
        wet: numeric(p.wet, 0.3),
      })

    case 'chorus':
      return new Tone.Chorus({
        frequency: p.frequency ?? 1.5,
        delayTime: numeric(p.delayTime, 3.5),
        depth: numeric(p.depth, 0.7),
        wet: numeric(p.wet, 0.3),
      }).start()

    case 'phaser':
      return new Tone.Phaser({
        frequency: p.frequency ?? 0.5,
        octaves: numeric(p.octaves, 3),
        baseFrequency: numeric(p.baseFrequency, 350),
        wet: numeric(p.wet, 0.3),
      })

    case 'distortion':
      return new Tone.Distortion({
        distortion: numeric(p.distortion, 0.4),
        wet: numeric(p.wet, 0.5),
      })

    case 'bitcrusher': {
      // BitCrusher is a worklet effect and takes bits in its options; wet is
      // set on the instance after construction.
      const bc = new Tone.BitCrusher({ bits: numeric(p.bits, 4) })
      bc.wet.value = numeric(p.wet, 0.5)
      return bc
    }

    case 'autofilter':
      return new Tone.AutoFilter({
        frequency: p.frequency ?? 1,
        baseFrequency: numeric(p.baseFrequency, 200),
        octaves: numeric(p.octaves, 2.6),
        wet: numeric(p.wet, 0.5),
      }).start()

    case 'compressor':
      return new Tone.Compressor({
        threshold: numeric(p.threshold, -24),
        ratio: numeric(p.ratio, 4),
        attack: numeric(p.attack, 0.003),
        release: numeric(p.release, 0.25),
      })

    case 'limiter':
      return new Tone.Limiter(numeric(p.threshold, -0.3))

    case 'eq3':
      return new Tone.EQ3({
        low: numeric(p.low, 0),
        mid: numeric(p.mid, 0),
        high: numeric(p.high, 0),
        lowFrequency: numeric(p.lowFrequency, 400),
        highFrequency: numeric(p.highFrequency, 2500),
      })

    case 'stereowidener':
      return new Tone.StereoWidener({
        width: numeric(p.width, 0.5),
      })

    default:
      return null
  }
}

function numeric(value: number | string | undefined, fallback: number): number {
  return typeof value === 'number' ? value : fallback
}
