/**
 * Bass line primitives for common rhythmic patterns.
 *
 * These helpers produce Note[] arrays for bass tracks. They take a progression
 * (bar-by-bar chord array, produced by parseProgression) and emit bass notes
 * anchored to the chord roots.
 *
 * Register: bass pitches default to octave 2 for reese/synth bass roles. Sub
 * bass roots drop to octave 1. Callers can override the octave for either.
 */

import type { Note } from '../../src/schema/composition'
import { parseChordName } from './chords'

// ─── Shared ───

type Velocity = number

export interface BassPatternBase {
  /** Bar-by-bar chord array. Each entry is a list of chord names for that bar. */
  progression: string[][]
  /** Number of bars to fill. If the progression is shorter, it loops. */
  bars: number
  /** Starting bar offset. Defaults to 0. */
  startBar?: number
  /** Target octave for the bass root. Defaults to 2. */
  octave?: number
}

/** Get the root pitch name from a chord at a target octave. */
function rootPitch(chordName: string, octave: number): string {
  const { root } = parseChordName(chordName)
  return `${root}${octave}`
}

/** Get the chords for a given bar index, looping the progression if needed. */
function chordsForBar(progression: string[][], barIndex: number): string[] {
  if (progression.length === 0) {
    throw new Error('bass helper: progression is empty')
  }
  return progression[barIndex % progression.length]
}

// ─── Sub sustain ───

export interface SubSustainOptions extends BassPatternBase {
  /** Velocity for sub sustain notes. Default 95. */
  velocity?: Velocity
}

/**
 * Sub-bass sustain: long root notes held across each chord's duration. For
 * single-chord bars the root sustains as a whole note; for two-chord bars it
 * splits into two halves; for three or four chords per bar, even divisions.
 *
 * This is the deep-house / dubstep / ambient bass foundation — root-focused,
 * sustained, no rhythm of its own. Pair with kick-locked reese or offbeat
 * patterns for rhythmic interest on a separate bass track.
 */
export function subSustain(opts: SubSustainOptions): Note[] {
  const { progression, bars, startBar = 0, octave = 1, velocity = 95 } = opts
  if (bars <= 0) return []

  const notes: Note[] = []
  for (let i = 0; i < bars; i++) {
    const bar = startBar + i
    const chords = chordsForBar(progression, i)
    if (chords.length === 1) {
      notes.push({
        pitch: rootPitch(chords[0], octave),
        time: `${bar}:0:0`,
        duration: '1n',
        velocity,
      })
    } else if (chords.length === 2) {
      notes.push({
        pitch: rootPitch(chords[0], octave),
        time: `${bar}:0:0`,
        duration: '2n',
        velocity,
      })
      notes.push({
        pitch: rootPitch(chords[1], octave),
        time: `${bar}:2:0`,
        duration: '2n',
        velocity,
      })
    } else {
      // 3+ chords: divide evenly in beats
      const beatsPerChord = 4 / chords.length
      for (let c = 0; c < chords.length; c++) {
        const beatStart = Math.round(c * beatsPerChord)
        notes.push({
          pitch: rootPitch(chords[c], octave),
          time: `${bar}:${beatStart}:0`,
          duration: '4n',
          velocity,
        })
      }
    }
  }
  return notes
}

// ─── Root + octave bounce ───

export interface RootOctaveBounceOptions extends BassPatternBase {
  /** Root velocity on beat hits. Default 120. */
  rootVelocity?: Velocity
  /** Octave-up velocity on offbeat stabs. Default 95. */
  octaveVelocity?: Velocity
  /**
   * Whether to include a fifth passing tone on beat 4& as a lead-in to the
   * next chord. Default true — this is the classic bass-house hook.
   */
  fifthLeadIn?: boolean
}

/**
 * Root on beats, octave-up stabs on offbeats, optional fifth lead-in on beat 4&.
 * The bass-house reese hook pattern — aggressive, syncopated, drives the drop.
 *
 * For single-chord bars the pattern runs through the whole bar. For two-chord
 * bars, each chord gets a half-bar variant of the same shape.
 */
export function rootOctaveBounce(opts: RootOctaveBounceOptions): Note[] {
  const {
    progression,
    bars,
    startBar = 0,
    octave = 2,
    rootVelocity = 120,
    octaveVelocity = 95,
    fifthLeadIn = true,
  } = opts
  if (bars <= 0) return []

  const notes: Note[] = []
  for (let i = 0; i < bars; i++) {
    const bar = startBar + i
    const chords = chordsForBar(progression, i)

    if (chords.length === 1) {
      // Full bar on one chord
      const chord = chords[0]
      const root = rootPitch(chord, octave)
      const rootOct = rootPitch(chord, octave + 1)
      notes.push({ pitch: root, time: `${bar}:0:0`, duration: '8n', velocity: rootVelocity })
      notes.push({ pitch: rootOct, time: `${bar}:0:2`, duration: '16n', velocity: octaveVelocity })
      notes.push({
        pitch: rootOct,
        time: `${bar}:1:2`,
        duration: '16n',
        velocity: octaveVelocity - 5,
      })
      notes.push({
        pitch: root,
        time: `${bar}:2:0`,
        duration: '8n',
        velocity: rootVelocity - 4,
      })
      notes.push({
        pitch: rootOct,
        time: `${bar}:2:2`,
        duration: '16n',
        velocity: octaveVelocity - 2,
      })
      if (fifthLeadIn) {
        const { root: rootName } = parseChordName(chord)
        const fifthName = transpose(rootName, 7)
        notes.push({
          pitch: `${fifthName}${octave}`,
          time: `${bar}:3:2`,
          duration: '16n',
          velocity: octaveVelocity + 5,
        })
      } else {
        notes.push({
          pitch: rootOct,
          time: `${bar}:3:2`,
          duration: '16n',
          velocity: octaveVelocity,
        })
      }
    } else if (chords.length === 2) {
      // Half-bar per chord: compressed pattern
      for (let half = 0; half < 2; half++) {
        const chord = chords[half]
        const root = rootPitch(chord, octave)
        const rootOct = rootPitch(chord, octave + 1)
        const startBeat = half * 2
        notes.push({
          pitch: root,
          time: `${bar}:${startBeat}:0`,
          duration: '8n',
          velocity: rootVelocity - (half === 0 ? 0 : 2),
        })
        notes.push({
          pitch: rootOct,
          time: `${bar}:${startBeat}:2`,
          duration: '16n',
          velocity: octaveVelocity,
        })
        notes.push({
          pitch: rootOct,
          time: `${bar}:${startBeat + 1}:2`,
          duration: '16n',
          velocity: octaveVelocity - 5,
        })
      }
    } else {
      // 3+ chords: simple root stabs per chord
      const beatsPerChord = 4 / chords.length
      for (let c = 0; c < chords.length; c++) {
        const beat = Math.round(c * beatsPerChord)
        notes.push({
          pitch: rootPitch(chords[c], octave),
          time: `${bar}:${beat}:0`,
          duration: '4n',
          velocity: rootVelocity,
        })
      }
    }
  }
  return notes
}

// ─── Offbeat pump ───

export interface OffbeatPumpOptions extends BassPatternBase {
  /** Velocity for offbeat hits. Default 108. */
  velocity?: Velocity
}

/**
 * Root on every offbeat (1&, 2&, 3&, 4&). The trance "driving bass" pattern —
 * never lands on a downbeat, leaves the kick breathing room, and creates the
 * forward-lean motion trance is known for.
 */
export function offbeatPump(opts: OffbeatPumpOptions): Note[] {
  const { progression, bars, startBar = 0, octave = 2, velocity = 108 } = opts
  if (bars <= 0) return []

  const notes: Note[] = []
  for (let i = 0; i < bars; i++) {
    const bar = startBar + i
    const chords = chordsForBar(progression, i)
    // Determine which chord is active at each offbeat
    const beatsPerChord = 4 / chords.length
    for (let beat = 0; beat < 4; beat++) {
      const chordIndex = Math.min(chords.length - 1, Math.floor(beat / beatsPerChord))
      notes.push({
        pitch: rootPitch(chords[chordIndex], octave),
        time: `${bar}:${beat}:2`,
        duration: '8n',
        velocity: velocity - (beat % 2 === 0 ? 0 : 4),
      })
    }
  }
  return notes
}

// ─── Gated bass ───

export interface GateHit {
  /** Beat position within the bar, 0-3. */
  beat: number
  /** Sixteenth offset within the beat, 0-3. Default 0. */
  sixteenth?: number
  /** Note duration in Tone.js notation (e.g. `"2n"`, `"4n"`, `"8n"`, `"16n"`, `"4n."`). */
  duration: string
  /** Velocity. Default 100. */
  velocity?: Velocity
  /**
   * Octave offset from the base `octave` option. `0` plays at the root octave,
   * `1` plays an octave higher, `-1` an octave lower. Default 0.
   */
  octaveOffset?: number
}

export interface GatedBassOptions extends BassPatternBase {
  /**
   * Per-bar gate pattern — a list of hits, each describing when the note fires,
   * how long it sustains, its velocity, and its octave offset from the root.
   * The same pattern is applied to every bar, pitched to the root of whichever
   * chord the bar is on.
   */
  pattern: GateHit[]
}

/**
 * Sustained bass with a per-bar gate pattern. The defining feature of
 * dubstep wobble bass, neuro-funk chops, and drum-&-bass reese lines — the
 * note on/off rhythm is fixed per-bar while the root pitch follows the chord
 * progression.
 *
 * The pitches come from the chord roots; the rhythm comes from `pattern`. For
 * multi-chord bars, only the first chord is used (the helper doesn't split
 * gate patterns across mid-bar chord changes — that's a caller concern).
 *
 * Pair with an LFO on the synth's filter for the classic wobble sound — the
 * LFO creates the in-note expression while this helper creates the hit pattern.
 */
export function gatedBass(opts: GatedBassOptions): Note[] {
  const { progression, bars, startBar = 0, octave = 1, pattern } = opts
  if (bars <= 0) return []
  if (pattern.length === 0) {
    throw new Error('gatedBass: pattern must contain at least one hit')
  }

  const notes: Note[] = []
  for (let i = 0; i < bars; i++) {
    const bar = startBar + i
    const chords = chordsForBar(progression, i)
    // Gate patterns apply to a single root per bar; use the first chord.
    const chord = chords[0]
    const { root } = parseChordName(chord)
    for (const hit of pattern) {
      const hitOctave = octave + (hit.octaveOffset ?? 0)
      const sixteenth = hit.sixteenth ?? 0
      notes.push({
        pitch: `${root}${hitOctave}`,
        time: `${bar}:${hit.beat}:${sixteenth}`,
        duration: hit.duration,
        velocity: hit.velocity ?? 100,
      })
    }
  }
  return notes
}

// ─── Internal: chromatic transpose by semitones ───

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const SEMITONE_OF: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
}

function transpose(noteName: string, semitones: number): string {
  const current = SEMITONE_OF[noteName]
  if (current === undefined) {
    throw new Error(`transpose: unknown note "${noteName}"`)
  }
  return CHROMATIC[(current + semitones) % 12]
}
