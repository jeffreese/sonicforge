import { describe, expect, it } from 'vitest'
import { arpeggio, padSustain, stabOnBeats } from './harmony'

describe('padSustain', () => {
  it('emits a whole-note sustain per voicing tone in single-chord bars', () => {
    const notes = padSustain({ progression: [['Am']], bars: 1 })
    expect(notes).toHaveLength(3) // A, C, E
    expect(notes.every((n) => n.duration === '1n')).toBe(true)
    expect(notes.every((n) => n.time === '0:0:0')).toBe(true)
    expect(notes.map((n) => n.pitch)).toEqual(['A3', 'C4', 'E4'])
  })

  it('splits two-chord bars into half-bar sustains', () => {
    const notes = padSustain({ progression: [['F', 'E']], bars: 1 })
    expect(notes.filter((n) => n.time === '0:0:0')).toHaveLength(3) // F chord tones
    expect(notes.filter((n) => n.time === '0:2:0')).toHaveLength(3) // E chord tones
    expect(notes.every((n) => n.duration === '2n')).toBe(true)
  })

  it('respects custom octave', () => {
    const notes = padSustain({ progression: [['Am']], bars: 1, octave: 4 })
    expect(notes[0].pitch).toBe('A4')
  })

  it('loops progression for longer bar counts', () => {
    const notes = padSustain({ progression: [['Am'], ['F']], bars: 4 })
    // 2 bars of Am + 2 bars of F, each with 3 voicing tones = 12 notes
    expect(notes).toHaveLength(12)
  })

  it('returns empty for 0 bars', () => {
    expect(padSustain({ progression: [['Am']], bars: 0 })).toEqual([])
  })
})

describe('stabOnBeats', () => {
  it('stabs chord on beats 1 and 3 by default', () => {
    const notes = stabOnBeats({ progression: [['Am']], bars: 1 })
    const times = [...new Set(notes.map((n) => n.time))].sort()
    expect(times).toEqual(['0:0:0', '0:2:0'])
  })

  it('respects custom stab beats', () => {
    const notes = stabOnBeats({ progression: [['Am']], bars: 1, beats: [0, 1, 2, 3] })
    const uniqueTimes = [...new Set(notes.map((n) => n.time))].sort()
    expect(uniqueTimes).toHaveLength(4)
  })

  it('handles two-chord bars by stabbing each chord on beats 1 and 3', () => {
    const notes = stabOnBeats({ progression: [['F', 'E']], bars: 1 })
    const firstChordTones = notes.filter((n) => n.time === '0:0:0')
    const secondChordTones = notes.filter((n) => n.time === '0:2:0')
    expect(firstChordTones[0].pitch).toMatch(/^F/)
    expect(secondChordTones[0].pitch).toMatch(/^E/)
  })

  it('uses short default duration for rhythmic stabs', () => {
    const notes = stabOnBeats({ progression: [['Am']], bars: 1 })
    expect(notes.every((n) => n.duration === '16n')).toBe(true)
  })
})

describe('arpeggio', () => {
  it('cycles through chord tones in 16th notes by default', () => {
    const notes = arpeggio({ progression: [['Am']], bars: 1 })
    // 4 beats × 4 sixteenths = 16 notes per bar
    expect(notes).toHaveLength(16)
  })

  it('ascending direction starts with the lowest voicing tone', () => {
    const notes = arpeggio({ progression: [['C']], bars: 1, direction: 'up' })
    // C major voicing: C, E, G — cycle starts at C
    expect(notes[0].pitch).toBe('C4')
    expect(notes[1].pitch).toBe('E4')
    expect(notes[2].pitch).toBe('G4')
    expect(notes[3].pitch).toBe('C4') // cycles back
  })

  it('descending direction starts with the highest voicing tone', () => {
    const notes = arpeggio({ progression: [['C']], bars: 1, direction: 'down' })
    // Reversed: G, E, C
    expect(notes[0].pitch).toBe('G4')
    expect(notes[1].pitch).toBe('E4')
    expect(notes[2].pitch).toBe('C4')
  })

  it('up-down direction oscillates without repeating the peak', () => {
    const notes = arpeggio({ progression: [['C']], bars: 1, direction: 'up-down' })
    // Tones: C, E, G, then E (without re-hitting G or C)
    expect(notes[0].pitch).toBe('C4')
    expect(notes[1].pitch).toBe('E4')
    expect(notes[2].pitch).toBe('G4')
    expect(notes[3].pitch).toBe('E4')
    expect(notes[4].pitch).toBe('C4')
  })

  it('halves the note count for 8n subdivision', () => {
    const notes = arpeggio({ progression: [['Am']], bars: 1, subdivision: '8n' })
    expect(notes).toHaveLength(8)
  })

  it('splits two-chord bars between the chords', () => {
    const notes = arpeggio({ progression: [['C', 'G']], bars: 1 })
    const firstHalf = notes.filter((n) => n.time.startsWith('0:0') || n.time.startsWith('0:1'))
    const secondHalf = notes.filter((n) => n.time.startsWith('0:2') || n.time.startsWith('0:3'))
    expect(firstHalf[0].pitch).toBe('C4')
    expect(secondHalf[0].pitch).toBe('G4')
  })
})
