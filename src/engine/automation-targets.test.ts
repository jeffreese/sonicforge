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

  return {
    mixBus,
    instrumentChains: new Map([['lead', leadChain]]),
    masterChain,
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
})
