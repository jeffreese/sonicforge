import { describe, expect, it } from 'vitest'
import { chordTones, parseChordName, parseProgression, voicing } from './chords'

describe('parseChordName', () => {
  it('parses major triads (implicit quality)', () => {
    expect(parseChordName('C')).toEqual({ root: 'C', quality: '' })
    expect(parseChordName('F#')).toEqual({ root: 'F#', quality: '' })
  })

  it('parses minor triads', () => {
    expect(parseChordName('Am')).toEqual({ root: 'A', quality: 'm' })
    expect(parseChordName('Bbm')).toEqual({ root: 'Bb', quality: 'm' })
  })

  it('parses seventh chords', () => {
    expect(parseChordName('Cmaj7')).toEqual({ root: 'C', quality: 'maj7' })
    expect(parseChordName('G7')).toEqual({ root: 'G', quality: '7' })
    expect(parseChordName('Dm7')).toEqual({ root: 'D', quality: 'm7' })
  })

  it('rejects unknown roots and qualities', () => {
    expect(() => parseChordName('H')).toThrow()
    expect(() => parseChordName('Cx')).toThrow()
    expect(() => parseChordName('')).toThrow()
  })
})

describe('chordTones', () => {
  it('returns the three tones of a major triad', () => {
    expect(chordTones('C')).toEqual(['C', 'E', 'G'])
    expect(chordTones('F')).toEqual(['F', 'A', 'C'])
  })

  it('returns the three tones of a minor triad', () => {
    expect(chordTones('Am')).toEqual(['A', 'C', 'E'])
    expect(chordTones('Dm')).toEqual(['D', 'F', 'A'])
  })

  it('returns four tones for seventh chords', () => {
    expect(chordTones('Cmaj7')).toEqual(['C', 'E', 'G', 'B'])
    expect(chordTones('G7')).toEqual(['G', 'B', 'D', 'F'])
    expect(chordTones('Am7')).toEqual(['A', 'C', 'E', 'G'])
  })

  it('handles diminished and augmented', () => {
    expect(chordTones('Bdim')).toEqual(['B', 'D', 'F'])
    expect(chordTones('Caug')).toEqual(['C', 'E', 'G#'])
  })
})

describe('voicing', () => {
  it('builds a close voicing ascending from the target octave', () => {
    expect(voicing('C', { octave: 4 })).toEqual(['C4', 'E4', 'G4'])
    expect(voicing('Am', { octave: 3 })).toEqual(['A3', 'C4', 'E4'])
  })

  it('handles root wrap-around for chords with root late in the alphabet', () => {
    // F major: F is higher than C alphabetically in the semitone table, so
    // F4 → A4 → C5 (C wraps to next octave because A > C semitonally)
    expect(voicing('F', { octave: 4 })).toEqual(['F4', 'A4', 'C5'])
  })

  it('builds an open voicing with root an octave below the rest', () => {
    const open = voicing('C', { octave: 3, style: 'open' })
    expect(open[0]).toBe('C3')
    expect(open.slice(1)).toEqual(['E4', 'G4'])
  })

  it('builds a seventh chord voicing', () => {
    expect(voicing('Cmaj7', { octave: 4 })).toEqual(['C4', 'E4', 'G4', 'B4'])
  })
})

describe('parseProgression', () => {
  it('parses a single bar with one chord', () => {
    expect(parseProgression('Am')).toEqual([['Am']])
  })

  it('parses multiple bars separated by pipes', () => {
    expect(parseProgression('Am | F | C | G')).toEqual([['Am'], ['F'], ['C'], ['G']])
  })

  it('parses bars with multiple chords separated by dashes', () => {
    expect(parseProgression('Am | F-E | Dm-C | E-Am')).toEqual([
      ['Am'],
      ['F', 'E'],
      ['Dm', 'C'],
      ['E', 'Am'],
    ])
  })

  it('accepts en-dash as a chord separator', () => {
    expect(parseProgression('F–E')).toEqual([['F', 'E']])
  })

  it('tolerates extra whitespace', () => {
    expect(parseProgression('  Am  |   F - E  ')).toEqual([['Am'], ['F', 'E']])
  })

  it('ignores empty bars from trailing pipes', () => {
    expect(parseProgression('Am | F |')).toEqual([['Am'], ['F']])
  })
})
