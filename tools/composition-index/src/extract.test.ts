import { describe, expect, it } from 'vitest'
import { type IndexableComposition, extract } from './extract.js'

// ─── Fixture helpers ───

const MTIME = '2026-04-11T00:00:00Z'
const PATH = 'compositions/test.json'

function makeComposition(overrides: Partial<IndexableComposition> = {}): IndexableComposition {
  return {
    metadata: {
      title: 'Test',
      bpm: 120,
      timeSignature: [4, 4],
      key: 'Am',
    },
    instruments: [],
    sections: [],
    ...overrides,
  }
}

// ─── Tier 1: direct reads ───

describe('extract — Tier 1', () => {
  it('reads title, bpm, key, time signature from metadata', () => {
    const entry = extract(
      makeComposition({
        metadata: { title: 'My Track', bpm: 140, timeSignature: [4, 4], key: 'F minor' },
      }),
      PATH,
      MTIME,
    )
    expect(entry.title).toBe('My Track')
    expect(entry.bpm).toBe(140)
    expect(entry.key).toBe('F minor')
    expect(entry.timeSignature).toEqual([4, 4])
  })

  it('returns null genre (schema has no genre field yet)', () => {
    const entry = extract(makeComposition(), PATH, MTIME)
    expect(entry.genre).toBeNull()
  })

  it('sums totalBars across sections', () => {
    const entry = extract(
      makeComposition({
        sections: [
          { name: 'intro', bars: 8, tracks: [] },
          { name: 'verse', bars: 16, tracks: [] },
          { name: 'chorus', bars: 16, tracks: [] },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.totalBars).toBe(40)
  })

  it('counts notes across all tracks in all sections', () => {
    const entry = extract(
      makeComposition({
        sections: [
          {
            name: 'a',
            bars: 1,
            tracks: [
              {
                instrumentId: 'x',
                notes: [
                  { pitch: 'C4', time: '0:0:0' },
                  { pitch: 'D4', time: '0:1:0' },
                ],
              },
              {
                instrumentId: 'y',
                notes: [{ pitch: 'E4', time: '0:2:0' }],
              },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.noteCount).toBe(3)
  })

  it('maps instruments to flattened entries with preset from sample or synth name', () => {
    const entry = extract(
      makeComposition({
        instruments: [
          { id: 'p', name: 'Piano', category: 'melodic', sample: 'acoustic_grand_piano' },
          { id: 'b', name: 'Bass', category: 'bass', source: 'synth', synth: 'reese_bass' },
          {
            id: 'd',
            name: 'Drums',
            category: 'drums',
            source: 'oneshot',
            synth: { type: 'mono' },
          },
          { id: 's', name: 'Sub', category: 'bass', source: 'synth', synth: { type: 'mono' } },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.instruments).toHaveLength(4)
    expect(entry.instruments[0]).toMatchObject({ id: 'p', preset: 'acoustic_grand_piano' })
    expect(entry.instruments[1]).toMatchObject({ id: 'b', preset: 'reese_bass' })
    expect(entry.instruments[2]).toMatchObject({ id: 'd', source: 'oneshot', preset: null })
    expect(entry.instruments[3]).toMatchObject({ id: 's', source: 'synth', preset: null })
  })

  it('infers default source "drums" for drums category, "sampled" otherwise', () => {
    const entry = extract(
      makeComposition({
        instruments: [
          { id: 'p', name: 'Piano', category: 'melodic' },
          { id: 'd', name: 'Drums', category: 'drums' },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.instruments[0].source).toBe('sampled')
    expect(entry.instruments[1].source).toBe('drums')
  })

  it('records master effect types in order', () => {
    const entry = extract(
      makeComposition({
        masterEffects: [{ type: 'eq3' }, { type: 'limiter' }],
      }),
      PATH,
      MTIME,
    )
    expect(entry.masterEffectTypes).toEqual(['eq3', 'limiter'])
    expect(entry.hasMasterEffects).toBe(true)
  })

  it('flags EDM features when arrays are populated', () => {
    const entry = extract(
      makeComposition({
        masterEffects: [{ type: 'eq3' }],
        sidechain: [{ source: 'kick', target: 'pad', amount: 0.8 }],
        lfos: [{ id: 'wobble', frequency: '8n', min: 100, max: 2000 }],
        automation: [{ target: 'bass.volume', points: [] }],
      }),
      PATH,
      MTIME,
    )
    expect(entry.hasSidechain).toBe(true)
    expect(entry.hasLFOs).toBe(true)
    expect(entry.hasAutomation).toBe(true)
    expect(entry.hasMasterEffects).toBe(true)
  })

  it('detects synth / oneshot / sampled usage correctly', () => {
    const entry = extract(
      makeComposition({
        instruments: [
          { id: 'p', name: 'Piano', category: 'melodic', source: 'sampled' },
          { id: 'b', name: 'Bass', category: 'bass', source: 'synth' },
          { id: 'd', name: 'Drums', category: 'drums', source: 'oneshot' },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.hasSampled).toBe(true)
    expect(entry.hasSynths).toBe(true)
    expect(entry.hasOneshots).toBe(true)
  })

  it('sets EDM flags to false when absent', () => {
    const entry = extract(makeComposition(), PATH, MTIME)
    expect(entry.hasSidechain).toBe(false)
    expect(entry.hasLFOs).toBe(false)
    expect(entry.hasAutomation).toBe(false)
    expect(entry.hasMasterEffects).toBe(false)
  })
})

// ─── Tier 2: progression ───

describe('extract — progression', () => {
  it('returns null when no bass track exists', () => {
    const entry = extract(
      makeComposition({
        instruments: [{ id: 'p', name: 'Piano', category: 'melodic' }],
        sections: [
          {
            name: 'a',
            bars: 2,
            tracks: [{ instrumentId: 'p', notes: [{ pitch: 'C4', time: '0:0:0' }] }],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.progression).toBeNull()
  })

  it('extracts one root per bar with dash-separated multi-root bars', () => {
    const entry = extract(
      makeComposition({
        instruments: [{ id: 'b', name: 'Bass', category: 'bass' }],
        sections: [
          {
            name: 'a',
            bars: 4,
            tracks: [
              {
                instrumentId: 'b',
                notes: [
                  { pitch: 'A1', time: '0:0:0' },
                  { pitch: 'F1', time: '1:0:0' },
                  { pitch: 'E1', time: '1:2:0' },
                  { pitch: 'D1', time: '2:0:0' },
                  { pitch: 'C1', time: '2:2:0' },
                  { pitch: 'E1', time: '3:0:0' },
                  { pitch: 'A1', time: '3:2:0' },
                ],
              },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.progression).toBe('A | F-E | D-C | E-A')
  })

  it('emits rest "-" for bars with no bass notes', () => {
    const entry = extract(
      makeComposition({
        instruments: [{ id: 'b', name: 'Bass', category: 'bass' }],
        sections: [
          {
            name: 'a',
            bars: 3,
            tracks: [
              {
                instrumentId: 'b',
                notes: [
                  { pitch: 'F1', time: '0:0:0' },
                  { pitch: 'Db1', time: '2:0:0' },
                ],
              },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.progression).toBe('F | - | Db')
  })

  it('dedupes consecutive repeats within a bar (same pitch class)', () => {
    const entry = extract(
      makeComposition({
        instruments: [{ id: 'b', name: 'Bass', category: 'bass' }],
        sections: [
          {
            name: 'a',
            bars: 1,
            tracks: [
              {
                instrumentId: 'b',
                notes: [
                  { pitch: 'F1', time: '0:0:0' },
                  { pitch: 'F2', time: '0:1:0' }, // same pitch class, different octave
                  { pitch: 'F1', time: '0:2:0' },
                ],
              },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.progression).toBe('F')
  })

  it('walks progressions across sections, joining globally', () => {
    const entry = extract(
      makeComposition({
        instruments: [{ id: 'b', name: 'Bass', category: 'bass' }],
        sections: [
          {
            name: 's1',
            bars: 2,
            tracks: [
              {
                instrumentId: 'b',
                notes: [
                  { pitch: 'A1', time: '0:0:0' },
                  { pitch: 'F1', time: '1:0:0' },
                ],
              },
            ],
          },
          {
            name: 's2',
            bars: 2,
            tracks: [
              {
                instrumentId: 'b',
                notes: [
                  { pitch: 'D1', time: '0:0:0' },
                  { pitch: 'E1', time: '1:0:0' },
                ],
              },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.progression).toBe('A | F | D | E')
  })

  it('returns null when bass track contains only oneshot-style names', () => {
    const entry = extract(
      makeComposition({
        instruments: [{ id: 'b', name: 'Bass', category: 'bass', source: 'oneshot' }],
        sections: [
          {
            name: 'a',
            bars: 2,
            tracks: [
              {
                instrumentId: 'b',
                notes: [
                  { pitch: 'rumble', time: '0:0:0' },
                  { pitch: 'rumble', time: '1:0:0' },
                ],
              },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.progression).toBeNull()
  })

  it('uses the first bass track when multiple exist', () => {
    const entry = extract(
      makeComposition({
        instruments: [
          { id: 'b1', name: 'Bass 1', category: 'bass' },
          { id: 'b2', name: 'Bass 2', category: 'bass' },
        ],
        sections: [
          {
            name: 'a',
            bars: 2,
            tracks: [
              { instrumentId: 'b1', notes: [{ pitch: 'A1', time: '0:0:0' }] },
              { instrumentId: 'b2', notes: [{ pitch: 'Eb1', time: '0:0:0' }] },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    // b1 is the first bass track — use its roots
    expect(entry.progression).toBe('A | -')
  })
})

// ─── Tier 2: drum pattern classification ───

describe('extract — drumPattern', () => {
  it('returns "none" when no drums track exists', () => {
    const entry = extract(makeComposition(), PATH, MTIME)
    expect(entry.drumPattern).toBe('none')
  })

  it('returns "none" when the drums track has no kick/snare notes', () => {
    const entry = extract(
      makeComposition({
        instruments: [{ id: 'd', name: 'D', category: 'drums' }],
        sections: [
          {
            name: 'a',
            bars: 1,
            tracks: [{ instrumentId: 'd', notes: [{ pitch: 'hat', time: '0:0:2' }] }],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.drumPattern).toBe('none')
  })

  it('classifies 4-on-floor when kicks land on every beat', () => {
    const entry = extract(
      makeComposition({
        instruments: [{ id: 'd', name: 'D', category: 'drums' }],
        sections: [
          {
            name: 'a',
            bars: 2,
            tracks: [
              {
                instrumentId: 'd',
                notes: [
                  { pitch: 'kick', time: '0:0:0' },
                  { pitch: 'kick', time: '0:1:0' },
                  { pitch: 'kick', time: '0:2:0' },
                  { pitch: 'kick', time: '0:3:0' },
                  { pitch: 'kick', time: '1:0:0' },
                  { pitch: 'kick', time: '1:1:0' },
                  { pitch: 'kick', time: '1:2:0' },
                  { pitch: 'kick', time: '1:3:0' },
                ],
              },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.drumPattern).toBe('4-on-floor')
  })

  it('classifies half-time when kick on 1 and snare on 3 with no mid-bar kicks', () => {
    const entry = extract(
      makeComposition({
        instruments: [{ id: 'd', name: 'D', category: 'drums' }],
        sections: [
          {
            name: 'a',
            bars: 4,
            tracks: [
              {
                instrumentId: 'd',
                notes: [
                  ...Array.from({ length: 4 }, (_, bar) => [
                    { pitch: 'kick', time: `${bar}:0:0` },
                    { pitch: 'snare', time: `${bar}:2:0` },
                  ]).flat(),
                ],
              },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.drumPattern).toBe('half-time')
  })

  it('classifies trap when kick on 1 and and-of-2, snare on 3', () => {
    const entry = extract(
      makeComposition({
        instruments: [{ id: 'd', name: 'D', category: 'drums' }],
        sections: [
          {
            name: 'a',
            bars: 4,
            tracks: [
              {
                instrumentId: 'd',
                notes: Array.from({ length: 4 }, (_, bar) => [
                  { pitch: 'kick', time: `${bar}:0:0` },
                  { pitch: 'kick', time: `${bar}:1:2` },
                  { pitch: 'snare', time: `${bar}:2:0` },
                ]).flat(),
              },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.drumPattern).toBe('trap')
  })

  it('classifies breakbeat when kick on 1 and and-of-3', () => {
    const entry = extract(
      makeComposition({
        instruments: [{ id: 'd', name: 'D', category: 'drums' }],
        sections: [
          {
            name: 'a',
            bars: 4,
            tracks: [
              {
                instrumentId: 'd',
                notes: Array.from({ length: 4 }, (_, bar) => [
                  { pitch: 'kick', time: `${bar}:0:0` },
                  { pitch: 'kick', time: `${bar}:2:2` },
                  { pitch: 'snare', time: `${bar}:1:0` },
                  { pitch: 'snare', time: `${bar}:3:0` },
                ]).flat(),
              },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.drumPattern).toBe('breakbeat')
  })

  it('accepts clap as a snare-equivalent for classification', () => {
    const entry = extract(
      makeComposition({
        instruments: [{ id: 'd', name: 'D', category: 'drums' }],
        sections: [
          {
            name: 'a',
            bars: 2,
            tracks: [
              {
                instrumentId: 'd',
                notes: [
                  { pitch: 'kick', time: '0:0:0' },
                  { pitch: 'clap', time: '0:2:0' },
                  { pitch: 'kick', time: '1:0:0' },
                  { pitch: 'clap', time: '1:2:0' },
                ],
              },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.drumPattern).toBe('half-time')
  })

  it('tolerates sporadic fill kicks without misclassifying', () => {
    // 8 bars of half-time, with one bar containing an extra fill kick
    const notes: { pitch: string; time: string }[] = []
    for (let bar = 0; bar < 8; bar++) {
      notes.push({ pitch: 'kick', time: `${bar}:0:0` })
      notes.push({ pitch: 'snare', time: `${bar}:2:0` })
    }
    // Add one fill kick at bar 3 beat 2 — shouldn't meet 50% threshold
    notes.push({ pitch: 'kick', time: '3:1:2' })

    const entry = extract(
      makeComposition({
        instruments: [{ id: 'd', name: 'D', category: 'drums' }],
        sections: [{ name: 'a', bars: 8, tracks: [{ instrumentId: 'd', notes }] }],
      }),
      PATH,
      MTIME,
    )
    expect(entry.drumPattern).toBe('half-time')
  })

  it('classifies kick-variant names (kick-punch, kick_sub) as kicks', () => {
    const entry = extract(
      makeComposition({
        instruments: [{ id: 'd', name: 'D', category: 'drums' }],
        sections: [
          {
            name: 'a',
            bars: 2,
            tracks: [
              {
                instrumentId: 'd',
                notes: [
                  { pitch: 'kick-punch', time: '0:0:0' },
                  { pitch: 'kick-punch', time: '0:1:0' },
                  { pitch: 'kick-punch', time: '0:2:0' },
                  { pitch: 'kick-punch', time: '0:3:0' },
                  { pitch: 'kick-punch', time: '1:0:0' },
                  { pitch: 'kick-punch', time: '1:1:0' },
                  { pitch: 'kick-punch', time: '1:2:0' },
                  { pitch: 'kick-punch', time: '1:3:0' },
                ],
              },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.drumPattern).toBe('4-on-floor')
  })
})

// ─── Tier 2: dominant registers ───

describe('extract — dominantRegisters', () => {
  it('omits tracks with no pitched notes', () => {
    const entry = extract(
      makeComposition({
        instruments: [{ id: 'b', name: 'Bass', category: 'bass', source: 'oneshot' }],
        sections: [
          {
            name: 'a',
            bars: 1,
            tracks: [
              {
                instrumentId: 'b',
                notes: [{ pitch: 'rumble', time: '0:0:0' }],
              },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.dominantRegisters).toEqual({})
  })

  it('computes middle-80% range from pitched notes', () => {
    // 10 notes spanning C4 to A4; trim 1 from each end leaves C#4 to G#4
    const pitches = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4']
    const entry = extract(
      makeComposition({
        instruments: [{ id: 'lead', name: 'Lead', category: 'melodic' }],
        sections: [
          {
            name: 'a',
            bars: 10,
            tracks: [
              {
                instrumentId: 'lead',
                notes: pitches.map((p, i) => ({ pitch: p, time: `${i}:0:0` })),
              },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.dominantRegisters.lead).toBe('C#4-G#4')
  })

  it('ignores non-pitched hits in bass tracks', () => {
    const entry = extract(
      makeComposition({
        instruments: [{ id: 'b', name: 'Bass', category: 'bass' }],
        sections: [
          {
            name: 'a',
            bars: 3,
            tracks: [
              {
                instrumentId: 'b',
                notes: [
                  { pitch: 'F1', time: '0:0:0' },
                  { pitch: 'rumble', time: '1:0:0' },
                  { pitch: 'F2', time: '2:0:0' },
                ],
              },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    // Only F1 and F2 are pitched, so range is F1-F2
    expect(entry.dominantRegisters.b).toBe('F1-F2')
  })

  it('skips drum and fx categories', () => {
    const entry = extract(
      makeComposition({
        instruments: [
          { id: 'd', name: 'D', category: 'drums' },
          { id: 'f', name: 'F', category: 'fx' },
        ],
        sections: [
          {
            name: 'a',
            bars: 1,
            tracks: [
              { instrumentId: 'd', notes: [{ pitch: 'kick', time: '0:0:0' }] },
              { instrumentId: 'f', notes: [{ pitch: 'riser', time: '0:0:0' }] },
            ],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.dominantRegisters).toEqual({})
  })
})

// ─── Edge cases ───

describe('extract — edge cases', () => {
  it('handles an empty composition', () => {
    const entry = extract(makeComposition(), PATH, MTIME)
    expect(entry.totalBars).toBe(0)
    expect(entry.noteCount).toBe(0)
    expect(entry.sections).toEqual([])
    expect(entry.instruments).toEqual([])
    expect(entry.drumPattern).toBe('none')
    expect(entry.progression).toBeNull()
  })

  it('handles a pure acoustic composition (no EDM features, sampled only)', () => {
    const entry = extract(
      makeComposition({
        instruments: [
          { id: 'p', name: 'Piano', category: 'melodic', sample: 'acoustic_grand_piano' },
          { id: 's', name: 'Strings', category: 'pad', sample: 'string_ensemble' },
        ],
        sections: [
          {
            name: 'verse',
            bars: 8,
            tracks: [{ instrumentId: 'p', notes: [{ pitch: 'C4', time: '0:0:0' }] }],
          },
        ],
      }),
      PATH,
      MTIME,
    )
    expect(entry.hasSampled).toBe(true)
    expect(entry.hasSynths).toBe(false)
    expect(entry.hasOneshots).toBe(false)
    expect(entry.hasSidechain).toBe(false)
    expect(entry.hasLFOs).toBe(false)
    expect(entry.drumPattern).toBe('none')
  })

  it('records modifiedAt and path verbatim', () => {
    const entry = extract(makeComposition(), 'compositions/foo.json', '2026-01-02T03:04:05Z')
    expect(entry.path).toBe('compositions/foo.json')
    expect(entry.modifiedAt).toBe('2026-01-02T03:04:05Z')
  })
})
