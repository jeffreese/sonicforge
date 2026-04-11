/**
 * Type definitions for the composition index.
 *
 * The index is a JSON file at `tools/composition-index/index.json` that stores
 * feature metadata for every composition in `compositions/*.json`. It never
 * contains the compositions themselves — only facts about them — and is
 * maintained automatically by a PostToolUse hook.
 *
 * See `docs/plans/composition-index/spec.md` for the design rationale and
 * feature extraction tiers.
 */

/**
 * Single instrument entry as it appears in an index entry. Derived from the
 * composition's `instruments[]` but flattened to just the fields the index
 * cares about.
 */
export interface IndexInstrument {
  id: string
  name: string
  category: string
  source: string
  /** Sample name, synth preset name, or null (oneshot/drums/inline synth) */
  preset: string | null
}

/**
 * Section summary — just name and bar count. The full track data is not
 * indexed; only the structural skeleton.
 */
export interface IndexSection {
  name: string
  bars: number
}

/**
 * Per-composition feature entry. This is everything the index knows about a
 * single composition. Tier 1 fields come directly from the composition JSON;
 * Tier 2 fields are derived by analyzing note data.
 */
export interface IndexEntry {
  /** Repo-relative path, e.g. "compositions/subterra.json" */
  path: string
  // ─── Tier 1: direct reads from composition JSON ───
  title: string
  bpm: number
  key: string
  timeSignature: [number, number]
  /**
   * Flat tag list from `metadata.tags`. First entry is the primary genre by
   * convention. Empty array when the composition has no tags field.
   */
  tags: string[]
  /**
   * Convenience alias for `tags[0]` — the primary genre. `null` when the
   * composition has no tags. Pre-computed so consumers don't have to handle
   * the empty-array edge case.
   */
  primaryTag: string | null
  totalBars: number
  noteCount: number
  sections: IndexSection[]
  instruments: IndexInstrument[]
  masterEffectTypes: string[]
  hasSidechain: boolean
  hasLFOs: boolean
  hasAutomation: boolean
  hasMasterEffects: boolean
  hasSynths: boolean
  hasOneshots: boolean
  hasSampled: boolean
  /** File mtime in ISO format */
  modifiedAt: string
  // ─── Tier 2: derived features ───
  /** Simplified bass-root-per-bar sequence, or null if no bass track */
  progression: string | null
  /**
   * Drum pattern classification: '4-on-floor', 'trap', 'half-time',
   * 'breakbeat', 'other', or 'none'
   */
  drumPattern: DrumPattern
  /**
   * Dominant MIDI note range per melodic/bass track where >80% of notes land.
   * Keyed by track instrument id. e.g. { "bass": "C2-E3", "lead": "C4-G5" }
   */
  dominantRegisters: Record<string, string>
}

export type DrumPattern = '4-on-floor' | 'trap' | 'half-time' | 'breakbeat' | 'other' | 'none'

/**
 * The complete index file shape. Keyed by composition path for fast lookup
 * during incremental updates.
 */
export interface CompositionIndex {
  version: '1.0'
  generatedAt: string
  entries: Record<string, IndexEntry>
}

/**
 * A single library "gap" — a dimension the library hasn't explored yet.
 * Returned as human-readable strings rather than structured data because the
 * consumer is a prompt, not code.
 */
export type Gap = string

/**
 * Aggregated library-level snapshot. This is what `/compose`, `/remix`, and
 * `/library-stats` consume — a digest of the full CompositionIndex that
 * highlights distributions and gaps without requiring skills to parse every
 * entry.
 */
export interface LibrarySnapshot {
  count: number
  keyDistribution: Record<string, number>
  bpmStats: {
    min: number
    max: number
    median: number
    iqr: [number, number]
  }
  timeSignatureDistribution: Record<string, number>
  /**
   * All tags counted across the library, sorted by frequency in the render
   * step. Captures both primary genres (from `tags[0]`) and modifiers.
   */
  tagDistribution: Record<string, number>
  /**
   * Primary-tag-only distribution — counts each composition's first tag.
   * Useful for "what genres are represented?" queries that ignore modifiers.
   */
  primaryTagDistribution: Record<string, number>
  drumPatternDistribution: Record<string, number>
  /** Top 10 instruments by frequency across the library */
  topInstruments: { id: string; count: number }[]
  edmFeatureUsage: {
    hasSidechain: number
    hasLFOs: number
    hasAutomation: number
    hasSynths: number
    hasOneshots: number
  }
  /** Human-readable gap descriptions for diversification cueing */
  gaps: Gap[]
}
