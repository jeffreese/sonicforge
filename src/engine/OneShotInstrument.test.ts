import { beforeEach, describe, expect, it, vi } from 'vitest'

const { instances } = vi.hoisted(() => ({
  instances: {
    players: [] as PlayerStubInstance[],
  },
}))

interface PlayerStubInstance {
  url: string
  volume: { value: number }
  started: boolean
  startTime: number | undefined
  disposed: boolean
  connectedTo: unknown[]
}

// Mock Tone.js. Tone.Player fires its onload synchronously (no real network
// I/O) so we can verify load() resolves and triggerAttackRelease routes to
// the right player by hit name. Tone.Gain is a no-op base class so
// OneShotInstrument can extend it.
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
  interface PlayerOptions {
    url: string
    autostart?: boolean
    onload?: () => void
    onerror?: (e: Error) => void
  }
  class PlayerStub {
    url: string
    volume = { value: 0 }
    started = false
    startTime: number | undefined = undefined
    disposed = false
    connectedTo: unknown[] = []
    constructor(opts: PlayerOptions) {
      this.url = opts.url
      instances.players.push(this as unknown as PlayerStubInstance)
      // Fire onload immediately to simulate a successful load. Tests that
      // want to check the error path override this behavior.
      queueMicrotask(() => opts.onload?.())
    }
    connect(to: unknown) {
      this.connectedTo.push(to)
    }
    start(time?: number) {
      this.started = true
      this.startTime = time
    }
    dispose() {
      this.disposed = true
    }
  }
  return { Gain: GainStub, Player: PlayerStub }
})

const { OneShotInstrument, velocityToDb } = await import('./OneShotInstrument')

beforeEach(() => {
  instances.players = []
})

describe('velocityToDb', () => {
  it('returns 0 dB at full velocity', () => {
    expect(velocityToDb(1)).toBe(0)
  })

  it('returns approximately -6 dB at half velocity', () => {
    expect(velocityToDb(0.5)).toBeCloseTo(-6.02, 1)
  })

  it('returns approximately -20 dB at 10% velocity', () => {
    expect(velocityToDb(0.1)).toBeCloseTo(-20, 1)
  })

  it('returns -Infinity at zero velocity', () => {
    expect(velocityToDb(0)).toBe(Number.NEGATIVE_INFINITY)
  })

  it('returns -Infinity at negative velocity (defensive)', () => {
    expect(velocityToDb(-0.5)).toBe(Number.NEGATIVE_INFINITY)
  })
})

describe('OneShotInstrument', () => {
  it('loads a player per hit name', async () => {
    const inst = new OneShotInstrument()
    await inst.load({
      kick: 'samples/oneshots/kicks/a.wav',
      snare: 'samples/oneshots/snares/b.wav',
      hat: 'samples/oneshots/hats/c.wav',
    })
    expect(inst.getHitNames().sort()).toEqual(['hat', 'kick', 'snare'])
    expect(instances.players.length).toBe(3)
  })

  it('passes each URL to Tone.Player', async () => {
    const inst = new OneShotInstrument()
    await inst.load({
      kick: 'samples/oneshots/kicks/subby.wav',
    })
    expect(instances.players[0].url).toBe('samples/oneshots/kicks/subby.wav')
  })

  it('connects each player to the instrument output (Gain)', async () => {
    const inst = new OneShotInstrument()
    await inst.load({ kick: 'a.wav' })
    expect(instances.players[0].connectedTo[0]).toBe(inst)
  })

  it('triggerAttackRelease starts the matching player', async () => {
    const inst = new OneShotInstrument()
    await inst.load({ kick: 'k.wav', snare: 's.wav' })
    inst.triggerAttackRelease('kick', '8n', 5)
    expect(instances.players[0].started).toBe(true)
    expect(instances.players[0].startTime).toBe(5)
    // snare not triggered
    expect(instances.players[1].started).toBe(false)
  })

  it('triggerAttackRelease is a no-op for unknown hit names (no throw)', async () => {
    const inst = new OneShotInstrument()
    await inst.load({ kick: 'k.wav' })
    expect(() => inst.triggerAttackRelease('ghost', '8n', 0, 1)).not.toThrow()
    expect(instances.players[0].started).toBe(false)
  })

  it('scales velocity to dB on trigger', async () => {
    const inst = new OneShotInstrument()
    await inst.load({ kick: 'k.wav' })
    inst.triggerAttackRelease('kick', '8n', 0, 0.5)
    expect(instances.players[0].volume.value).toBeCloseTo(-6.02, 1)
  })

  it('leaves volume untouched when velocity is undefined', async () => {
    const inst = new OneShotInstrument()
    await inst.load({ kick: 'k.wav' })
    // Default volume is 0 (from the stub). Triggering without velocity
    // should not change it.
    instances.players[0].volume.value = -3
    inst.triggerAttackRelease('kick', '8n', 0)
    expect(instances.players[0].volume.value).toBe(-3)
  })

  it('load with an empty map is a no-op', async () => {
    const inst = new OneShotInstrument()
    await inst.load({})
    expect(instances.players.length).toBe(0)
    expect(inst.getHitNames().length).toBe(0)
  })

  it('coerces numeric pitch to string for hit name lookup', async () => {
    const inst = new OneShotInstrument()
    await inst.load({ '1': 'one.wav' })
    inst.triggerAttackRelease(1, '8n', 0)
    expect(instances.players[0].started).toBe(true)
  })

  it('dispose cleans up all players', async () => {
    const inst = new OneShotInstrument()
    await inst.load({ kick: 'k.wav', snare: 's.wav' })
    inst.dispose()
    expect(instances.players[0].disposed).toBe(true)
    expect(instances.players[1].disposed).toBe(true)
    expect(inst.getHitNames().length).toBe(0)
  })
})
