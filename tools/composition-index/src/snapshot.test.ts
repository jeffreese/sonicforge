import { describe, expect, it } from 'vitest'
import { computeGaps, isMajorKey, normalizeKey, renderSnapshot, snapshot } from './snapshot.js'
import type { CompositionIndex, IndexEntry } from './types.js'

// ─── Fixture helper ───

function makeEntry(overrides: Partial<IndexEntry> = {}): IndexEntry {
  return {
    path: 'compositions/test.json',
    title: 'Test',
    bpm: 120,
    key: 'Am',
    timeSignature: [4, 4],
    tags: [],
    primaryTag: null,
    totalBars: 32,
    noteCount: 200,
    sections: [{ name: 'intro', bars: 32 }],
    instruments: [],
    masterEffectTypes: [],
    hasSidechain: false,
    hasLFOs: false,
    hasAutomation: false,
    hasMasterEffects: false,
    hasSynths: false,
    hasOneshots: false,
    hasSampled: false,
    modifiedAt: '2026-04-11T00:00:00Z',
    progression: null,
    drumPattern: 'none',
    dominantRegisters: {},
    ...overrides,
  }
}

function makeIndex(entries: IndexEntry[]): CompositionIndex {
  const map: Record<string, IndexEntry> = {}
  entries.forEach((e, i) => {
    map[e.path === 'compositions/test.json' ? `compositions/test-${i}.json` : e.path] = e
  })
  return {
    version: '1.0',
    generatedAt: '2026-04-11T00:00:00Z',
    entries: map,
  }
}

// ─── isMajorKey ───

describe('isMajorKey', () => {
  it('classifies shorthand minor keys', () => {
    expect(isMajorKey('Am')).toBe(false)
    expect(isMajorKey('F#m')).toBe(false)
    expect(isMajorKey('Bbm')).toBe(false)
  })

  it('classifies prose minor keys', () => {
    expect(isMajorKey('A minor')).toBe(false)
    expect(isMajorKey('F minor')).toBe(false)
  })

  it('classifies prose major keys', () => {
    expect(isMajorKey('C major')).toBe(true)
    expect(isMajorKey('G major')).toBe(true)
  })

  it('defaults bare root letter to major', () => {
    expect(isMajorKey('C')).toBe(true)
    expect(isMajorKey('F#')).toBe(true)
    expect(isMajorKey('Bb')).toBe(true)
  })
})

// ─── normalizeKey ───

describe('normalizeKey', () => {
  it('collapses prose to shorthand', () => {
    expect(normalizeKey('A minor')).toBe('Am')
    expect(normalizeKey('C major')).toBe('C')
    expect(normalizeKey('F minor')).toBe('Fm')
    expect(normalizeKey('F# minor')).toBe('F#m')
  })

  it('leaves shorthand unchanged', () => {
    expect(normalizeKey('Am')).toBe('Am')
    expect(normalizeKey('Bbm')).toBe('Bbm')
    expect(normalizeKey('C')).toBe('C')
  })
})

// ─── snapshot aggregation ───

describe('snapshot', () => {
  it('returns count=0 and empty distributions for an empty index', () => {
    const snap = snapshot(makeIndex([]))
    expect(snap.count).toBe(0)
    expect(snap.keyDistribution).toEqual({})
    expect(snap.bpmStats).toEqual({ min: 0, max: 0, median: 0, iqr: [0, 0] })
    expect(snap.topInstruments).toEqual([])
  })

  it('aggregates key distribution from normalized keys', () => {
    const snap = snapshot(
      makeIndex([
        makeEntry({ key: 'Am' }),
        makeEntry({ key: 'A minor' }), // should collapse to Am
        makeEntry({ key: 'Fm' }),
        makeEntry({ key: 'C major' }),
      ]),
    )
    expect(snap.keyDistribution).toEqual({ Am: 2, Fm: 1, C: 1 })
  })

  it('computes BPM stats correctly', () => {
    const snap = snapshot(
      makeIndex([
        makeEntry({ bpm: 80 }),
        makeEntry({ bpm: 100 }),
        makeEntry({ bpm: 120 }),
        makeEntry({ bpm: 140 }),
        makeEntry({ bpm: 160 }),
      ]),
    )
    expect(snap.bpmStats.min).toBe(80)
    expect(snap.bpmStats.max).toBe(160)
    expect(snap.bpmStats.median).toBe(120)
    expect(snap.bpmStats.iqr[0]).toBeGreaterThanOrEqual(95)
    expect(snap.bpmStats.iqr[1]).toBeLessThanOrEqual(145)
  })

  it('counts drum patterns across entries', () => {
    const snap = snapshot(
      makeIndex([
        makeEntry({ drumPattern: '4-on-floor' }),
        makeEntry({ drumPattern: '4-on-floor' }),
        makeEntry({ drumPattern: 'half-time' }),
        makeEntry({ drumPattern: 'none' }),
      ]),
    )
    expect(snap.drumPatternDistribution).toEqual({
      '4-on-floor': 2,
      'half-time': 1,
      none: 1,
    })
  })

  it('computes top instruments across compositions, sorted by frequency', () => {
    const kick = { id: 'drums', name: 'Drums', category: 'drums', source: 'oneshot', preset: null }
    const bass = {
      id: 'bass',
      name: 'Bass',
      category: 'bass',
      source: 'synth',
      preset: 'reese_bass',
    }
    const pad = { id: 'pad', name: 'Pad', category: 'pad', source: 'synth', preset: 'warm_pad' }
    const snap = snapshot(
      makeIndex([
        makeEntry({ instruments: [kick, bass, pad] }),
        makeEntry({ instruments: [kick, bass] }),
        makeEntry({ instruments: [kick] }),
      ]),
    )
    expect(snap.topInstruments[0]).toEqual({ id: 'drums', count: 3 })
    expect(snap.topInstruments[1]).toEqual({ id: 'bass', count: 2 })
    expect(snap.topInstruments[2]).toEqual({ id: 'pad', count: 1 })
  })

  it('counts EDM feature usage per feature', () => {
    const snap = snapshot(
      makeIndex([
        makeEntry({ hasSidechain: true, hasLFOs: true, hasSynths: true }),
        makeEntry({ hasSidechain: true, hasSynths: true }),
        makeEntry({ hasAutomation: true }),
      ]),
    )
    expect(snap.edmFeatureUsage.hasSidechain).toBe(2)
    expect(snap.edmFeatureUsage.hasLFOs).toBe(1)
    expect(snap.edmFeatureUsage.hasAutomation).toBe(1)
    expect(snap.edmFeatureUsage.hasSynths).toBe(2)
  })

  it('limits topInstruments to 10', () => {
    const manyInstruments = Array.from({ length: 15 }, (_, i) => ({
      id: `inst-${String(i).padStart(2, '0')}`,
      name: `Instrument ${i}`,
      category: 'melodic',
      source: 'synth',
      preset: null,
    }))
    const snap = snapshot(makeIndex([makeEntry({ instruments: manyInstruments })]))
    expect(snap.topInstruments).toHaveLength(10)
  })
})

// ─── Gap analysis ───

describe('computeGaps', () => {
  it('flags empty library', () => {
    const gaps = computeGaps([])
    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps[0]).toContain('empty')
  })

  it('flags missing major keys when all entries are minor', () => {
    const gaps = computeGaps([
      makeEntry({ key: 'Am' }),
      makeEntry({ key: 'Fm' }),
      makeEntry({ key: 'Dm' }),
    ])
    expect(gaps).toContain('No compositions in major keys')
  })

  it('flags missing minor keys when all entries are major', () => {
    const gaps = computeGaps([makeEntry({ key: 'C major' }), makeEntry({ key: 'G major' })])
    expect(gaps).toContain('No compositions in minor keys')
  })

  it('does not flag key gap when both major and minor are present', () => {
    const gaps = computeGaps([makeEntry({ key: 'Am' }), makeEntry({ key: 'C major' })])
    expect(gaps.some((g) => g.includes('major keys'))).toBe(false)
    expect(gaps.some((g) => g.includes('minor keys'))).toBe(false)
  })

  it('flags missing BPM brackets', () => {
    // All at 120 BPM, no under-80 or over-140
    const gaps = computeGaps([makeEntry({ bpm: 120 }), makeEntry({ bpm: 125 })])
    expect(gaps).toContain('No compositions under 80 BPM')
    expect(gaps).toContain('No compositions 80–110 BPM')
    expect(gaps).toContain('No compositions over 140 BPM')
    expect(gaps.some((g) => g.includes('110–140'))).toBe(false)
  })

  it('flags non-4/4 gap when all entries use 4/4', () => {
    const gaps = computeGaps([makeEntry({ timeSignature: [4, 4] })])
    expect(gaps).toContain('No compositions in time signatures other than 4/4')
  })

  it('does not flag non-4/4 gap when a non-4/4 entry exists', () => {
    const gaps = computeGaps([
      makeEntry({ timeSignature: [4, 4] }),
      makeEntry({ timeSignature: [6, 8] }),
    ])
    expect(gaps.some((g) => g.includes('time signatures'))).toBe(false)
  })

  it('flags missing drum patterns from the checked set', () => {
    const gaps = computeGaps([
      makeEntry({ drumPattern: '4-on-floor' }),
      makeEntry({ drumPattern: 'half-time' }),
    ])
    // trap and breakbeat are missing
    const drumGap = gaps.find((g) => g.startsWith('No compositions with'))
    expect(drumGap).toBeDefined()
    expect(drumGap).toContain('trap')
    expect(drumGap).toContain('breakbeat')
  })

  it('flags absence of non-synth compositions when every entry has synths', () => {
    const gaps = computeGaps([
      makeEntry({ hasSynths: true }),
      makeEntry({ hasSynths: true }),
      makeEntry({ hasSynths: true }),
    ])
    expect(gaps.some((g) => g.includes('without synths'))).toBe(true)
  })

  it('flags length gap when no composition is under 16 bars', () => {
    const gaps = computeGaps([makeEntry({ totalBars: 32 }), makeEntry({ totalBars: 64 })])
    expect(gaps).toContain('No compositions under 16 bars')
  })

  it('flags length gap when no composition is over 96 bars', () => {
    const gaps = computeGaps([makeEntry({ totalBars: 32 }), makeEntry({ totalBars: 64 })])
    expect(gaps).toContain('No compositions over 96 bars')
  })

  it('does not flag length gaps when both short and long compositions exist', () => {
    const gaps = computeGaps([makeEntry({ totalBars: 8 }), makeEntry({ totalBars: 108 })])
    expect(gaps.some((g) => g.includes('under 16 bars'))).toBe(false)
    expect(gaps.some((g) => g.includes('over 96 bars'))).toBe(false)
  })

  it('uses only positive framing — every gap describes what is missing', () => {
    const gaps = computeGaps([
      makeEntry({ key: 'Am', bpm: 120, drumPattern: '4-on-floor', hasSynths: true }),
    ])
    // No gap should contain "don't", "avoid", "never", or similar negations
    for (const gap of gaps) {
      expect(gap.toLowerCase()).not.toContain("don't")
      expect(gap.toLowerCase()).not.toContain('avoid')
      expect(gap.toLowerCase()).not.toContain('never')
    }
  })

  it('flags untagged compositions as a backfill gap', () => {
    const gaps = computeGaps([
      makeEntry({ tags: [], primaryTag: null }),
      makeEntry({ tags: ['dubstep'], primaryTag: 'dubstep' }),
    ])
    const untagGap = gaps.find((g) => g.includes('without tags'))
    expect(untagGap).toBeDefined()
    expect(untagGap).toContain('1 composition')
  })

  it('does not flag untagged gap when every composition has tags', () => {
    const gaps = computeGaps([
      makeEntry({ tags: ['dubstep'], primaryTag: 'dubstep' }),
      makeEntry({ tags: ['house'], primaryTag: 'house' }),
    ])
    expect(gaps.some((g) => g.includes('without tags'))).toBe(false)
  })

  it('flags missing primary genres from the checked list', () => {
    const gaps = computeGaps([
      makeEntry({ tags: ['dubstep'], primaryTag: 'dubstep' }),
      makeEntry({ tags: ['house'], primaryTag: 'house' }),
    ])
    const genreGap = gaps.find((g) => g.includes('primary genre'))
    expect(genreGap).toBeDefined()
    // trance, techno, etc. should be in the missing list
    expect(genreGap).toMatch(/trance|techno|ambient|jazz|trap/)
  })

  it('does not flag primary-genre gap when all checked genres are covered', () => {
    const allCovered = [
      'house',
      'techno',
      'trance',
      'dubstep',
      'drum-and-bass',
      'trap',
      'ambient',
      'lo-fi',
      'jazz',
      'classical',
    ]
    const entries = allCovered.map((g) => makeEntry({ tags: [g], primaryTag: g }))
    const gaps = computeGaps(entries)
    expect(gaps.some((g) => g.includes('primary genre'))).toBe(false)
  })
})

describe('snapshot — tags', () => {
  it('aggregates tagDistribution across all tags in all entries', () => {
    const snap = snapshot(
      makeIndex([
        makeEntry({ tags: ['dubstep', 'dark', 'horror'], primaryTag: 'dubstep' }),
        makeEntry({ tags: ['dubstep', 'melodic'], primaryTag: 'dubstep' }),
        makeEntry({ tags: ['house', 'dark'], primaryTag: 'house' }),
      ]),
    )
    expect(snap.tagDistribution).toEqual({
      dubstep: 2,
      dark: 2,
      horror: 1,
      melodic: 1,
      house: 1,
    })
  })

  it('aggregates primaryTagDistribution from only the first tag per entry', () => {
    const snap = snapshot(
      makeIndex([
        makeEntry({ tags: ['dubstep', 'dark'], primaryTag: 'dubstep' }),
        makeEntry({ tags: ['dubstep', 'melodic'], primaryTag: 'dubstep' }),
        makeEntry({ tags: ['house', 'dark'], primaryTag: 'house' }),
      ]),
    )
    expect(snap.primaryTagDistribution).toEqual({ dubstep: 2, house: 1 })
  })

  it('omits untagged entries from primaryTagDistribution', () => {
    const snap = snapshot(
      makeIndex([
        makeEntry({ tags: [], primaryTag: null }),
        makeEntry({ tags: ['house'], primaryTag: 'house' }),
      ]),
    )
    expect(snap.primaryTagDistribution).toEqual({ house: 1 })
  })

  it('renders the primary-genre and top-tags lines when data is present', () => {
    const report = renderSnapshot(
      snapshot(
        makeIndex([
          makeEntry({ tags: ['dubstep', 'dark'], primaryTag: 'dubstep' }),
          makeEntry({ tags: ['house', 'uplifting'], primaryTag: 'house' }),
        ]),
      ),
    )
    expect(report).toContain('Primary genre:')
    expect(report).toContain('dubstep (1)')
    expect(report).toContain('house (1)')
    expect(report).toContain('Top tags')
    expect(report).toContain('dark (1)')
  })
})

// ─── Snapshot rendering ───

describe('renderSnapshot', () => {
  it('produces a readable report for an empty library', () => {
    const report = renderSnapshot(snapshot(makeIndex([])))
    expect(report).toContain('0 tracks')
    expect(report).toContain('empty library')
  })

  it('includes distributions and gaps in the rendered report', () => {
    const report = renderSnapshot(
      snapshot(
        makeIndex([
          makeEntry({
            key: 'Am',
            bpm: 124,
            drumPattern: '4-on-floor',
            hasSynths: true,
            hasSidechain: true,
            instruments: [
              { id: 'drums', name: 'Drums', category: 'drums', source: 'oneshot', preset: null },
            ],
          }),
        ]),
      ),
    )
    expect(report).toContain('1 track')
    expect(report).toContain('Am (1)')
    expect(report).toContain('BPM:')
    expect(report).toContain('Library gaps')
    expect(report).toContain('No compositions in major keys')
  })

  it('handles pluralization of track count', () => {
    const one = renderSnapshot(snapshot(makeIndex([makeEntry()])))
    const many = renderSnapshot(snapshot(makeIndex([makeEntry(), makeEntry()])))
    expect(one).toContain('1 track')
    expect(one).not.toContain('1 tracks')
    expect(many).toContain('2 tracks')
  })
})
