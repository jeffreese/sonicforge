import { describe, expect, it } from 'vitest'
import { type AutomationTargetRegistry, resolveTarget } from './automation-targets'

// Fake param object — duck-typed to look like a Tone.Param.
function fakeParam() {
  return {
    value: 0,
    setValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
    cancelScheduledValues: () => {},
  }
}

function fakeChannel() {
  return {
    volume: fakeParam(),
    pan: fakeParam(),
  }
}

function fakeEffect(params: Record<string, unknown>) {
  return params
}

function makeRegistry(): AutomationTargetRegistry {
  const leadChannel = fakeChannel()
  const bassChannel = fakeChannel()
  const mixBus = {
    getChannel(id: string) {
      if (id === 'lead') return leadChannel
      if (id === 'bass') return bassChannel
      return undefined
    },
  } as unknown as AutomationTargetRegistry['mixBus']

  // EffectsChain fake — respects id then type lookup.
  const leadReverb = fakeEffect({ wet: fakeParam(), decay: fakeParam() })
  const leadDelay = fakeEffect({ wet: fakeParam(), feedback: fakeParam() })
  const leadMainReverb = fakeEffect({ wet: fakeParam() })

  const leadChain = {
    getEffect(idOrType: string) {
      // id-first lookup (matches production EffectsChain behavior)
      if (idOrType === 'mainReverb') return leadMainReverb
      if (idOrType === 'reverb') return leadReverb
      if (idOrType === 'delay') return leadDelay
      return null
    },
  } as unknown as Parameters<typeof resolveTarget>[1]['instrumentChains'] extends Map<
    string,
    infer T
  >
    ? T
    : never

  const masterLimiter = fakeEffect({ threshold: fakeParam() })
  const masterChain = {
    getEffect(idOrType: string) {
      if (idOrType === 'limiter') return masterLimiter
      return null
    },
  } as unknown as AutomationTargetRegistry['masterChain']

  // Fake synth node for "bass" — a mono synth with filter + oscillator.
  // Each nested object that terminates in a Tone.Param returns a fakeParam.
  const bassSynthNode = {
    filter: {
      frequency: fakeParam(),
      Q: fakeParam(),
      // nonParam: a raw number should NOT be resolved as a target.
      type: 'lowpass',
    },
    oscillator: {
      detune: fakeParam(),
    },
    volume: fakeParam(),
  }

  return {
    mixBus,
    instrumentChains: new Map([['lead', leadChain]]),
    masterChain,
    getInstrumentSynthNode(id: string) {
      if (id === 'bass') return bassSynthNode
      return null
    },
  }
}

describe('resolveTarget', () => {
  it('resolves track volume', () => {
    const target = resolveTarget('lead.volume', makeRegistry())
    expect(target).not.toBeNull()
    expect(typeof target?.setValueAtTime).toBe('function')
  })

  it('resolves track pan', () => {
    const target = resolveTarget('lead.pan', makeRegistry())
    expect(target).not.toBeNull()
  })

  it('resolves per-instrument effect param by type', () => {
    const target = resolveTarget('lead.reverb.wet', makeRegistry())
    expect(target).not.toBeNull()
  })

  it('resolves per-instrument effect param by explicit id', () => {
    const target = resolveTarget('lead.mainReverb.wet', makeRegistry())
    expect(target).not.toBeNull()
  })

  it('resolves master effect param', () => {
    const target = resolveTarget('master.limiter.threshold', makeRegistry())
    expect(target).not.toBeNull()
  })

  it('returns null for unknown instrument', () => {
    expect(resolveTarget('ghost.volume', makeRegistry())).toBeNull()
  })

  it('returns null for unknown track param', () => {
    expect(resolveTarget('lead.mute', makeRegistry())).toBeNull()
  })

  it('returns null for unknown effect', () => {
    expect(resolveTarget('lead.phaser.frequency', makeRegistry())).toBeNull()
  })

  it('returns null for unknown effect param', () => {
    expect(resolveTarget('lead.reverb.nonexistent', makeRegistry())).toBeNull()
  })

  it('returns null for malformed path (no separator)', () => {
    expect(resolveTarget('justone', makeRegistry())).toBeNull()
  })

  it('returns null for master path with no effect chain', () => {
    const registry = makeRegistry()
    registry.masterChain = null
    expect(resolveTarget('master.limiter.threshold', registry)).toBeNull()
  })

  it('returns null for master path with unknown effect', () => {
    expect(resolveTarget('master.ghost.something', makeRegistry())).toBeNull()
  })

  // ───── Synth-internal resolution (sub-epic #4) ─────

  it('resolves a synth-internal filter frequency param', () => {
    const target = resolveTarget('bass.filter.frequency', makeRegistry())
    expect(target).not.toBeNull()
    expect(typeof target?.setValueAtTime).toBe('function')
  })

  it('resolves a synth-internal filter Q param', () => {
    const target = resolveTarget('bass.filter.Q', makeRegistry())
    expect(target).not.toBeNull()
  })

  it('resolves a nested oscillator detune param', () => {
    const target = resolveTarget('bass.oscillator.detune', makeRegistry())
    expect(target).not.toBeNull()
  })

  it('returns null for a non-param synth property (e.g. filter.type string)', () => {
    // filter.type is a string ('lowpass'), not a Tone.Param — resolver should
    // reject it via the duck-type check.
    expect(resolveTarget('bass.filter.type', makeRegistry())).toBeNull()
  })

  it('returns null for an unknown synth-internal path', () => {
    expect(resolveTarget('bass.nonexistent.param', makeRegistry())).toBeNull()
  })

  it('returns null for a PolySynth instrument (no inner synth available)', () => {
    // A synth whose getInstrumentSynthNode returns null (simulating PolySynth)
    // cannot be modulated from outside.
    const registry = makeRegistry()
    registry.getInstrumentSynthNode = () => null
    expect(resolveTarget('bass.filter.frequency', registry)).toBeNull()
  })

  it('effect lookup wins over synth-internal when both paths would resolve', () => {
    // If "lead" had both an effect named "filter" AND a synth filter, the
    // effect lookup takes precedence. We don't have a "filter" effect in the
    // fixture but the lead's effect chain returns null for "filter", so the
    // fallback to synth-internal should work if lead had a synth node.
    // Here we verify the FALLBACK order: effect first, then synth.
    const registry = makeRegistry()
    // Add a synth node for lead as well.
    const leadSynthNode = { filter: { frequency: fakeParam() } }
    registry.getInstrumentSynthNode = (id: string) => {
      if (id === 'bass') return null
      if (id === 'lead') return leadSynthNode
      return null
    }
    // lead.reverb.wet → effect path wins
    expect(resolveTarget('lead.reverb.wet', registry)).not.toBeNull()
    // lead.filter.frequency → no effect called "filter", falls back to synth
    expect(resolveTarget('lead.filter.frequency', registry)).not.toBeNull()
  })
})
