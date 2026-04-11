import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { build, indexOne, listCompositionFiles, writeIndex } from './build.js'
import type { CompositionIndex } from './types.js'
import { isCompositionPath, update } from './update.js'

// ─── Fixture helpers ───

let tmp: string
let compositionsDir: string
let indexPath: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'composition-index-test-'))
  compositionsDir = join(tmp, 'compositions')
  mkdirSync(compositionsDir, { recursive: true })
  indexPath = join(tmp, 'index.json')
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

  it('stamps generatedAt with a current ISO timestamp', () => {
    writeComposition('a')
    const before = Date.now()
    const index = build({ compositionsDir, repoRoot: tmp })
    const after = Date.now()
    const stamp = Date.parse(index.generatedAt)
    expect(stamp).toBeGreaterThanOrEqual(before)
    expect(stamp).toBeLessThanOrEqual(after)
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
