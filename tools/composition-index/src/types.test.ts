import { describe, expect, it } from 'vitest'
import type { CompositionIndex, IndexEntry } from './types.js'

describe('types', () => {
  it('CompositionIndex has expected shape', () => {
    const index: CompositionIndex = {
      version: '1.0',
      generatedAt: '2026-04-11T00:00:00Z',
      entries: {},
    }
    expect(index.version).toBe('1.0')
    expect(index.entries).toEqual({})
  })

  it('IndexEntry accepts all required fields', () => {
    const entry: IndexEntry = {
      path: 'compositions/test.json',
      title: 'Test',
      bpm: 120,
      key: 'Am',
      timeSignature: [4, 4],
      tags: ['test-genre'],
      primaryTag: 'test-genre',
      totalBars: 16,
      noteCount: 100,
      sections: [{ name: 'intro', bars: 16 }],
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
    }
    expect(entry.drumPattern).toBe('none')
  })
})
