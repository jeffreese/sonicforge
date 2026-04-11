/**
 * Harmony primitives: pad sustains, chord stabs, and arpeggios.
 *
 * These helpers consume progressions (bar-by-bar chord arrays) and emit Note[]
 * arrays for pad, stab, or arpeggiator tracks. Voicings are built using the
 * `voicing()` helper from `chords.ts`, so callers can choose close/open/drop2
 * styles and target octave.
 */

import type { Note } from '../../src/schema/composition'
import { voicing } from './chords'

// ─── Shared ───

type Velocity = number

export interface HarmonyPatternBase {
  /** Bar-by-bar chord array. */
  progression: string[][]
  /** Number of bars to fill. */
  bars: number
  /** Starting bar offset. Defaults to 0. */
  startBar?: number
  /** Target octave for the chord voicings. Defaults to 3. */
  octave?: number
  /** Voicing style passed to `voicing()`. Defaults to 'close'. */
  voicingStyle?: 'close' | 'open' | 'drop2'
}

function chordsForBar(progression: string[][], barIndex: number): string[] {
  if (progression.length === 0) {
    throw new Error('harmony helper: progression is empty')
  }
  return progression[barIndex % progression.length]
}

// ─── Pad sustain ───

export interface PadSustainOptions extends HarmonyPatternBase {
  /** Velocity for pad notes. Default 55. */
  velocity?: Velocity
}

/**
 * Hold chord voicings as sustained pad notes across each chord's duration.
 * For single-chord bars: whole-bar sustain. For two-chord bars: half-bar each.
 * For three or more: equal divisions.
 */
export function padSustain(opts: PadSustainOptions): Note[] {
  const {
    progression,
    bars,
    startBar = 0,
    octave = 3,
    voicingStyle = 'close',
    velocity = 55,
  } = opts
  if (bars <= 0) return []

  const notes: Note[] = []
  for (let i = 0; i < bars; i++) {
    const bar = startBar + i
    const chords = chordsForBar(progression, i)
    if (chords.length === 1) {
      for (const pitch of voicing(chords[0], { octave, style: voicingStyle })) {
        notes.push({ pitch, time: `${bar}:0:0`, duration: '1n', velocity })
      }
    } else if (chords.length === 2) {
      for (const pitch of voicing(chords[0], { octave, style: voicingStyle })) {
        notes.push({ pitch, time: `${bar}:0:0`, duration: '2n', velocity })
      }
      for (const pitch of voicing(chords[1], { octave, style: voicingStyle })) {
        notes.push({
          pitch,
          time: `${bar}:2:0`,
          duration: '2n',
          velocity: Math.max(velocity - 3, 0),
        })
      }
    } else {
      const beatsPerChord = 4 / chords.length
      for (let c = 0; c < chords.length; c++) {
        const beat = Math.round(c * beatsPerChord)
        for (const pitch of voicing(chords[c], { octave, style: voicingStyle })) {
          notes.push({ pitch, time: `${bar}:${beat}:0`, duration: '4n', velocity })
        }
      }
    }
  }
  return notes
}

// ─── Stab on beats ───

export interface StabOnBeatsOptions extends HarmonyPatternBase {
  /**
   * Zero-indexed beats within a single-chord bar where the stab fires.
   * For two-chord bars, the first chord stabs at beat 0 and the second at beat 2
   * regardless of this option. Default [0, 2] (beats 1 and 3).
   */
  beats?: number[]
  /** Velocity for stab hits. Default 98. */
  velocity?: Velocity
  /** Stab duration. Default '16n' (short and rhythmic). */
  duration?: string
}

/**
 * Rhythmic chord stabs on specified beats. The house / tech-house / bass-house
 * signature: short chord hits that get sidechained against the kick for the
 * characteristic pump.
 */
export function stabOnBeats(opts: StabOnBeatsOptions): Note[] {
  const {
    progression,
    bars,
    startBar = 0,
    octave = 3,
    voicingStyle = 'close',
    beats = [0, 2],
    velocity = 98,
    duration = '16n',
  } = opts
  if (bars <= 0) return []

  const notes: Note[] = []
  for (let i = 0; i < bars; i++) {
    const bar = startBar + i
    const chords = chordsForBar(progression, i)
    if (chords.length === 1) {
      const v = voicing(chords[0], { octave, style: voicingStyle })
      for (const beat of beats) {
        for (const pitch of v) {
          notes.push({ pitch, time: `${bar}:${beat}:0`, duration, velocity })
        }
      }
    } else if (chords.length === 2) {
      for (const pitch of voicing(chords[0], { octave, style: voicingStyle })) {
        notes.push({ pitch, time: `${bar}:0:0`, duration, velocity })
      }
      for (const pitch of voicing(chords[1], { octave, style: voicingStyle })) {
        notes.push({
          pitch,
          time: `${bar}:2:0`,
          duration,
          velocity: Math.max(velocity - 4, 0),
        })
      }
    } else {
      const beatsPerChord = 4 / chords.length
      for (let c = 0; c < chords.length; c++) {
        const beat = Math.round(c * beatsPerChord)
        for (const pitch of voicing(chords[c], { octave, style: voicingStyle })) {
          notes.push({ pitch, time: `${bar}:${beat}:0`, duration, velocity })
        }
      }
    }
  }
  return notes
}

// ─── Arpeggio ───

export interface ArpeggioOptions extends HarmonyPatternBase {
  /** Direction to cycle through chord tones. Default 'up'. */
  direction?: 'up' | 'down' | 'up-down'
  /** Rhythmic subdivision. Default '16n'. */
  subdivision?: '8n' | '16n'
  /** Velocity for arpeggio notes. Default 78. */
  velocity?: Velocity
}

/**
 * Rotate chord tones through a subdivision across each chord's duration.
 * Direction 'up' cycles low-to-high repeatedly; 'down' the reverse; 'up-down'
 * oscillates and is the trance-arpeggio signature.
 *
 * For two-chord bars, the arpeggio runs through the first chord's voicing for
 * the first half and the second chord's for the second half.
 */
export function arpeggio(opts: ArpeggioOptions): Note[] {
  const {
    progression,
    bars,
    startBar = 0,
    octave = 4,
    voicingStyle = 'close',
    direction = 'up',
    subdivision = '16n',
    velocity = 78,
  } = opts
  if (bars <= 0) return []

  const stepsPerBeat = subdivision === '16n' ? 4 : 2
  const totalStepsPerBar = stepsPerBeat * 4
  const notes: Note[] = []

  for (let i = 0; i < bars; i++) {
    const bar = startBar + i
    const chords = chordsForBar(progression, i)
    const stepsPerChord = totalStepsPerBar / chords.length
    for (let c = 0; c < chords.length; c++) {
      const chord = chords[c]
      const tones = orderTones(voicing(chord, { octave, style: voicingStyle }), direction)
      for (let s = 0; s < stepsPerChord; s++) {
        const globalStep = c * stepsPerChord + s
        const beat = Math.floor(globalStep / stepsPerBeat)
        const sub = (globalStep % stepsPerBeat) * (subdivision === '16n' ? 1 : 2)
        const pitch = tones[s % tones.length]
        notes.push({
          pitch,
          time: `${bar}:${beat}:${sub}`,
          duration: subdivision,
          velocity: velocity - (s % 2 === 0 ? 0 : 6),
        })
      }
    }
  }
  return notes
}

function orderTones(pitches: string[], direction: 'up' | 'down' | 'up-down'): string[] {
  if (direction === 'up') return pitches
  if (direction === 'down') return [...pitches].reverse()
  // up-down: ascending, then descending without repeating the top or bottom
  if (pitches.length <= 2) return pitches
  return [...pitches, ...pitches.slice(1, -1).reverse()]
}
