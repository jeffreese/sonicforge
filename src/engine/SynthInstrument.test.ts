import { describe, expect, it, vi } from 'vitest'
import type { SynthPatch } from '../schema/composition'

// Mock Tone.js so SynthInstrument can instantiate under jsdom. The real
// classes can't construct without a live AudioContext, so we stub each class
// as an extendable JS class. Instanceof checks still work because each stub
// is a distinct class.
vi.mock('tone', () => {
  class GainStub {
    connect() {
      return this
    }
    disconnect() {
      return this
    }
    dispose() {
      return this
    }
  }
  const makeSynthStub = () =>
    class extends GainStub {
      filter = { frequency: fakeParam(), Q: fakeParam() }
      oscillator = { detune: fakeParam() }
      triggerAttackRelease() {
        return this
      }
    }
  class PolySynthStub extends GainStub {
    triggerAttackRelease() {
      return this
    }
  }
  return {
    Gain: GainStub,
    MonoSynth: makeSynthStub(),
    Synth: makeSynthStub(),
    FMSynth: makeSynthStub(),
    AMSynth: makeSynthStub(),
    DuoSynth: makeSynthStub(),
    PluckSynth: class extends GainStub {
      triggerAttackRelease() {
        return this
      }
    },
    PolySynth: PolySynthStub,
  }
})

function fakeParam() {
  return {
    value: 0,
    setValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
    cancelScheduledValues: () => {},
  }
}

const { SynthInstrument, buildSynthOptions, defaultPolyphony, resolvePatch } = await import(
  './SynthInstrument'
)

describe('resolvePatch', () => {
  it('returns the patch unchanged when given a SynthPatch object', () => {
    const patch: SynthPatch = {
      type: 'mono',
      oscillator: { type: 'sawtooth' },
    }
    expect(resolvePatch(patch)).toBe(patch)
  })

  it('resolves a preset name to its patch', () => {
    const patch = resolvePatch('supersaw_lead')
    expect(patch.type).toBe('poly')
    expect(patch.oscillator?.type).toBe('fatsawtooth')
  })

  it('throws a helpful error for unknown preset names', () => {
    expect(() => resolvePatch('nonexistent_preset')).toThrow(
      /Unknown synth preset "nonexistent_preset".*Available presets/,
    )
  })

  it('error message lists the available preset names', () => {
    try {
      resolvePatch('bogus')
    } catch (e) {
      expect((e as Error).message).toContain('reese_bass')
      expect((e as Error).message).toContain('supersaw_lead')
    }
  })
})

describe('defaultPolyphony', () => {
  it('returns mono for type "mono"', () => {
    expect(defaultPolyphony('mono')).toBe(false)
  })

  it('returns poly for type "poly"', () => {
    expect(defaultPolyphony('poly')).toBe(true)
  })

  it('returns poly for type "fm" and "am" (typical EDM usage)', () => {
    expect(defaultPolyphony('fm')).toBe(true)
    expect(defaultPolyphony('am')).toBe(true)
  })

  it('returns mono for "duo" and "pluck" (their synths are intrinsically mono)', () => {
    expect(defaultPolyphony('duo')).toBe(false)
    expect(defaultPolyphony('pluck')).toBe(false)
  })
})

describe('buildSynthOptions', () => {
  it('returns an empty object for a minimal patch', () => {
    expect(buildSynthOptions({ type: 'mono' })).toEqual({})
  })

  it('passes oscillator, envelope, filter, filterEnvelope through', () => {
    const patch: SynthPatch = {
      type: 'mono',
      oscillator: { type: 'sawtooth', detune: 10 },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.3 },
      filter: { type: 'lowpass', frequency: 800, Q: 2 },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 0.2,
        baseFrequency: 200,
        octaves: 3,
      },
    }
    const options = buildSynthOptions(patch)
    expect(options.oscillator).toEqual(patch.oscillator)
    expect(options.envelope).toEqual(patch.envelope)
    expect(options.filter).toEqual(patch.filter)
    expect(options.filterEnvelope).toEqual(patch.filterEnvelope)
  })

  it('passes FM params (modulationIndex, harmonicity) through', () => {
    const patch: SynthPatch = {
      type: 'fm',
      modulationIndex: 10,
      harmonicity: 3.01,
    }
    const options = buildSynthOptions(patch)
    expect(options.modulationIndex).toBe(10)
    expect(options.harmonicity).toBe(3.01)
  })

  it('omits undefined fields rather than passing them explicitly', () => {
    const options = buildSynthOptions({ type: 'mono' })
    expect('oscillator' in options).toBe(false)
    expect('envelope' in options).toBe(false)
    expect('filter' in options).toBe(false)
  })
})

describe('SynthInstrument.getInnerSynth', () => {
  it('returns the inner synth for a mono type', () => {
    const instance = new SynthInstrument({ type: 'mono' })
    const inner = instance.getInnerSynth()
    expect(inner).not.toBeNull()
  })

  it('returns the inner synth for fm with polyphony: false', () => {
    const instance = new SynthInstrument({ type: 'fm', polyphony: false })
    expect(instance.getInnerSynth()).not.toBeNull()
  })

  it('returns null for poly type (PolySynth cannot be modulated from outside)', () => {
    const instance = new SynthInstrument({ type: 'poly' })
    expect(instance.getInnerSynth()).toBeNull()
  })

  it('returns null for fm with default (polyphonic) wrapping', () => {
    const instance = new SynthInstrument({ type: 'fm' })
    expect(instance.getInnerSynth()).toBeNull()
  })

  it('returns the inner synth for duo (intrinsically mono)', () => {
    const instance = new SynthInstrument({ type: 'duo' })
    expect(instance.getInnerSynth()).not.toBeNull()
  })

  it('exposes a filter.frequency Tone.Param on mono synths', () => {
    const instance = new SynthInstrument({ type: 'mono' })
    const inner = instance.getInnerSynth() as unknown as Record<string, unknown>
    const filter = inner.filter as Record<string, unknown>
    expect(typeof (filter.frequency as { setValueAtTime: unknown }).setValueAtTime).toBe('function')
  })
})
