import * as Tone from 'tone'
import type { SynthPatch, SynthType } from '../schema/composition'
import { getPreset, listPresetNames } from './synth-presets'

/**
 * A Tone.js synth wrapped as an `InstrumentSource` — accepts either a
 * preset name or an inline SynthPatch, constructs the appropriate Tone.js
 * synth class, and outputs audio through a Tone.Gain the engine can connect
 * to an effects chain and mix bus channel.
 *
 * Extends `Tone.Gain` for the same reason `MultiLayerSampler` does: it needs
 * to satisfy the `InstrumentSource` interface (ToneAudioNode + triggerAttackRelease).
 */
export class SynthInstrument extends Tone.Gain {
  private synth:
    | Tone.MonoSynth
    | Tone.Synth
    | Tone.FMSynth
    | Tone.AMSynth
    | Tone.DuoSynth
    | Tone.PluckSynth
    | Tone.PolySynth

  constructor(patchOrName: SynthPatch | string) {
    super()

    const patch = resolvePatch(patchOrName)
    this.synth = createToneSynth(patch)
    this.synth.connect(this)
  }

  triggerAttackRelease(
    note: string | number,
    duration: string | number,
    time?: number,
    velocity?: number,
  ): this {
    // Type signature diverges slightly between synth classes. Cast once and
    // trust — all Tone.js synths accept the same (note, duration, time, velocity)
    // signature in practice.
    ;(this.synth as Tone.Synth).triggerAttackRelease(
      note as Tone.Unit.Frequency,
      duration as Tone.Unit.Time,
      time,
      velocity,
    )
    return this
  }

  /**
   * Expose the wrapped Tone.js synth node for external modulation (LFO routing,
   * automation of filter cutoff, etc.).
   *
   * Returns `null` for polyphonic synths because `Tone.PolySynth` manages N
   * voices internally — there's no accessible `Tone.Signal` on a shared filter
   * frequency or envelope, so modulating "the filter" from outside has no
   * well-defined meaning. Compositions that need LFO on a filter should use
   * a mono synth type (`type: 'mono'` or `polyphony: false` on fm/am).
   */
  getInnerSynth(): Tone.ToneAudioNode | null {
    if (this.synth instanceof Tone.PolySynth) return null
    return this.synth
  }

  dispose(): this {
    this.synth.dispose()
    return super.dispose()
  }
}

export function resolvePatch(patchOrName: SynthPatch | string): SynthPatch {
  if (typeof patchOrName === 'string') {
    const preset = getPreset(patchOrName)
    if (!preset) {
      throw new Error(
        `Unknown synth preset "${patchOrName}". Available presets: ${listPresetNames().join(', ')}`,
      )
    }
    return preset
  }
  return patchOrName
}

/**
 * Default polyphony per synth type. Can be overridden by `patch.polyphony`.
 */
export function defaultPolyphony(type: SynthType): boolean {
  switch (type) {
    case 'mono':
      return false
    case 'poly':
      return true
    case 'fm':
      return true
    case 'am':
      return true
    case 'duo':
      return false
    case 'pluck':
      return false
  }
}

function createToneSynth(
  patch: SynthPatch,
):
  | Tone.MonoSynth
  | Tone.Synth
  | Tone.FMSynth
  | Tone.AMSynth
  | Tone.DuoSynth
  | Tone.PluckSynth
  | Tone.PolySynth {
  const wantPoly = patch.polyphony ?? defaultPolyphony(patch.type)
  const options = buildSynthOptions(patch)

  switch (patch.type) {
    case 'mono':
      if (wantPoly) {
        return new Tone.PolySynth(Tone.MonoSynth, options)
      }
      return new Tone.MonoSynth(options)

    case 'poly':
      if (wantPoly) {
        return new Tone.PolySynth(Tone.Synth, options)
      }
      return new Tone.Synth(options)

    case 'fm':
      if (wantPoly) {
        return new Tone.PolySynth(Tone.FMSynth, options)
      }
      return new Tone.FMSynth(options)

    case 'am':
      if (wantPoly) {
        return new Tone.PolySynth(Tone.AMSynth, options)
      }
      return new Tone.AMSynth(options)

    case 'duo':
      // DuoSynth is intrinsically a 2-oscillator mono design. Polyphony is
      // ignored; a composition that needs poly detuned pairs should use
      // type: 'poly' with oscillator type 'fatsawtooth' and count: 2 instead.
      return new Tone.DuoSynth(options)

    case 'pluck':
      // PluckSynth (Karplus-Strong) doesn't wrap cleanly in PolySynth; use
      // poly fatsawtooth or similar for polyphonic plucks.
      return new Tone.PluckSynth()
  }
}

/**
 * Convert a SynthPatch to a Tone.js synth options object.
 *
 * Tone.js synth classes accept slightly different option shapes, but the
 * common subset (oscillator, envelope, filter, filterEnvelope, modulationIndex,
 * harmonicity) is shared across the classes we construct. Tone.js ignores
 * fields a given class doesn't use, so we build one permissive object and
 * pass it through.
 */
export function buildSynthOptions(patch: SynthPatch): Record<string, unknown> {
  const options: Record<string, unknown> = {}

  if (patch.oscillator) {
    options.oscillator = patch.oscillator
  }
  if (patch.envelope) {
    options.envelope = patch.envelope
  }
  if (patch.filter) {
    options.filter = patch.filter
  }
  if (patch.filterEnvelope) {
    options.filterEnvelope = patch.filterEnvelope
  }
  if (patch.modulationIndex !== undefined) {
    options.modulationIndex = patch.modulationIndex
  }
  if (patch.harmonicity !== undefined) {
    options.harmonicity = patch.harmonicity
  }

  return options
}
