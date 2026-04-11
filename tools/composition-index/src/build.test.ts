import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  build,
  computeGeneratedAt,
  deriveSnapshotPath,
  indexOne,
  listCompositionFiles,
  writeIndex,
  writeSnapshot,
} from './build.js'
import type { CompositionIndex, IndexEntry } from './types.js'
import { isCompositionPath, update } from './update.js'

// ─── Fixture helpers ───

let tmp: string
let compositionsDir: string
let indexPath: string
let snapshotPath: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'composition-index-test-'))
  compositionsDir = join(tmp, 'compositions')
  mkdirSync(compositionsDir, { recursive: true })
  indexPath = join(tmp, 'index.json')
  snapshotPath = join(tmp, 'snapshot.txt')
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

function writeComposition(name: string, overrides: Record<string, unknown> = {}): string {
  const composition = {
    version: '1.0',
    metadata: {
      title: name,
      bpm: 120,
      timeSignature: [4, 4],
      key: 'Am',
    },
    instruments: [],
    sections: [],
    ...overrides,
  }
  const filePath = join(compositionsDir, `${name}.json`)
  writeFileSync(filePath, JSON.stringify(composition, null, 2))
  return filePath
}

// ─── listCompositionFiles ───

describe('listCompositionFiles', () => {
  it('returns sorted absolute paths of JSON files in the directory', () => {
    writeComposition('zebra')
    writeComposition('apple')
    writeComposition('mango')
    const files = listCompositionFiles(compositionsDir)
    expect(files).toHaveLength(3)
    expect(files.map((f) => f.split('/').pop())).toEqual(['apple.json', 'mango.json', 'zebra.json'])
  })

  it('ignores non-JSON files', () => {
    writeComposition('real')
    writeFileSync(join(compositionsDir, 'README.md'), 'not json')
    writeFileSync(join(compositionsDir, 'stale.bak'), '{}')
    const files = listCompositionFiles(compositionsDir)
    expect(files).toHaveLength(1)
    expect(files[0].endsWith('real.json')).toBe(true)
  })

  it('returns empty array when directory does not exist', () => {
    expect(listCompositionFiles('/nonexistent/path')).toEqual([])
  })
})

// ─── indexOne ───

describe('indexOne', () => {
  it('reads a composition file and extracts an entry with repo-relative path', () => {
    const filePath = writeComposition('test-track', {
      metadata: { title: 'Test Track', bpm: 140, timeSignature: [4, 4], key: 'F minor' },
    })
    const entry = indexOne(filePath, tmp)
    expect(entry.title).toBe('Test Track')
    expect(entry.bpm).toBe(140)
    expect(entry.path).toBe('compositions/test-track.json')
    expect(entry.modifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

// ─── build ───

describe('build', () => {
  it('produces a CompositionIndex with entries keyed by path', () => {
    writeComposition('a')
    writeComposition('b')
    writeComposition('c')
    const index = build({ compositionsDir, repoRoot: tmp })
    expect(index.version).toBe('1.0')
    expect(Object.keys(index.entries)).toHaveLength(3)
    expect(index.entries['compositions/a.json']).toBeDefined()
    expect(index.entries['compositions/b.json']).toBeDefined()
    expect(index.entries['compositions/c.json']).toBeDefined()
  })

  it('derives generatedAt from the newest entry modifiedAt', () => {
    writeComposition('a')
    writeComposition('b')
    const index = build({ compositionsDir, repoRoot: tmp })
    const entries = Object.values(index.entries)
    const newest = entries.reduce((max, e) => (e.modifiedAt > max ? e.modifiedAt : max), '')
    expect(index.generatedAt).toBe(newest)
  })

  it('produces byte-identical output on back-to-back rebuilds of unchanged compositions', () => {
    writeComposition('a')
    writeComposition('b')
    writeComposition('c')
    const first = JSON.stringify(build({ compositionsDir, repoRoot: tmp }))
    const second = JSON.stringify(build({ compositionsDir, repoRoot: tmp }))
    expect(second).toBe(first)
  })

  it('uses the Unix epoch as generatedAt for an empty library', () => {
    const index = build({ compositionsDir, repoRoot: tmp })
    expect(index.entries).toEqual({})
    expect(index.generatedAt).toBe('1970-01-01T00:00:00.000Z')
  })

  it('skips malformed files with an error log and continues', () => {
    writeComposition('good')
    writeFileSync(join(compositionsDir, 'bad.json'), '{not-json}')
    const index = build({ compositionsDir, repoRoot: tmp })
    expect(Object.keys(index.entries)).toHaveLength(1)
    expect(index.entries['compositions/good.json']).toBeDefined()
  })

  it('produces an empty index when the directory has no compositions', () => {
    const index = build({ compositionsDir, repoRoot: tmp })
    expect(index.entries).toEqual({})
  })
})

// ─── writeIndex ───

describe('writeIndex', () => {
  it('writes the index to the given path as pretty JSON', () => {
    const index: CompositionIndex = {
      version: '1.0',
      generatedAt: '2026-04-11T00:00:00Z',
      entries: {},
    }
    writeIndex(index, indexPath)
    expect(existsSync(indexPath)).toBe(true)
    const { readFileSync } = require('node:fs')
    const raw: string = readFileSync(indexPath, 'utf-8')
    expect(raw).toContain('"version": "1.0"')
    expect(raw.endsWith('\n')).toBe(true)
  })
})

// ─── computeGeneratedAt ───

describe('computeGeneratedAt', () => {
  function makeBareEntry(overrides: Partial<IndexEntry> = {}): IndexEntry {
    return {
      path: 'compositions/test.json',
      title: 'Test',
      bpm: 120,
      key: 'Am',
      timeSignature: [4, 4],
      tags: [],
      primaryTag: null,
      totalBars: 16,
      noteCount: 100,
      sections: [],
      instruments: [],
      masterEffectTypes: [],
      hasSidechain: false,
      hasLFOs: false,
      hasAutomation: false,
      hasMasterEffects: false,
      hasSynths: false,
      hasOneshots: false,
      hasSampled: false,
      modifiedAt: '2026-04-11T00:00:00.000Z',
      progression: null,
      drumPattern: 'none',
      dominantRegisters: {},
      ...overrides,
    }
  }

  it('returns the Unix epoch for empty entries', () => {
    expect(computeGeneratedAt({})).toBe('1970-01-01T00:00:00.000Z')
  })

  it('returns the sole entrys modifiedAt for a single-entry index', () => {
    const entries = {
      'compositions/a.json': makeBareEntry({ modifiedAt: '2026-04-11T12:00:00.000Z' }),
    }
    expect(computeGeneratedAt(entries)).toBe('2026-04-11T12:00:00.000Z')
  })

  it('returns the max modifiedAt across multiple entries', () => {
    const entries = {
      'compositions/a.json': makeBareEntry({ modifiedAt: '2026-01-01T00:00:00.000Z' }),
      'compositions/b.json': makeBareEntry({ modifiedAt: '2026-06-15T12:34:56.000Z' }),
      'compositions/c.json': makeBareEntry({ modifiedAt: '2026-04-11T00:00:00.000Z' }),
    }
    expect(computeGeneratedAt(entries)).toBe('2026-06-15T12:34:56.000Z')
  })

  it('is deterministic — same input yields same output', () => {
    const entries = {
      'compositions/a.json': makeBareEntry({ modifiedAt: '2026-03-01T00:00:00.000Z' }),
      'compositions/b.json': makeBareEntry({ modifiedAt: '2026-05-01T00:00:00.000Z' }),
    }
    const first = computeGeneratedAt(entries)
    const second = computeGeneratedAt(entries)
    const third = computeGeneratedAt(entries)
    expect(first).toBe(second)
    expect(second).toBe(third)
  })
})

// ─── writeSnapshot / deriveSnapshotPath ───

describe('writeSnapshot', () => {
  it('writes a rendered plain-text snapshot to the given path', () => {
    writeComposition('a', {
      metadata: { title: 'A', bpm: 120, timeSignature: [4, 4], key: 'Am', tags: ['dubstep'] },
    })
    writeComposition('b', {
      metadata: { title: 'B', bpm: 128, timeSignature: [4, 4], key: 'Fm', tags: ['house'] },
    })
    const index = build({ compositionsDir, repoRoot: tmp })
    writeSnapshot(index, snapshotPath)
    expect(existsSync(snapshotPath)).toBe(true)
    const content = readFileSync(snapshotPath, 'utf-8')
    expect(content).toContain('Composition library: 2 tracks')
    expect(content).toContain('Library gaps')
    expect(content.endsWith('\n')).toBe(true)
  })

  it('excludes demo-tagged entries from the rendered snapshot', () => {
    writeComposition('real', {
      metadata: { title: 'Real', bpm: 120, timeSignature: [4, 4], key: 'Am', tags: ['dubstep'] },
    })
    writeComposition('verify', {
      metadata: {
        title: 'Verify',
        bpm: 128,
        timeSignature: [4, 4],
        key: 'C major',
        tags: ['fx', 'demo'],
      },
    })
    const index = build({ compositionsDir, repoRoot: tmp })
    writeSnapshot(index, snapshotPath)
    const content = readFileSync(snapshotPath, 'utf-8')
    expect(content).toContain('Composition library: 1 track')
    expect(content).toContain("(excluding 1 verification composition tagged 'demo')")
    // Demo's C major should not count toward the key distribution
    expect(content).not.toContain('C (1)')
  })
})

describe('deriveSnapshotPath', () => {
  it('replaces the index filename with snapshot.txt in the same directory', () => {
    expect(deriveSnapshotPath('/abs/path/index.json')).toBe('/abs/path/snapshot.txt')
    expect(deriveSnapshotPath('tools/composition-index/index.json')).toBe(
      'tools/composition-index/snapshot.txt',
    )
    // Handles a plain filename (no directory component)
    expect(deriveSnapshotPath('index.json')).toBe('snapshot.txt')
  })
})

// ─── update ───

describe('update', () => {
  it('inserts a new entry when the index exists and the file is new', () => {
    writeComposition('existing')
    const initial = build({ compositionsDir, repoRoot: tmp })
    writeIndex(initial, indexPath)

    const newFile = writeComposition('newly-added')
    const result = update(newFile, { indexPath, repoRoot: tmp, compositionsDir })

    expect(result.action).toBe('updated')
    expect(result.entryPath).toBe('compositions/newly-added.json')

    const { readFileSync } = require('node:fs')
    const updated = JSON.parse(readFileSync(indexPath, 'utf-8')) as CompositionIndex
    expect(Object.keys(updated.entries).sort()).toEqual([
      'compositions/existing.json',
      'compositions/newly-added.json',
    ])
  })

  it('updates an existing entry in place when the file changes', () => {
    const filePath = writeComposition('track', {
      metadata: { title: 'Original', bpm: 120, timeSignature: [4, 4], key: 'Am' },
    })
    const initial = build({ compositionsDir, repoRoot: tmp })
    writeIndex(initial, indexPath)

    // Rewrite with new metadata
    writeFileSync(
      filePath,
      JSON.stringify(
        {
          version: '1.0',
          metadata: { title: 'Revised', bpm: 140, timeSignature: [4, 4], key: 'Fm' },
          instruments: [],
          sections: [],
        },
        null,
        2,
      ),
    )
    update(filePath, { indexPath, repoRoot: tmp, compositionsDir })

    const { readFileSync } = require('node:fs')
    const updated = JSON.parse(readFileSync(indexPath, 'utf-8')) as CompositionIndex
    const entry = updated.entries['compositions/track.json']
    expect(entry.title).toBe('Revised')
    expect(entry.bpm).toBe(140)
    expect(entry.key).toBe('Fm')
    expect(Object.keys(updated.entries)).toHaveLength(1)
  })

  it('falls back to a full rebuild when the index file is missing', () => {
    writeComposition('a')
    const bFile = writeComposition('b')
    // No initial writeIndex — index file does not exist
    const result = update(bFile, { indexPath, repoRoot: tmp, compositionsDir })

    expect(result.action).toBe('rebuilt')
    expect(existsSync(indexPath)).toBe(true)

    const { readFileSync } = require('node:fs')
    const fresh = JSON.parse(readFileSync(indexPath, 'utf-8')) as CompositionIndex
    // Both files should be in the rebuilt index
    expect(Object.keys(fresh.entries).sort()).toEqual([
      'compositions/a.json',
      'compositions/b.json',
    ])
  })

  it('falls back to a full rebuild when the index file is unparseable', () => {
    writeComposition('a')
    writeFileSync(indexPath, 'not-json{{{')
    const result = update(writeComposition('b'), {
      indexPath,
      repoRoot: tmp,
      compositionsDir,
    })
    expect(result.action).toBe('rebuilt')
  })

  it('filters non-composition paths via isCompositionPath', () => {
    expect(isCompositionPath('compositions/foo.json', tmp)).toBe(true)
    expect(isCompositionPath(join(tmp, 'compositions', 'foo.json'), tmp)).toBe(true)
    expect(isCompositionPath('compositions/sub/foo.json', tmp)).toBe(false)
    expect(isCompositionPath('compositions/foo.txt', tmp)).toBe(false)
    expect(isCompositionPath('src/engine/Engine.ts', tmp)).toBe(false)
    expect(isCompositionPath('tools/composition-index/index.json', tmp)).toBe(false)
    expect(isCompositionPath('/tmp/composition-draft-test.json', tmp)).toBe(false)
    expect(isCompositionPath('../outside/foo.json', tmp)).toBe(false)
  })

  it('writes snapshot.txt alongside index.json on the update path', () => {
    writeComposition('existing', {
      metadata: { title: 'E', bpm: 120, timeSignature: [4, 4], key: 'Am', tags: ['dubstep'] },
    })
    const initial = build({ compositionsDir, repoRoot: tmp })
    writeIndex(initial, indexPath)
    writeSnapshot(initial, snapshotPath)

    const newFile = writeComposition('newly-added', {
      metadata: { title: 'N', bpm: 128, timeSignature: [4, 4], key: 'Fm', tags: ['house'] },
    })
    update(newFile, { indexPath, snapshotPath, repoRoot: tmp, compositionsDir })

    expect(existsSync(snapshotPath)).toBe(true)
    const content = readFileSync(snapshotPath, 'utf-8')
    expect(content).toContain('Composition library: 2 tracks')
  })

  it('writes snapshot.txt during the rebuild fallback path', () => {
    writeComposition('a', {
      metadata: { title: 'A', bpm: 120, timeSignature: [4, 4], key: 'Am', tags: ['dubstep'] },
    })
    const bFile = writeComposition('b', {
      metadata: { title: 'B', bpm: 128, timeSignature: [4, 4], key: 'Fm', tags: ['house'] },
    })
    // No initial index → triggers rebuild fallback
    update(bFile, { indexPath, snapshotPath, repoRoot: tmp, compositionsDir })
    expect(existsSync(snapshotPath)).toBe(true)
    expect(readFileSync(snapshotPath, 'utf-8')).toContain('Composition library: 2 tracks')
  })

  it('derives a default snapshotPath when none is provided', () => {
    writeComposition('a', {
      metadata: { title: 'A', bpm: 120, timeSignature: [4, 4], key: 'Am', tags: ['dubstep'] },
    })
    const file = writeComposition('b', {
      metadata: { title: 'B', bpm: 128, timeSignature: [4, 4], key: 'Fm', tags: ['house'] },
    })
    // Use indexPath but omit snapshotPath — should derive sibling snapshot.txt
    update(file, { indexPath, repoRoot: tmp, compositionsDir })
    const derived = join(tmp, 'snapshot.txt')
    expect(existsSync(derived)).toBe(true)
  })

  it('produces byte-identical output on back-to-back update calls against unchanged files', () => {
    writeComposition('a')
    const bFile = writeComposition('b')
    const initial = build({ compositionsDir, repoRoot: tmp })
    writeIndex(initial, indexPath)
    writeSnapshot(initial, snapshotPath)

    // First update: inserts b (already in the initial build but redundant write is fine)
    update(bFile, { indexPath, snapshotPath, repoRoot: tmp, compositionsDir })
    const first = readFileSync(indexPath, 'utf-8')
    // Second update: same file, unchanged
    update(bFile, { indexPath, snapshotPath, repoRoot: tmp, compositionsDir })
    const second = readFileSync(indexPath, 'utf-8')

    expect(second).toBe(first)
  })

  it('falls back to a full rebuild when the index has a wrong version', () => {
    writeComposition('a')
    writeFileSync(
      indexPath,
      JSON.stringify({ version: '0.9', generatedAt: 'whenever', entries: {} }),
    )
    const result = update(writeComposition('b'), {
      indexPath,
      repoRoot: tmp,
      compositionsDir,
    })
    expect(result.action).toBe('rebuilt')
  })
})
