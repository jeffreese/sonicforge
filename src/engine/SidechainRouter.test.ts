import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SidechainConfig } from '../schema/composition'

// Capture instances of the Tone.js classes the SidechainRouter constructs
// so we can assert on their wiring. Each tracking array holds the actual
// stub instances (via `push(this)`), so identity comparisons work.
const { instances } = vi.hoisted(() => ({
  instances: {
    gains: [] as GainStubInstance[],
    followers: [] as FollowerStubInstance[],
    multipliers: [] as MultiplyStubInstance[],
  },
}))

interface GainStubInstance {
  gainValue: number
  gain: { __isGainSignal: true }
}
interface FollowerStubInstance {
  opts: unknown
  connectedTo: unknown[]
}
interface MultiplyStubInstance {
  factor: number
  connectedTo: unknown[]
}

vi.mock('tone', () => {
  class GainStub {
    gainValue: number
    gain = { __isGainSignal: true as const }
    constructor(value: number) {
      this.gainValue = value
      instances.gains.push(this as unknown as GainStubInstance)
    }
    dispose() {}
    connect() {}
  }
  class FollowerStub {
    opts: unknown
    connectedTo: unknown[] = []
    constructor(opts: unknown) {
      this.opts = opts
      instances.followers.push(this as unknown as FollowerStubInstance)
    }
    connect(to: unknown) {
      this.connectedTo.push(to)
    }
    dispose() {}
  }
  class MultiplyStub {
    factor: number
    connectedTo: unknown[] = []
    constructor(factor: number) {
      this.factor = factor
      instances.multipliers.push(this as unknown as MultiplyStubInstance)
    }
    connect(to: unknown) {
      this.connectedTo.push(to)
    }
    dispose() {}
  }
  return {
    Gain: GainStub,
    Follower: FollowerStub,
    Multiply: MultiplyStub,
  }
})

const { SidechainRouter } = await import('./SidechainRouter')

// Fake MixBus channel that records whether it was connected to a follower.
function fakeMixBus(channels: Map<string, { connectTargets: unknown[] }>) {
  return {
    getChannel(id: string) {
      const ch = channels.get(id)
      if (!ch) return undefined
      return {
        connect(to: unknown) {
          ch.connectTargets.push(to)
        },
      }
    },
  } as unknown as Parameters<InstanceType<typeof SidechainRouter>['connectSources']>[2]
}

function fakeInstruments(ids: string[]) {
  const map = new Map()
  for (const id of ids) map.set(id, { id, sampler: {}, mode: 'pitched' })
  return map
}

beforeEach(() => {
  instances.gains = []
  instances.followers = []
  instances.multipliers = []
})

describe('SidechainRouter', () => {
  it('prepareTargets creates one gain per unique target', () => {
    const router = new SidechainRouter()
    const configs: SidechainConfig[] = [
      { source: 'kick', target: 'pad', amount: 0.7 },
      { source: 'kick', target: 'bass', amount: 0.5 },
    ]
    router.prepareTargets(configs)
    expect(router.targetCount).toBe(2)
    expect(instances.gains.length).toBe(2)
    // Both ducking gains start at value 1 (pass-through).
    expect(instances.gains.every((g) => g.gainValue === 1)).toBe(true)
  })

  it('prepareTargets reuses a single gain when multiple configs share a target', () => {
    const router = new SidechainRouter()
    const configs: SidechainConfig[] = [
      { source: 'kick', target: 'pad', amount: 0.7 },
      { source: 'snare', target: 'pad', amount: 0.3 },
    ]
    router.prepareTargets(configs)
    expect(router.targetCount).toBe(1)
    expect(instances.gains.length).toBe(1)
  })

  it('prepareTargets with no configs is a no-op', () => {
    const router = new SidechainRouter()
    router.prepareTargets(undefined)
    router.prepareTargets([])
    expect(router.targetCount).toBe(0)
  })

  it('connectSources wires follower → multiplier(-amount) → duckingGain.gain', () => {
    const router = new SidechainRouter()
    const configs: SidechainConfig[] = [{ source: 'kick', target: 'pad', amount: 0.8 }]
    router.prepareTargets(configs)

    const channels = new Map([
      ['kick', { connectTargets: [] as unknown[] }],
      ['pad', { connectTargets: [] as unknown[] }],
    ])
    const mixBus = fakeMixBus(channels)
    router.connectSources(configs, fakeInstruments(['kick', 'pad']), mixBus)

    // kick channel connected to the follower
    expect(channels.get('kick')?.connectTargets.length).toBe(1)
    // One follower, one multiplier
    expect(instances.followers.length).toBe(1)
    expect(instances.multipliers.length).toBe(1)
    // Multiply factor is -amount
    expect(instances.multipliers[0].factor).toBe(-0.8)
    // Follower → multiplier
    expect(instances.followers[0].connectedTo[0]).toBe(instances.multipliers[0])
    // Multiplier → target gain's .gain Tone.Signal
    expect(instances.multipliers[0].connectedTo[0]).toBe(instances.gains[0].gain)
  })

  it('passes release as follower smoothing time', () => {
    const router = new SidechainRouter()
    const configs: SidechainConfig[] = [
      { source: 'kick', target: 'pad', amount: 0.5, release: 0.2 },
    ]
    router.prepareTargets(configs)
    const channels = new Map([
      ['kick', { connectTargets: [] as unknown[] }],
      ['pad', { connectTargets: [] as unknown[] }],
    ])
    router.connectSources(configs, fakeInstruments(['kick', 'pad']), fakeMixBus(channels))
    // Follower takes smoothing as the constructor's first positional arg.
    expect(instances.followers[0].opts).toBe(0.2)
  })

  it('uses default follower smoothing when release is not specified', () => {
    const router = new SidechainRouter()
    const configs: SidechainConfig[] = [{ source: 'kick', target: 'pad', amount: 0.5 }]
    router.prepareTargets(configs)
    const channels = new Map([
      ['kick', { connectTargets: [] as unknown[] }],
      ['pad', { connectTargets: [] as unknown[] }],
    ])
    router.connectSources(configs, fakeInstruments(['kick', 'pad']), fakeMixBus(channels))
    expect(instances.followers[0].opts).toBe(0.1)
  })

  it('skips configs with unknown source', () => {
    const router = new SidechainRouter()
    const configs: SidechainConfig[] = [{ source: 'ghost', target: 'pad', amount: 0.5 }]
    router.prepareTargets(configs)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const channels = new Map([['pad', { connectTargets: [] as unknown[] }]])
    router.connectSources(configs, fakeInstruments(['pad']), fakeMixBus(channels))
    expect(instances.followers.length).toBe(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('skips configs with unknown target instrument', () => {
    const router = new SidechainRouter()
    const configs: SidechainConfig[] = [{ source: 'kick', target: 'ghost', amount: 0.5 }]
    router.prepareTargets(configs)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const channels = new Map([['kick', { connectTargets: [] as unknown[] }]])
    router.connectSources(configs, fakeInstruments(['kick']), fakeMixBus(channels))
    expect(instances.followers.length).toBe(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('multiple sources ducking the same target create multiple followers', () => {
    const router = new SidechainRouter()
    const configs: SidechainConfig[] = [
      { source: 'kick', target: 'pad', amount: 0.7 },
      { source: 'snare', target: 'pad', amount: 0.3 },
    ]
    router.prepareTargets(configs)
    const channels = new Map([
      ['kick', { connectTargets: [] as unknown[] }],
      ['snare', { connectTargets: [] as unknown[] }],
      ['pad', { connectTargets: [] as unknown[] }],
    ])
    router.connectSources(configs, fakeInstruments(['kick', 'snare', 'pad']), fakeMixBus(channels))
    // Two followers, two multipliers, but still one gain (shared target)
    expect(instances.followers.length).toBe(2)
    expect(instances.multipliers.length).toBe(2)
    expect(instances.gains.length).toBe(1)
    // Both multipliers connect to the same shared target gain
    expect(instances.multipliers[0].connectedTo[0]).toBe(instances.gains[0].gain)
    expect(instances.multipliers[1].connectedTo[0]).toBe(instances.gains[0].gain)
  })

  it('dispose cleans up all nodes', () => {
    const router = new SidechainRouter()
    const configs: SidechainConfig[] = [{ source: 'kick', target: 'pad', amount: 0.5 }]
    router.prepareTargets(configs)
    const channels = new Map([
      ['kick', { connectTargets: [] as unknown[] }],
      ['pad', { connectTargets: [] as unknown[] }],
    ])
    router.connectSources(configs, fakeInstruments(['kick', 'pad']), fakeMixBus(channels))
    router.dispose()
    expect(router.targetCount).toBe(0)
  })
})
