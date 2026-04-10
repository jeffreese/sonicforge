import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LFOConfig, ModulationRoute } from '../schema/composition'

const { instances } = vi.hoisted(() => ({
  instances: {
    lfos: [] as LFOStubInstance[],
    multipliers: [] as MultiplyStubInstance[],
  },
}))

interface LFOStubInstance {
  opts: unknown
  started: boolean
  stopped: boolean
  disposed: boolean
  connectedTo: unknown[]
}
interface MultiplyStubInstance {
  factor: number
  connectedTo: unknown[]
}

vi.mock('tone', () => {
  class LFOStub {
    opts: unknown
    started = false
    stopped = false
    disposed = false
    connectedTo: unknown[] = []
    constructor(opts: unknown) {
      this.opts = opts
      instances.lfos.push(this as unknown as LFOStubInstance)
    }
    start() {
      this.started = true
    }
    stop() {
      this.stopped = true
    }
    connect(to: unknown) {
      this.connectedTo.push(to)
    }
    dispose() {
      this.disposed = true
    }
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
  return { LFO: LFOStub, Multiply: MultiplyStub }
})

const { ModulationEngine } = await import('./ModulationEngine')

function fakeParam() {
  return {
    value: 0,
    setValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
    cancelScheduledValues: () => {},
  }
}

function makeRegistryWithFilterFrequency(param: ReturnType<typeof fakeParam>) {
  const synthNode = { filter: { frequency: param } }
  return {
    mixBus: { getChannel: () => undefined },
    instrumentChains: new Map(),
    masterChain: null,
    getInstrumentSynthNode: (id: string) => (id === 'bass' ? synthNode : null),
  } as unknown as Parameters<InstanceType<typeof ModulationEngine>['compile']>[2]
}

beforeEach(() => {
  instances.lfos = []
  instances.multipliers = []
})

describe('ModulationEngine.compile', () => {
  it('creates an LFO per unique config id', () => {
    const engine = new ModulationEngine()
    const configs: LFOConfig[] = [
      { id: 'wobble', frequency: '4n', type: 'sine', min: 100, max: 2000 },
      { id: 'tremolo', frequency: 6, type: 'triangle', min: 0, max: 1 },
    ]
    engine.compile(configs, undefined, makeRegistryWithFilterFrequency(fakeParam()))
    expect(engine.lfoCount).toBe(2)
    expect(instances.lfos.length).toBe(2)
    const opts0 = instances.lfos[0].opts as Record<string, unknown>
    expect(opts0.frequency).toBe('4n')
    expect(opts0.min).toBe(100)
    expect(opts0.max).toBe(2000)
    expect(opts0.type).toBe('sine')
  })

  it('warns and skips duplicate LFO ids', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const engine = new ModulationEngine()
    const configs: LFOConfig[] = [
      { id: 'wobble', frequency: 4, min: 0, max: 1 },
      { id: 'wobble', frequency: 2, min: 0, max: 1 },
    ]
    engine.compile(configs, undefined, makeRegistryWithFilterFrequency(fakeParam()))
    expect(engine.lfoCount).toBe(1)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('connects LFO directly to target when amount is undefined (default 1)', () => {
    const engine = new ModulationEngine()
    const param = fakeParam()
    const configs: LFOConfig[] = [{ id: 'wobble', frequency: 4, min: 100, max: 2000 }]
    const routes: ModulationRoute[] = [{ source: 'wobble', target: 'bass.filter.frequency' }]
    engine.compile(configs, routes, makeRegistryWithFilterFrequency(param))
    // LFO should be connected directly to the param (no multiplier)
    expect(instances.multipliers.length).toBe(0)
    expect(instances.lfos[0].connectedTo[0]).toBe(param)
  })

  it('inserts a Multiply scaler when amount < 1', () => {
    const engine = new ModulationEngine()
    const param = fakeParam()
    const configs: LFOConfig[] = [{ id: 'wobble', frequency: 4, min: 100, max: 2000 }]
    const routes: ModulationRoute[] = [
      { source: 'wobble', target: 'bass.filter.frequency', amount: 0.5 },
    ]
    engine.compile(configs, routes, makeRegistryWithFilterFrequency(param))
    expect(instances.multipliers.length).toBe(1)
    expect(instances.multipliers[0].factor).toBe(0.5)
    // LFO → multiplier → param
    expect(instances.lfos[0].connectedTo[0]).toBe(instances.multipliers[0])
    expect(instances.multipliers[0].connectedTo[0]).toBe(param)
  })

  it('skips routes whose source LFO does not exist', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const engine = new ModulationEngine()
    const routes: ModulationRoute[] = [{ source: 'nonexistent', target: 'bass.filter.frequency' }]
    engine.compile(undefined, routes, makeRegistryWithFilterFrequency(fakeParam()))
    expect(instances.multipliers.length).toBe(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('skips routes whose target path does not resolve', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const engine = new ModulationEngine()
    const configs: LFOConfig[] = [{ id: 'wobble', frequency: 4, min: 0, max: 1 }]
    const routes: ModulationRoute[] = [{ source: 'wobble', target: 'ghost.filter.frequency' }]
    engine.compile(configs, routes, makeRegistryWithFilterFrequency(fakeParam()))
    // LFO still created, but the route wasn't wired
    expect(instances.lfos.length).toBe(1)
    expect(instances.lfos[0].connectedTo.length).toBe(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('handles undefined lfos and routes as no-ops', () => {
    const engine = new ModulationEngine()
    engine.compile(undefined, undefined, makeRegistryWithFilterFrequency(fakeParam()))
    expect(engine.lfoCount).toBe(0)
  })
})

describe('ModulationEngine lifecycle', () => {
  it('start() starts every LFO', () => {
    const engine = new ModulationEngine()
    const configs: LFOConfig[] = [
      { id: 'a', frequency: 2, min: 0, max: 1 },
      { id: 'b', frequency: 4, min: 0, max: 1 },
    ]
    engine.compile(configs, undefined, makeRegistryWithFilterFrequency(fakeParam()))
    engine.start()
    expect(instances.lfos.every((l) => l.started)).toBe(true)
  })

  it('stop() stops every LFO', () => {
    const engine = new ModulationEngine()
    const configs: LFOConfig[] = [{ id: 'a', frequency: 2, min: 0, max: 1 }]
    engine.compile(configs, undefined, makeRegistryWithFilterFrequency(fakeParam()))
    engine.start()
    engine.stop()
    expect(instances.lfos[0].stopped).toBe(true)
  })

  it('dispose() clears state', () => {
    const engine = new ModulationEngine()
    const configs: LFOConfig[] = [{ id: 'a', frequency: 2, min: 0, max: 1 }]
    engine.compile(configs, undefined, makeRegistryWithFilterFrequency(fakeParam()))
    engine.dispose()
    expect(engine.lfoCount).toBe(0)
  })
})
