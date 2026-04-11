/**
 * Per-composition feature extraction.
 *
 * Reads a composition JSON structure and produces an IndexEntry with both
 * Tier 1 direct reads (metadata, structural lists, flags) and Tier 2 derived
 * features (progression, drum pattern, dominant registers).
 *
 * This module is pure and synchronous — file I/O lives in `build.ts` and
 * `update.ts`. Pass in the parsed composition object and an mtime; get back
 * an entry ready to store in the index.
 *
 * Uses narrow local types rather than importing from `src/schema/composition.ts`.
 * The indexer only needs a subset of the composition shape, and the local-type
 * approach decouples the indexer from the full schema — future additions to
 * the schema do not affect the indexer unless they become Tier 1/2 features.
 */

import type { DrumPattern, IndexEntry, IndexInstrument } from './types.js'

// ─── Narrow local types ───
// Intentionally minimal — represents only the fields the indexer reads.

interface IndexableNote {
  pitch: string
  time: string
}

interface IndexableTrack {
  instrumentId: string
  notes: IndexableNote[]
}

interface IndexableSection {
  name: string
  bars: number
  tracks: IndexableTrack[]
}

interface IndexableInstrument {
  id: string
  name: string
  category: string
  source?: string
  sample?: string
  synth?: string | unknown
}

interface IndexableEffect {
  type: string
}

export interface IndexableComposition {
  metadata: {
    title: string
    bpm: number
    timeSignature: [number, number]
    key: string
    tags?: string[]
  }
  instruments: IndexableInstrument[]
  sections: IndexableSection[]
  masterEffects?: IndexableEffect[]
  sidechain?: unknown[]
  lfos?: unknown[]
  automation?: unknown[]
}

/**
 * Extract a full IndexEntry from a composition.
 *
 * @param composition - Parsed composition JSON (assumed schema-valid)
 * @param path - Repo-relative path for the entry's path field
 * @param modifiedAt - ISO timestamp of the file's last modification
 */
export function extract(
  composition: IndexableComposition,
  path: string,
  modifiedAt: string,
): IndexEntry {
  const tags = Array.isArray(composition.metadata.tags) ? [...composition.metadata.tags] : []
  const primaryTag = tags[0] ?? null
  return {
    path,
    title: composition.metadata.title,
    bpm: composition.metadata.bpm,
    key: composition.metadata.key,
    timeSignature: composition.metadata.timeSignature,
    tags,
    primaryTag,
    totalBars: sumBars(composition.sections),
    noteCount: countNotes(composition.sections),
    sections: composition.sections.map((s) => ({ name: s.name, bars: s.bars })),
    instruments: composition.instruments.map(toIndexInstrument),
    masterEffectTypes: (composition.masterEffects ?? []).map((e) => e.type),
    hasSidechain: (composition.sidechain ?? []).length > 0,
    hasLFOs: (composition.lfos ?? []).length > 0,
    hasAutomation: (composition.automation ?? []).length > 0,
    hasMasterEffects: (composition.masterEffects ?? []).length > 0,
    hasSynths: composition.instruments.some(isSynthInstrument),
    hasOneshots: composition.instruments.some(isOneshotInstrument),
    hasSampled: composition.instruments.some(isSampledInstrument),
    modifiedAt,
    progression: extractProgression(composition),
    drumPattern: classifyDrumPattern(composition),
    dominantRegisters: computeDominantRegisters(composition),
  }
}

// ─── Tier 1 helpers ───

function sumBars(sections: IndexableSection[]): number {
  return sections.reduce((sum, s) => sum + s.bars, 0)
}

function countNotes(sections: IndexableSection[]): number {
  return sections.reduce((sum, s) => sum + s.tracks.reduce((ts, t) => ts + t.notes.length, 0), 0)
}

function toIndexInstrument(inst: IndexableInstrument): IndexInstrument {
  let preset: string | null = null
  if (typeof inst.sample === 'string') {
    preset = inst.sample
  } else if (typeof inst.synth === 'string') {
    preset = inst.synth
  }
  return {
    id: inst.id,
    name: inst.name,
    category: inst.category,
    source: inst.source ?? (inst.category === 'drums' ? 'drums' : 'sampled'),
    preset,
  }
}

function isSynthInstrument(inst: IndexableInstrument): boolean {
  return inst.source === 'synth'
}

function isOneshotInstrument(inst: IndexableInstrument): boolean {
  return inst.source === 'oneshot'
}

function isSampledInstrument(inst: IndexableInstrument): boolean {
  // Default source for non-drums instruments is 'sampled' when unset
  return inst.source === 'sampled' || (inst.source === undefined && inst.category !== 'drums')
}

// ─── Tier 2: Progression extraction ───

/**
 * Simplified bass-root-per-bar progression. For each bar (global, across all
 * sections), collect the distinct pitch classes of notes in the bass track in
 * order of first appearance, and join with `-`. Bars are joined with ` | `.
 *
 * Returns null if there is no bass track, or if the bass track has no
 * scientific-pitch notes (e.g., oneshot-sourced bass).
 */
function extractProgression(composition: IndexableComposition): string | null {
  const bassInst = composition.instruments.find((i) => i.category === 'bass')
  if (!bassInst) return null

  // Walk sections, accumulate bass notes keyed by global bar
  const rootsByBar = new Map<number, string[]>()
  let sectionOffset = 0
  for (const section of composition.sections) {
    const bassTrack = section.tracks.find((t) => t.instrumentId === bassInst.id)
    if (bassTrack) {
      // Sort notes by within-bar time so the "first appearance" order is stable
      const sorted = [...bassTrack.notes].sort((a, b) => compareTime(a.time, b.time))
      for (const note of sorted) {
        const pitchClass = toPitchClass(note.pitch)
        if (pitchClass === null) continue
        const bar = parseBar(note.time)
        const globalBar = sectionOffset + bar
        const existing = rootsByBar.get(globalBar) ?? []
        // Dedupe consecutive repeats within a bar
        if (existing.length === 0 || existing[existing.length - 1] !== pitchClass) {
          existing.push(pitchClass)
          rootsByBar.set(globalBar, existing)
        }
      }
    }
    sectionOffset += section.bars
  }

  const totalBars = sectionOffset
  if (totalBars === 0 || rootsByBar.size === 0) return null

  const barStrings: string[] = []
  for (let bar = 0; bar < totalBars; bar++) {
    const roots = rootsByBar.get(bar)
    barStrings.push(roots ? roots.join('-') : '-')
  }
  return barStrings.join(' | ')
}

// ─── Tier 2: Drum pattern classification ───

/**
 * Classify the composition's drum pattern by looking at where kicks and
 * snares (or claps) land within a bar, aggregated across the whole track.
 *
 * A position is considered "part of the pattern" if it appears in at least
 * 50% of the bars that contain any drum hit — this filters out fill kicks
 * and one-off variations without requiring the pattern to be present in
 * every bar.
 */
function classifyDrumPattern(composition: IndexableComposition): DrumPattern {
  const drumInstIds = new Set(
    composition.instruments.filter((i) => i.category === 'drums').map((i) => i.id),
  )
  if (drumInstIds.size === 0) return 'none'

  const kicksByBar = new Map<number, Set<string>>() // globalBar → set of "beat:sixteenth"
  const snaresByBar = new Map<number, Set<string>>()

  let sectionOffset = 0
  for (const section of composition.sections) {
    for (const track of section.tracks) {
      if (!drumInstIds.has(track.instrumentId)) continue
      for (const note of track.notes) {
        const [bar, beat, six] = parseTimeParts(note.time)
        if (bar === null) continue
        const globalBar = sectionOffset + bar
        const pos = `${beat}:${six}`
        if (isKickHit(note.pitch)) {
          addToBucket(kicksByBar, globalBar, pos)
        } else if (isSnareHit(note.pitch)) {
          addToBucket(snaresByBar, globalBar, pos)
        }
      }
    }
    sectionOffset += section.bars
  }

  const drumBars = new Set<number>()
  for (const bar of kicksByBar.keys()) drumBars.add(bar)
  for (const bar of snaresByBar.keys()) drumBars.add(bar)
  if (drumBars.size === 0) return 'none'

  const threshold = Math.max(1, Math.ceil(drumBars.size * 0.5))
  const countPosition = (byBar: Map<number, Set<string>>, pos: string): number => {
    let count = 0
    for (const positions of byBar.values()) {
      if (positions.has(pos)) count++
    }
    return count
  }
  const kickOn = (pos: string) => countPosition(kicksByBar, pos) >= threshold
  const snareOn = (pos: string) => countPosition(snaresByBar, pos) >= threshold

  // 4-on-floor: kick on every beat
  if (kickOn('0:0') && kickOn('1:0') && kickOn('2:0') && kickOn('3:0')) {
    return '4-on-floor'
  }
  // Trap: kick on beat 1 and and-of-2 (or and-of-1), snare on beat 3
  if (kickOn('0:0') && (kickOn('0:2') || kickOn('1:2')) && snareOn('2:0') && !kickOn('1:0')) {
    return 'trap'
  }
  // Half-time: kick on beat 1 only, snare on beat 3 only
  if (kickOn('0:0') && snareOn('2:0') && !kickOn('1:0') && !kickOn('3:0')) {
    return 'half-time'
  }
  // Breakbeat: kick on beat 1 and and-of-3, snares on 2 and 4
  if (kickOn('0:0') && kickOn('2:2') && !kickOn('1:0')) {
    return 'breakbeat'
  }
  return 'other'
}

function isKickHit(pitch: string): boolean {
  return pitch === 'kick' || pitch.startsWith('kick-') || pitch.startsWith('kick_')
}

function isSnareHit(pitch: string): boolean {
  return (
    pitch === 'snare' ||
    pitch.startsWith('snare-') ||
    pitch.startsWith('snare_') ||
    pitch === 'clap' ||
    pitch.startsWith('clap-') ||
    pitch.startsWith('clap_')
  )
}

function addToBucket(map: Map<number, Set<string>>, key: number, value: string): void {
  const set = map.get(key) ?? new Set<string>()
  set.add(value)
  map.set(key, set)
}

// ─── Tier 2: Dominant register extraction ───

/**
 * Per melodic/bass track, compute the MIDI range that covers the middle 80%
 * of the track's notes. Returns a map keyed by instrument id.
 *
 * Tracks with no pitched notes (e.g., bass played via oneshot hits) are
 * omitted from the result rather than represented as null — absence is
 * meaningful and keeps the output compact.
 */
function computeDominantRegisters(composition: IndexableComposition): Record<string, string> {
  const result: Record<string, string> = {}
  const melodicCategories = new Set(['melodic', 'bass'])

  for (const inst of composition.instruments) {
    if (!melodicCategories.has(inst.category)) continue
    const midi = collectMidiNotes(composition.sections, inst.id)
    if (midi.length === 0) continue
    midi.sort((a, b) => a - b)
    // Trim 10% from each end so we keep the middle 80%
    const trim = Math.floor(midi.length * 0.1)
    const trimmed = midi.slice(trim, midi.length - trim)
    if (trimmed.length === 0) continue
    const low = trimmed[0]
    const high = trimmed[trimmed.length - 1]
    result[inst.id] = `${midiToPitch(low)}-${midiToPitch(high)}`
  }
  return result
}

function collectMidiNotes(sections: IndexableSection[], instrumentId: string): number[] {
  const out: number[] = []
  for (const section of sections) {
    for (const track of section.tracks) {
      if (track.instrumentId !== instrumentId) continue
      for (const note of track.notes) {
        const m = pitchToMidi(note.pitch)
        if (m !== null) out.push(m)
      }
    }
  }
  return out
}

// ─── Pitch / time utilities ───

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

const SEMITONE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/**
 * Convert a scientific-notation pitch (e.g. "C4", "F#3", "Bb-1") to MIDI
 * number. Returns null for anything that doesn't match — including one-shot
 * hit names like "kick" or "rumble".
 */
function pitchToMidi(pitch: string): number | null {
  const match = pitch.match(/^([A-G][#b]?)(-?\d+)$/)
  if (!match) return null
  const [, name, octave] = match
  const semitone = NOTE_SEMITONES[name]
  if (semitone === undefined) return null
  return (Number(octave) + 1) * 12 + semitone
}

function midiToPitch(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  const semitone = midi % 12
  return `${SEMITONE_NAMES[semitone]}${octave}`
}

/**
 * Reduce a scientific pitch to just its pitch class (strip the octave).
 * Used for progression extraction where octave differences shouldn't create
 * "new" chord changes. Returns null for non-pitched names.
 */
function toPitchClass(pitch: string): string | null {
  const match = pitch.match(/^([A-G][#b]?)(-?\d+)$/)
  return match ? match[1] : null
}

function parseBar(time: string): number {
  return Number(time.split(':')[0])
}

function parseTimeParts(time: string): [number | null, number, number] {
  const parts = time.split(':').map(Number)
  if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) {
    return [null, 0, 0]
  }
  return [parts[0], parts[1], parts[2]]
}

function compareTime(a: string, b: string): number {
  const [ba, beatA, sixA] = parseTimeParts(a)
  const [bb, beatB, sixB] = parseTimeParts(b)
  if (ba === null || bb === null) return 0
  if (ba !== bb) return ba - bb
  if (beatA !== beatB) return beatA - beatB
  return sixA - sixB
}
