import { describe, expect, it } from 'vitest'
import { offbeatPump, rootOctaveBounce, subSustain } from './bass'

describe('subSustain', () => {
  it('produces one whole-note root per single-chord bar', () => {
    const notes = subSustain({ progression: [['Am']], bars: 1 })
    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatchObject({ pitch: 'A1', time: '0:0:0', duration: '1n' })
  })

  it('produces two half notes per two-chord bar', () => {
    const notes = subSustain({ progression: [['F', 'E']], bars: 1 })
    expect(notes).toHaveLength(2)
    expect(notes[0]).toMatchObject({ pitch: 'F1', time: '0:0:0', duration: '2n' })
    expect(notes[1]).toMatchObject({ pitch: 'E1', time: '0:2:0', duration: '2n' })
  })

  it('loops progression for bar counts exceeding the progression length', () => {
    const notes = subSustain({ progression: [['Am'], ['F']], bars: 4 })
    const pitches = notes.map((n) => n.pitch)
    expect(pitches).toEqual(['A1', 'F1', 'A1', 'F1'])
  })

  it('respects custom octave', () => {
    const notes = subSustain({ progression: [['Am']], bars: 1, octave: 2 })
    expect(notes[0].pitch).toBe('A2')
  })

  it('respects custom velocity', () => {
    const notes = subSustain({ progression: [['Am']], bars: 1, velocity: 60 })
    expect(notes[0].velocity).toBe(60)
  })

  it('throws on empty progression', () => {
    expect(() => subSustain({ progression: [], bars: 1 })).toThrow()
  })

  it('returns empty for 0 bars', () => {
    expect(subSustain({ progression: [['Am']], bars: 0 })).toEqual([])
  })
})

describe('rootOctaveBounce', () => {
  it('places root on beats 1 and 3, octaves on offbeats, fifth on 4&', () => {
    const notes = rootOctaveBounce({ progression: [['Am']], bars: 1 })
    const bareNotes = notes.map((n) => ({ pitch: n.pitch, time: n.time }))
    expect(bareNotes).toEqual([
      { pitch: 'A2', time: '0:0:0' }, // root on 1
      { pitch: 'A3', time: '0:0:2' }, // oct 1&
      { pitch: 'A3', time: '0:1:2' }, // oct 2&
      { pitch: 'A2', time: '0:2:0' }, // root on 3
      { pitch: 'A3', time: '0:2:2' }, // oct 3&
      { pitch: 'E2', time: '0:3:2' }, // fifth 4& (E is the 5th of Am)
    ])
  })

  it('uses octave-up instead of fifth when fifthLeadIn is false', () => {
    const notes = rootOctaveBounce({ progression: [['C']], bars: 1, fifthLeadIn: false })
    const last = notes[notes.length - 1]
    expect(last.pitch).toBe('C3') // octave-up, not the fifth G
  })

  it('handles two-chord bars with compressed half-bar pattern', () => {
    const notes = rootOctaveBounce({ progression: [['F', 'E']], bars: 1 })
    const firstHalf = notes.filter((n) => n.time.startsWith('0:0') || n.time.startsWith('0:1'))
    const secondHalf = notes.filter((n) => n.time.startsWith('0:2') || n.time.startsWith('0:3'))
    expect(firstHalf.map((n) => n.pitch)).toEqual(['F2', 'F3', 'F3'])
    expect(secondHalf.map((n) => n.pitch)).toEqual(['E2', 'E3', 'E3'])
  })

  it('honors startBar offset', () => {
    const notes = rootOctaveBounce({ progression: [['Am']], bars: 1, startBar: 8 })
    expect(notes[0].time).toBe('8:0:0')
  })
})

describe('offbeatPump', () => {
  it('places a bass hit on every offbeat', () => {
    const notes = offbeatPump({ progression: [['Am']], bars: 1 })
    const times = notes.map((n) => n.time)
    expect(times).toEqual(['0:0:2', '0:1:2', '0:2:2', '0:3:2'])
  })

  it('uses chord roots across the bar for two-chord bars', () => {
    const notes = offbeatPump({ progression: [['F', 'E']], bars: 1 })
    const pitches = notes.map((n) => n.pitch)
    expect(pitches).toEqual(['F2', 'F2', 'E2', 'E2'])
  })

  it('returns empty for 0 bars', () => {
    expect(offbeatPump({ progression: [['Am']], bars: 0 })).toEqual([])
  })
})
