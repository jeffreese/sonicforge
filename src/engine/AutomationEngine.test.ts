import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AutomationLane, Metadata } from '../schema/composition'

// Mock Tone.getTransport + Tone.now so AutomationEngine can schedule without
// a real AudioContext. All tests exercise the scheduling math, not audio.
const { transportSeconds, toneNow } = vi.hoisted(() => ({
  transportSeconds: { value: 0 },
  toneNow: { value: 100 },
}))

vi.mock('tone', () => ({
  getTransport: () => ({
    get seconds() {
      return transportSeconds.value
    },
  }),
  now: () => toneNow.value,
}))

const { AutomationEngine, interpolateAt } = await import('./AutomationEngine')
const { resolveTarget } = await import('./automation-targets')
void resolveTarget // import to ensure the module graph is hot — we mock via registry

interface ParamCall {
  method:
    | 'setValueAtTime'
    | 'linearRampToValueAtTime'
    | 'exponentialRampToValueAtTime'
    | 'cancelScheduledValues'
  value?: number
  time: number
}

function makeParam() {
  const calls: ParamCall[] = []
  const param = {
    value: 0,
    setValueAtTime(value: number, time: number) {
      calls.push({ method: 'setValueAtTime', value, time })
    },
    linearRampToValueAtTime(value: number, time: number) {
      calls.push({ method: 'linearRampToValueAtTime', value, time })
    },
    exponentialRampToValueAtTime(value: number, time: number) {
      calls.push({ method: 'exponentialRampToValueAtTime', value, time })
    },
    cancelScheduledValues(time: number) {
      calls.push({ method: 'cancelScheduledValues', time })
    },
  }
  return { param, calls }
}

const metadata: Metadata = {
  title: 'test',
  bpm: 120,
  timeSignature: [4, 4],
  key: 'C',
}

describe('AutomationEngine', () => {
  beforeEach(() => {
    transportSeconds.value = 0
    toneNow.value = 100
  })

  it('compiles lanes that resolve successfully', () => {
    const { param } = makeParam()
    const registry = makeRegistryWithLeadVolume(param)
    const engine = new AutomationEngine()
    engine.compile(makeSimpleLane(), metadata, registry)
    expect(engine.laneCount).toBe(1)
  })

  it('skips lanes with unresolvable target paths', () => {
    const { param } = makeParam()
    const registry = makeRegistryWithLeadVolume(param)
    const engine = new AutomationEngine()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    engine.compile(
      [{ target: 'nonexistent.volume', points: [{ time: '0:0:0', value: 0.5 }] }],
      metadata,
      registry,
    )
    expect(engine.laneCount).toBe(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('schedules points from a fresh start (transport at 0)', () => {
    const { param, calls } = makeParam()
    const engine = new AutomationEngine()
    engine.compile(makeSimpleLane(), metadata, makeRegistryWithLeadVolume(param))
    transportSeconds.value = 0
    toneNow.value = 100
    engine.scheduleFromCurrentPosition()

    // Expect: cancel, anchor (setValueAtTime with first point's value), then
    // linear ramps to later points.
    expect(calls[0].method).toBe('cancelScheduledValues')
    expect(calls[0].time).toBe(100)
    // Anchor at current position = first point's value
    expect(calls[1].method).toBe('setValueAtTime')
    expect(calls[1].value).toBe(0)
    // Second point is at seconds = 2 (bar 1 beat 0 @ 120bpm 4/4 = 2s)
    expect(calls[2].method).toBe('linearRampToValueAtTime')
    expect(calls[2].value).toBe(1)
    expect(calls[2].time).toBeCloseTo(100 + 2, 5)
  })

  it('skips points that are in the past when scheduling mid-lane', () => {
    const { param, calls } = makeParam()
    const engine = new AutomationEngine()
    engine.compile(makeSimpleLane(), metadata, makeRegistryWithLeadVolume(param))
    // Seek to 1 second in — the first point (at 0s) is in the past.
    transportSeconds.value = 1
    toneNow.value = 200
    engine.scheduleFromCurrentPosition()

    const scheduled = calls.filter(
      (c) =>
        c.method === 'linearRampToValueAtTime' ||
        c.method === 'exponentialRampToValueAtTime' ||
        c.method === 'setValueAtTime',
    )
    // Anchor at interpolated value + one future ramp (to the 2s point)
    expect(scheduled.length).toBe(2)
    expect(scheduled[0].method).toBe('setValueAtTime') // anchor
    expect(scheduled[1].method).toBe('linearRampToValueAtTime')
    expect(scheduled[1].time).toBeCloseTo(200 + (2 - 1), 5)
  })

  it('anchors the param to the interpolated value at seek position', () => {
    const { param, calls } = makeParam()
    const engine = new AutomationEngine()
    // Lane: 0.0 → 1.0 linear from 0s to 2s.
    engine.compile(makeSimpleLane(), metadata, makeRegistryWithLeadVolume(param))
    // Seek to 1 second — halfway through the ramp.
    transportSeconds.value = 1
    toneNow.value = 200
    engine.scheduleFromCurrentPosition()

    // Anchor value should be 0.5 (halfway between 0 and 1).
    const anchor = calls.find((c) => c.method === 'setValueAtTime')
    expect(anchor?.value).toBeCloseTo(0.5, 5)
  })

  it('uses step curve correctly', () => {
    const { param, calls } = makeParam()
    const engine = new AutomationEngine()
    const lane: AutomationLane[] = [
      {
        target: 'lead.volume',
        points: [
          { time: '0:0:0', value: 0 },
          { time: '1:0:0', value: 1, curve: 'step' },
        ],
      },
    ]
    engine.compile(lane, metadata, makeRegistryWithLeadVolume(param))
    transportSeconds.value = 0
    toneNow.value = 100
    engine.scheduleFromCurrentPosition()
    const stepCall = calls.find(
      (c) => c.method === 'setValueAtTime' && c.value === 1 && c.time !== 100,
    )
    expect(stepCall).toBeDefined()
  })

  it('clamps exponential ramp target to positive minimum', () => {
    const { param, calls } = makeParam()
    const engine = new AutomationEngine()
    const lane: AutomationLane[] = [
      {
        target: 'lead.volume',
        points: [
          { time: '0:0:0', value: 1 },
          { time: '1:0:0', value: 0, curve: 'exponential' },
        ],
      },
    ]
    engine.compile(lane, metadata, makeRegistryWithLeadVolume(param))
    transportSeconds.value = 0
    toneNow.value = 100
    engine.scheduleFromCurrentPosition()
    const exp = calls.find((c) => c.method === 'exponentialRampToValueAtTime')
    expect(exp).toBeDefined()
    expect(exp?.value).toBeCloseTo(1e-5, 10)
  })

  it('stop() cancels scheduled values on every lane', () => {
    const { param, calls } = makeParam()
    const engine = new AutomationEngine()
    engine.compile(makeSimpleLane(), metadata, makeRegistryWithLeadVolume(param))
    engine.stop()
    const cancels = calls.filter((c) => c.method === 'cancelScheduledValues')
    expect(cancels.length).toBe(1)
  })

  it('supports numeric point times (absolute beats)', () => {
    const { param, calls } = makeParam()
    const engine = new AutomationEngine()
    const lane: AutomationLane[] = [
      {
        target: 'lead.volume',
        points: [
          { time: 0, value: 0 },
          { time: 4, value: 1 }, // 4 beats = 1 bar @ 4/4 = 2 seconds @ 120bpm
        ],
      },
    ]
    engine.compile(lane, metadata, makeRegistryWithLeadVolume(param))
    transportSeconds.value = 0
    toneNow.value = 100
    engine.scheduleFromCurrentPosition()
    const ramp = calls.find((c) => c.method === 'linearRampToValueAtTime')
    expect(ramp?.time).toBeCloseTo(102, 5)
  })
})

describe('interpolateAt', () => {
  it('returns null for empty point arrays', () => {
    expect(interpolateAt([], 5)).toBeNull()
  })

  it('returns first value for positions before the first point', () => {
    const points = [
      { seconds: 2, value: 0.5, curve: 'linear' as const },
      { seconds: 4, value: 1, curve: 'linear' as const },
    ]
    expect(interpolateAt(points, 0)).toBe(0.5)
  })

  it('returns last value for positions after the last point', () => {
    const points = [
      { seconds: 2, value: 0.5, curve: 'linear' as const },
      { seconds: 4, value: 1, curve: 'linear' as const },
    ]
    expect(interpolateAt(points, 10)).toBe(1)
  })

  it('linearly interpolates between two points', () => {
    const points = [
      { seconds: 0, value: 0, curve: 'linear' as const },
      { seconds: 4, value: 1, curve: 'linear' as const },
    ]
    expect(interpolateAt(points, 2)).toBeCloseTo(0.5, 5)
    expect(interpolateAt(points, 1)).toBeCloseTo(0.25, 5)
  })

  it('holds the previous value for step curves', () => {
    const points = [
      { seconds: 0, value: 0, curve: 'linear' as const },
      { seconds: 4, value: 1, curve: 'step' as const },
    ]
    expect(interpolateAt(points, 2)).toBe(0)
  })
})

// ───── Test helpers ─────

function makeSimpleLane(): AutomationLane[] {
  return [
    {
      target: 'lead.volume',
      points: [
        { time: '0:0:0', value: 0 },
        { time: '1:0:0', value: 1 },
      ],
    },
  ]
}

function makeRegistryWithLeadVolume(param: ReturnType<typeof makeParam>['param']) {
  return {
    mixBus: {
      getChannel(id: string) {
        if (id === 'lead') return { volume: param, pan: makeParam().param }
        return undefined
      },
    },
    instrumentChains: new Map(),
    masterChain: null,
  } as unknown as Parameters<InstanceType<typeof AutomationEngine>['compile']>[2]
}
