/**
 * Chord tone lookup, voicings, and progression parsing.
 *
 * Chord names use common triad/seventh shorthand: "Am", "F", "Cmaj7", "G7", etc.
 * Tone names use scientific pitch notation ("A4", "F#3", "Bb2") — the same format
 * the SonicForge engine expects in Note.pitch.
 *
 * Helpers here produce bare pitch strings without octaves, or pitches at a target
 * octave. Register decisions (bass vs pad vs melody) stay with the caller — these
 * primitives don't know whether you're building a bass line or a pad voicing.
 */

/** Interval semitones above the root for a given chord quality. */
const QUALITY_INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7], // major triad (no quality suffix)
  maj: [0, 4, 7],
  m: [0, 3, 7], // minor triad
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  min7: [0, 3, 7, 10],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
}

/** Semitones above C for each note in chromatic order. */
const NOTE_SEMITONES: Record<string, number> = {
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

/** Semitone offset (0-11) → preferred note name. Sharps used by default. */
const SEMITONE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export interface ParsedChord {
  root: string // e.g. "A", "F#", "Bb"
  quality: string // e.g. "", "m", "maj7", "m7"
}

/**
 * Parse a chord name like "Am", "F", "Cmaj7", "G#m7" into its root and quality.
 * Accented forms: the root is 1-2 characters (letter + optional #/b), everything
 * else is the quality.
 */
export function parseChordName(name: string): ParsedChord {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('parseChordName: empty chord name')
  }
  // Root is letter + optional accidental
  const rootMatch = trimmed.match(/^([A-G][#b]?)(.*)$/)
  if (!rootMatch) {
    throw new Error(`parseChordName: invalid chord name "${name}"`)
  }
  const [, root, quality] = rootMatch
  if (!(root in NOTE_SEMITONES)) {
    throw new Error(`parseChordName: unknown root "${root}" in "${name}"`)
  }
  if (!(quality in QUALITY_INTERVALS)) {
    throw new Error(`parseChordName: unsupported quality "${quality}" in "${name}"`)
  }
  return { root, quality }
}

/**
 * Get the chord tones (as pitch names without octave) for a chord name.
 * Example: chordTones("Am") → ["A", "C", "E"]; chordTones("Cmaj7") → ["C", "E", "G", "B"].
 */
export function chordTones(name: string): string[] {
  const { root, quality } = parseChordName(name)
  const rootSemitone = NOTE_SEMITONES[root]
  const intervals = QUALITY_INTERVALS[quality]
  return intervals.map((interval) => SEMITONE_NAMES[(rootSemitone + interval) % 12])
}

export interface VoicingOptions {
  /** Target octave for the lowest note in the voicing. */
  octave: number
  /** How to arrange the chord tones above the lowest note. */
  style?: 'close' | 'open' | 'drop2'
}

/**
 * Build a chord voicing as scientific-pitch strings at a target octave.
 *
 * - **close** (default): all tones within one octave, stacked directly (root, third, fifth)
 * - **open**: root in the target octave, then 3rd/5th/7th in the octave above (more spread)
 * - **drop2**: the second-highest voice moves down an octave (jazz voicing)
 */
export function voicing(chordName: string, opts: VoicingOptions): string[] {
  const tones = chordTones(chordName)
  const { octave, style = 'close' } = opts

  // Close voicing: stack tones in ascending order from the octave
  const closeVoicing: string[] = []
  let prevSemitone = -1
  let currentOctave = octave
  for (const tone of tones) {
    const toneSemitone = NOTE_SEMITONES[tone]
    if (toneSemitone <= prevSemitone) {
      currentOctave += 1
    }
    closeVoicing.push(`${tone}${currentOctave}`)
    prevSemitone = toneSemitone
  }

  if (style === 'close') return closeVoicing

  if (style === 'open') {
    // Root stays, rest of the voicing moves up one octave
    const [rootPitch, ...rest] = closeVoicing
    const openRest = rest.map((p) => {
      const m = p.match(/^([A-G][#b]?)(\d+)$/)
      if (!m) return p
      return `${m[1]}${Number(m[2]) + 1}`
    })
    return [rootPitch, ...openRest]
  }

  // drop2: drop the second-highest voice down an octave, re-sort ascending
  if (closeVoicing.length < 3) return closeVoicing
  const dropIndex = closeVoicing.length - 2
  const dropped = closeVoicing[dropIndex].replace(/(\d+)$/, (_, d) => String(Number(d) - 1))
  const withoutDropped = [...closeVoicing.slice(0, dropIndex), ...closeVoicing.slice(dropIndex + 1)]
  return [dropped, ...withoutDropped].sort(comparePitches)
}

/** Compare two scientific-pitch strings by frequency (ascending). */
function comparePitches(a: string, b: string): number {
  const ma = a.match(/^([A-G][#b]?)(-?\d+)$/)
  const mb = b.match(/^([A-G][#b]?)(-?\d+)$/)
  if (!ma || !mb) return a.localeCompare(b)
  const octA = Number(ma[2])
  const octB = Number(mb[2])
  if (octA !== octB) return octA - octB
  return NOTE_SEMITONES[ma[1]] - NOTE_SEMITONES[mb[1]]
}

/**
 * Parse a progression string like "Am | F-E | Dm-C | E-Am" into a bar-by-bar
 * chord array. Each bar is an array of chord names (1 chord = whole bar,
 * 2 chords = half bar each, etc.).
 *
 * - Bars are separated by `|`
 * - Chords within a bar are separated by `-` (en-dash `–` also accepted)
 * - Whitespace is ignored
 */
export function parseProgression(str: string): string[][] {
  return str
    .split('|')
    .map((bar) => bar.trim())
    .filter((bar) => bar.length > 0)
    .map((bar) =>
      bar
        .split(/[-–]/)
        .map((chord) => chord.trim())
        .filter((chord) => chord.length > 0),
    )
}
