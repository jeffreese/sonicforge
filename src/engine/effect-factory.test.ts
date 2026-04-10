import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EFFECT_TYPES, type EffectConfig } from '../schema/composition'

// Tone.js audio nodes can't construct under jsdom (no real AudioContext), so
// we mock the module and assert that the factory calls the right Tone class
// with the right params. Integration of real Tone nodes is verified in the
// browser, not in unit tests.
const { ctorCalls } = vi.hoisted(() => ({
  ctorCalls: [] as Array<{ className: string; args: unknown[] }>,
}))

vi.mock('tone', () => {
  const makeStub = (name: string) =>
    class {
      wet = { value: 0 }
      constructor(...args: unknown[]) {
        ctorCalls.push({ className: name, args })
      }
      start() {
        return this
      }
      dispose() {}
      connect() {}
      disconnect() {}
    }
  return {
    Reverb: makeStub('Reverb'),
    FeedbackDelay: makeStub('FeedbackDelay'),
    PingPongDelay: makeStub('PingPongDelay'),
    Chorus: makeStub('Chorus'),
    Phaser: makeStub('Phaser'),
    Distortion: makeStub('Distortion'),
    BitCrusher: makeStub('BitCrusher'),
    AutoFilter: makeStub('AutoFilter'),
    Compressor: makeStub('Compressor'),
    Limiter: makeStub('Limiter'),
    EQ3: makeStub('EQ3'),
    StereoWidener: makeStub('StereoWidener'),
  }
})

// Import after the mock is declared so effect-factory picks up the stubs.
const { createEffect } = await import('./effect-factory')

beforeEach(() => {
  ctorCalls.length = 0
})

describe('createEffect', () => {
  it('constructs a node for every supported effect type', () => {
    for (const type of EFFECT_TYPES) {
      const effect = createEffect({ type, params: {} })
      expect(effect, `factory should return a node for ${type}`).not.toBeNull()
    }
    expect(ctorCalls).toHaveLength(EFFECT_TYPES.length)
  })

  it('returns null for an unknown effect type', () => {
    const unknown = { type: 'warp_drive' as unknown, params: {} } as EffectConfig
    expect(createEffect(unknown)).toBeNull()
  })

  it('maps each schema type to the expected Tone.js class', () => {
    const mapping: Record<string, string> = {
      reverb: 'Reverb',
      delay: 'FeedbackDelay',
      pingpong: 'PingPongDelay',
      chorus: 'Chorus',
      phaser: 'Phaser',
      distortion: 'Distortion',
      bitcrusher: 'BitCrusher',
      autofilter: 'AutoFilter',
      compressor: 'Compressor',
      limiter: 'Limiter',
      eq3: 'EQ3',
      stereowidener: 'StereoWidener',
    }
    for (const type of EFFECT_TYPES) {
      ctorCalls.length = 0
      createEffect({ type, params: {} })
      expect(ctorCalls[0]?.className, `type "${type}" should map to ${mapping[type]}`).toBe(
        mapping[type],
      )
    }
  })

  it('passes reverb params through to the constructor', () => {
    createEffect({ type: 'reverb', params: { decay: 5, wet: 0.8, preDelay: 0.05 } })
    const args = ctorCalls[0].args[0] as Record<string, number>
    expect(args.decay).toBe(5)
    expect(args.wet).toBe(0.8)
    expect(args.preDelay).toBe(0.05)
  })

  it('fills in default params when the config omits them', () => {
    createEffect({ type: 'reverb', params: {} })
    const args = ctorCalls[0].args[0] as Record<string, number>
    expect(args.decay).toBe(2.5)
    expect(args.wet).toBe(0.3)
  })

  it('accepts string time params for delay-like effects', () => {
    createEffect({ type: 'delay', params: { delayTime: '4n', feedback: 0.4 } })
    const args = ctorCalls[0].args[0] as Record<string, unknown>
    expect(args.delayTime).toBe('4n')
    expect(args.feedback).toBe(0.4)
  })

  it('passes limiter threshold as a positional argument', () => {
    createEffect({ type: 'limiter', params: { threshold: -1 } })
    // Tone.Limiter takes threshold as a positional argument.
    expect(ctorCalls[0].args[0]).toBe(-1)
  })

  it('fills in default limiter threshold when omitted', () => {
    createEffect({ type: 'limiter', params: {} })
    expect(ctorCalls[0].args[0]).toBe(-0.3)
  })
})
