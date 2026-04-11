#!/usr/bin/env node
/**
 * Full rebuild entry point.
 *
 * Walks `compositions/*.json`, extracts a feature entry for each, and writes
 * the complete index to `tools/composition-index/index.json`. Run via
 * `pnpm rebuild:index` or invoked as a fallback from `update.ts` when the
 * existing index is missing or unparseable.
 *
 * Usage: `node tools/composition-index/dist/build.js`
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { type IndexableComposition, extract } from './extract.js'
import { renderSnapshot, snapshot } from './snapshot.js'
import type { CompositionIndex, IndexEntry } from './types.js'

const REPO_ROOT = resolve(process.cwd())
const COMPOSITIONS_DIR = join(REPO_ROOT, 'compositions')
const INDEX_PATH = join(REPO_ROOT, 'tools', 'composition-index', 'index.json')
const SNAPSHOT_PATH = join(REPO_ROOT, 'tools', 'composition-index', 'snapshot.txt')

export interface BuildOptions {
  /** Directory containing composition JSON files. Default: `<cwd>/compositions` */
  compositionsDir?: string
  /** Repo root for computing relative paths in index entries. Default: `process.cwd()` */
  repoRoot?: string
}

function build(opts: BuildOptions = {}): CompositionIndex {
  const compositionsDir = opts.compositionsDir ?? COMPOSITIONS_DIR
  const repoRoot = opts.repoRoot ?? REPO_ROOT
  const entries: Record<string, IndexEntry> = {}
  const files = listCompositionFiles(compositionsDir)
  for (const absPath of files) {
    try {
      const entry = indexOne(absPath, repoRoot)
      entries[entry.path] = entry
    } catch (err) {
      const rel = relative(repoRoot, absPath)
      console.error(
        `[composition-index] skipping ${rel}:`,
        err instanceof Error ? err.message : err,
      )
    }
  }
  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    entries,
  }
}

export function indexOne(absPath: string, repoRoot: string = REPO_ROOT): IndexEntry {
  const raw = readFileSync(absPath, 'utf-8')
  const composition = JSON.parse(raw) as IndexableComposition
  const stats = statSync(absPath)
  const relPath = relative(repoRoot, absPath).replace(/\\/g, '/')
  return extract(composition, relPath, stats.mtime.toISOString())
}

export function listCompositionFiles(dir: string): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  return entries
    .filter((name) => name.endsWith('.json'))
    .map((name) => join(dir, name))
    .sort()
}

export function writeIndex(index: CompositionIndex, path: string = INDEX_PATH): void {
  writeFileSync(path, `${JSON.stringify(index, null, 2)}\n`)
}

/**
 * Render and persist a plain-text library snapshot alongside the index. This
 * is the tiny pre-rendered artifact that `/compose`, `/remix`, and
 * `/library-stats` read at skill startup — cheaper than parsing the full
 * `index.json` when only the aggregates and gaps matter. Called by both the
 * full build and the incremental update paths so the file stays current with
 * every composition write the hook processes.
 */
export function writeSnapshot(index: CompositionIndex, path: string = SNAPSHOT_PATH): void {
  const rendered = renderSnapshot(snapshot(index))
  writeFileSync(path, `${rendered}\n`)
}

/**
 * Derive the sibling `snapshot.txt` path from a given `index.json` path.
 * Used when tests pass a custom `indexPath` and want the snapshot to land in
 * the same directory without hard-coding the production location.
 */
export function deriveSnapshotPath(indexPath: string): string {
  // Replace the trailing filename with `snapshot.txt`
  return indexPath.replace(/[^/\\]+$/, 'snapshot.txt')
}

// Run as a script when invoked directly via `node dist/build.js`
// (true when import.meta.url matches the script being executed)
const invokedDirectly = import.meta.url === `file://${process.argv[1]}`
if (invokedDirectly) {
  const index = build()
  writeIndex(index)
  writeSnapshot(index)
  const count = Object.keys(index.entries).length
  console.log(
    `[composition-index] wrote ${count} entries to ${relative(REPO_ROOT, INDEX_PATH)}` +
      ` and snapshot to ${relative(REPO_ROOT, SNAPSHOT_PATH)}`,
  )
}

export { build, INDEX_PATH, SNAPSHOT_PATH, REPO_ROOT, COMPOSITIONS_DIR }
