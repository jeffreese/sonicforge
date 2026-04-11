import { describe, expect, it } from 'vitest'
import { breakbeat, fourOnFloor, halfTime, trap } from './drums'

describe('fourOnFloor', () => {
  it('produces 4 kicks per bar', () => {
    const notes = fourOnFloor({ bars: 2 })
    const kicks = notes.filter((n) => n.pitch === 'kick')
    expect(kicks).toHaveLength(8)
  })

  it('places kicks on beats 0, 1, 2, 3 of each bar', () => {
    const notes = fourOnFloor({ bars: 1 })
    const kickTimes = notes.filter((n) => n.pitch === 'kick').map((n) => n.time)
    expect(kickTimes).toEqual(['0:0:0', '0:1:0', '0:2:0', '0:3:0'])
  })

  it('places backbeat on beats 1 and 3 by default', () => {
    const notes = fourOnFloor({ bars: 1 })
    const clapTimes = notes.filter((n) => n.pitch === 'clap').map((n) => n.time)
    expect(clapTimes).toEqual(['0:1:0', '0:3:0'])
  })

  it('respects custom kick velocities', () => {
    const notes = fourOnFloor({ bars: 1, kickVelocities: [100, 80, 90, 70] })
    const velocities = notes.filter((n) => n.pitch === 'kick').map((n) => n.velocity)
    expect(velocities).toEqual([100, 80, 90, 70])
  })

  it('honors startBar offset', () => {
    const notes = fourOnFloor({ bars: 1, startBar: 4 })
    const kicks = notes.filter((n) => n.pitch === 'kick')
    expect(kicks[0].time).toBe('4:0:0')
    expect(kicks[3].time).toBe('4:3:0')
  })

  it('places open hat on beat 4& every 2 bars by default', () => {
    const notes = fourOnFloor({ bars: 4 })
    const openHats = notes.filter((n) => n.pitch === 'hat-open')
    // bars 1 and 3 (0-indexed) get the open hat
    expect(openHats.map((n) => n.time)).toEqual(['1:3:2', '3:3:2'])
  })

  it('skips open hats when openHatEvery is null', () => {
    const notes = fourOnFloor({ bars: 4, openHatEvery: null })
    const openHats = notes.filter((n) => n.pitch === 'hat-open')
    expect(openHats).toHaveLength(0)
  })

  it('produces dense 16th hats when hatSubdivision is 16n', () => {
    const notes = fourOnFloor({ bars: 1, hatSubdivision: '16n', openHatEvery: null })
    const closedHats = notes.filter((n) => n.pitch === 'hat')
    expect(closedHats).toHaveLength(16) // 4 beats × 4 sixteenths
  })

  it('accepts snare as backbeat hit', () => {
    const notes = fourOnFloor({ bars: 1, backbeatHit: 'snare' })
    expect(notes.some((n) => n.pitch === 'snare')).toBe(true)
    expect(notes.every((n) => n.pitch !== 'clap')).toBe(true)
  })

  it('returns empty array for 0 bars', () => {
    expect(fourOnFloor({ bars: 0 })).toEqual([])
  })
})

describe('halfTime', () => {
  it('places kick on beat 1 and snare on beat 3 only', () => {
    const notes = halfTime({ bars: 1 })
    const kicks = notes.filter((n) => n.pitch === 'kick')
    const snares = notes.filter((n) => n.pitch === 'snare')
    expect(kicks.map((n) => n.time)).toEqual(['0:0:0'])
    expect(snares.map((n) => n.time)).toEqual(['0:2:0'])
  })

  it('does NOT place a kick on beat 3 (that distinguishes it from 4-on-floor)', () => {
    const notes = halfTime({ bars: 2 })
    const kicks = notes.filter((n) => n.pitch === 'kick')
    expect(kicks).toHaveLength(2)
    expect(kicks.every((k) => k.time.endsWith(':0:0'))).toBe(true)
  })

  it('returns empty for 0 bars', () => {
    expect(halfTime({ bars: 0 })).toEqual([])
  })
})

describe('breakbeat', () => {
  it('places kicks on beat 1 and and-of-3', () => {
    const notes = breakbeat({ bars: 1 })
    const kicks = notes.filter((n) => n.pitch === 'kick')
    expect(kicks.map((n) => n.time)).toEqual(['0:0:0', '0:2:2'])
  })

  it('places snares on 2 and 4 with ghost notes by default', () => {
    const notes = breakbeat({ bars: 1 })
    const snares = notes.filter((n) => n.pitch === 'snare')
    const mainSnares = snares.filter((n) => n.articulation !== 'ghost')
    const ghostSnares = snares.filter((n) => n.articulation === 'ghost')
    expect(mainSnares.map((n) => n.time)).toEqual(['0:1:0', '0:3:0'])
    expect(ghostSnares).toHaveLength(2)
  })

  it('omits ghost notes when includeGhosts is false', () => {
    const notes = breakbeat({ bars: 1, includeGhosts: false })
    const ghosts = notes.filter((n) => n.articulation === 'ghost')
    expect(ghosts).toHaveLength(0)
  })
})

describe('trap', () => {
  it('places kicks on 1 and and-of-2, snare on 3', () => {
    const notes = trap({ bars: 1 })
    const kicks = notes.filter((n) => n.pitch === 'kick').map((n) => n.time)
    const snares = notes.filter((n) => n.pitch === 'snare').map((n) => n.time)
    expect(kicks).toEqual(['0:0:0', '0:1:2'])
    expect(snares).toEqual(['0:2:0'])
  })

  it('produces dense 16th hats', () => {
    const notes = trap({ bars: 1 })
    const hats = notes.filter((n) => n.pitch === 'hat')
    expect(hats).toHaveLength(16)
  })
})
