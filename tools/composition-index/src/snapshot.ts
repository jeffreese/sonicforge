/**
 * Library-level snapshot aggregation and gap analysis.
 *
 * Consumes a `CompositionIndex` and produces a `LibrarySnapshot` summarizing
 * key/BPM/genre/drum distributions, top instruments, EDM feature usage, and
 * a `gaps[]` list of dimensions the library has not yet explored.
 *
 * The snapshot is the main signal `/compose` and `/remix` consume during
 * their startup. The `gaps` list uses **positive framing** exclusively — it
 * describes what's missing from the library rather than what to avoid — to
 * counter transformer attention's tendency to activate negated tokens.
 */

import type { CompositionIndex, Gap, IndexEntry, LibrarySnapshot } from './types.js'

// ─── Dimensions worth exploring ───
// Hardcoded, opinionated, extensible. Gap detection compares the library's
// actual distribution against these dimensions and names what's missing.

const BPM_BRACKETS = [
  { label: 'under 80 BPM', min: 0, max: 79 },
  { label: '80–110 BPM', min: 80, max: 110 },
  { label: '110–140 BPM', min: 110, max: 140 },
  { label: 'over 140 BPM', min: 141, max: Number.POSITIVE_INFINITY },
]

const LENGTH_BRACKETS = [
  { label: 'under 16 bars', min: 0, max: 15 },
  { label: 'over 96 bars', min: 97, max: Number.POSITIVE_INFINITY },
]

const DRUM_PATTERNS_TO_CHECK = ['4-on-floor', 'trap', 'half-time', 'breakbeat'] as const

// ─── Snapshot ───

export function snapshot(index: CompositionIndex): LibrarySnapshot {
  const entries = Object.values(index.entries)
  const count = entries.length

  const keyDistribution = distribution(entries, (e) => normalizeKey(e.key))
  const timeSignatureDistribution = distribution(entries, (e) => formatTimeSig(e.timeSignature))
  const genreDistribution = distribution(
    entries.filter((e) => e.genre !== null),
    (e) => e.genre as string,
  )
  const drumPatternDistribution = distribution(entries, (e) => e.drumPattern)

  const bpmStats = computeBpmStats(entries)
  const topInstruments = computeTopInstruments(entries)
  const edmFeatureUsage = {
    hasSidechain: entries.filter((e) => e.hasSidechain).length,
    hasLFOs: entries.filter((e) => e.hasLFOs).length,
    hasAutomation: entries.filter((e) => e.hasAutomation).length,
    hasSynths: entries.filter((e) => e.hasSynths).length,
    hasOneshots: entries.filter((e) => e.hasOneshots).length,
  }

  const gaps = computeGaps(entries)

  return {
    count,
    keyDistribution,
    bpmStats,
    timeSignatureDistribution,
    genreDistribution,
    drumPatternDistribution,
    topInstruments,
    edmFeatureUsage,
    gaps,
  }
}

// ─── Gap analysis ───

export function computeGaps(entries: IndexEntry[]): Gap[] {
  const gaps: Gap[] = []

  if (entries.length === 0) {
    gaps.push('Library is empty — every dimension is unexplored')
    return gaps
  }

  // ─── Key: major vs minor ───
  const hasMajor = entries.some((e) => isMajorKey(e.key))
  const hasMinor = entries.some((e) => !isMajorKey(e.key))
  if (!hasMajor) gaps.push('No compositions in major keys')
  if (!hasMinor) gaps.push('No compositions in minor keys')

  // ─── BPM brackets ───
  for (const bracket of BPM_BRACKETS) {
    const inBracket = entries.some((e) => e.bpm >= bracket.min && e.bpm <= bracket.max)
    if (!inBracket) {
      gaps.push(`No compositions ${bracket.label}`)
    }
  }

  // ─── Time signature ───
  const hasNon44 = entries.some((e) => formatTimeSig(e.timeSignature) !== '4/4')
  if (!hasNon44) {
    gaps.push('No compositions in time signatures other than 4/4')
  }

  // ─── Drum patterns ───
  const presentPatterns = new Set(entries.map((e) => e.drumPattern))
  const missingDrumPatterns = DRUM_PATTERNS_TO_CHECK.filter((p) => !presentPatterns.has(p))
  if (missingDrumPatterns.length > 0) {
    gaps.push(`No compositions with ${missingDrumPatterns.join(' or ')} drums`)
  }
  if (!presentPatterns.has('none') && entries.length >= 3) {
    gaps.push('No compositions without drums')
  }

  // ─── Instrumentation ───
  const allHaveSynths = entries.every((e) => e.hasSynths)
  if (allHaveSynths && entries.length >= 3) {
    gaps.push('No compositions without synths — all current tracks use at least one')
  }
  const allHaveSampled = entries.every((e) => e.hasSampled)
  if (allHaveSampled && entries.length >= 3) {
    gaps.push('No compositions without sampled instruments')
  }

  // ─── Length ───
  for (const bracket of LENGTH_BRACKETS) {
    const inBracket = entries.some((e) => e.totalBars >= bracket.min && e.totalBars <= bracket.max)
    if (!inBracket) {
      gaps.push(`No compositions ${bracket.label}`)
    }
  }

  return gaps
}

// ─── Human-readable report rendering ───

/**
 * Render a snapshot as a human-readable plain-text report. Used by the
 * `/library-stats` skill and anywhere else a CLI-friendly summary is useful.
 */
export function renderSnapshot(snap: LibrarySnapshot): string {
  const lines: string[] = []
  lines.push(`Composition library: ${snap.count} track${snap.count === 1 ? '' : 's'}`)
  lines.push('')

  if (snap.count === 0) {
    lines.push('(empty library)')
    return lines.join('\n')
  }

  lines.push(`Keys:          ${formatDistribution(snap.keyDistribution)}`)
  lines.push(
    `BPM:           ${snap.bpmStats.min}–${snap.bpmStats.max}, median ${snap.bpmStats.median}, IQR ${snap.bpmStats.iqr[0]}–${snap.bpmStats.iqr[1]}`,
  )
  lines.push(`Time sigs:     ${formatDistribution(snap.timeSignatureDistribution)}`)
  if (Object.keys(snap.genreDistribution).length > 0) {
    lines.push(`Genres:        ${formatDistribution(snap.genreDistribution)}`)
  }
  lines.push(`Drum patterns: ${formatDistribution(snap.drumPatternDistribution)}`)
  lines.push('')

  if (snap.topInstruments.length > 0) {
    lines.push('Top instruments:')
    const instLine = snap.topInstruments.map((i) => `${i.id} (${i.count})`).join('  ')
    lines.push(`  ${instLine}`)
    lines.push('')
  }

  const edm = snap.edmFeatureUsage
  lines.push(
    `EDM features:  sidechain (${edm.hasSidechain})  LFOs (${edm.hasLFOs})  automation (${edm.hasAutomation})  synths (${edm.hasSynths})  oneshots (${edm.hasOneshots})`,
  )
  lines.push('')

  if (snap.gaps.length > 0) {
    lines.push('Library gaps (dimensions unexplored — opportunities for new work):')
    for (const gap of snap.gaps) {
      lines.push(`  - ${gap}`)
    }
  } else {
    lines.push('Library gaps: none — the library covers all tracked dimensions')
  }

  return lines.join('\n')
}

// ─── Helpers ───

function distribution<T>(
  entries: IndexEntry[],
  keyFn: (e: IndexEntry) => T,
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const entry of entries) {
    const key = String(keyFn(entry))
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

function computeBpmStats(entries: IndexEntry[]): LibrarySnapshot['bpmStats'] {
  if (entries.length === 0) {
    return { min: 0, max: 0, median: 0, iqr: [0, 0] }
  }
  const bpms = entries.map((e) => e.bpm).sort((a, b) => a - b)
  const min = bpms[0]
  const max = bpms[bpms.length - 1]
  const median = percentile(bpms, 0.5)
  const q1 = percentile(bpms, 0.25)
  const q3 = percentile(bpms, 0.75)
  return { min, max, median, iqr: [q1, q3] }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const idx = (sorted.length - 1) * p
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower]
  const fraction = idx - lower
  return Math.round(sorted[lower] + (sorted[upper] - sorted[lower]) * fraction)
}

function computeTopInstruments(entries: IndexEntry[]): { id: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    for (const inst of entry.instruments) {
      counts.set(inst.id, (counts.get(inst.id) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, 10)
}

/**
 * Classify a key string as major or minor. Handles shorthand ("Am", "F#m"),
 * prose ("F minor", "C major"), and defaults unknown forms to major.
 */
export function isMajorKey(key: string): boolean {
  const lower = key.toLowerCase()
  if (lower.includes('minor')) return false
  if (lower.includes('major')) return true
  // Shorthand: [A-G][#b]?m → minor (trailing m after a letter+accidental)
  if (/^[a-g][#b]?m$/.test(lower)) return false
  // Bare root letter defaults to major (e.g., "C", "F#", "Bb")
  return true
}

/**
 * Normalize a key string for display. Converts "A minor" → "Am", "C major" → "C",
 * so the distribution map doesn't have both "Am" and "A minor" as separate keys.
 */
export function normalizeKey(key: string): string {
  const trimmed = key.trim()
  const rootMatch = trimmed.match(/^([A-G][#b]?)/)
  if (!rootMatch) return trimmed
  const root = rootMatch[1]
  return isMajorKey(trimmed) ? root : `${root}m`
}

function formatTimeSig(ts: [number, number]): string {
  return `${ts[0]}/${ts[1]}`
}

function formatDistribution(dist: Record<string, number>): string {
  const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return sorted.map(([k, v]) => `${k} (${v})`).join(', ')
}
