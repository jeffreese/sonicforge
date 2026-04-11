#!/usr/bin/env node
/**
 * Incremental update entry point — invoked by the PostToolUse hook or
 * directly from the command line.
 *
 * Accepts a composition file path via either:
 *   - Command-line argument: `node update.js <path>`
 *   - Stdin JSON (from PostToolUse hook): reads `tool_input.file_path` from
 *     the JSON payload Claude Code pipes to the hook command
 *
 * Filters input: only paths inside `compositions/*.json` trigger an update.
 * Anything else exits silently with status 0 — the PostToolUse hook matcher
 * only filters on tool name (`Write`), not path, so this script runs on
 * every Write and must filter itself.
 *
 * If the index file is missing or unparseable, falls back to a full
 * rebuild so a bad index never blocks the workflow.
 *
 * Usage (CLI): `node tools/composition-index/dist/update.js <composition-path>`
 * Usage (hook): `node tools/composition-index/dist/update.js` (reads stdin)
 */

import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'
import {
  INDEX_PATH,
  REPO_ROOT,
  build,
  computeGeneratedAt,
  deriveSnapshotPath,
  indexOne,
  writeIndex,
  writeSnapshot,
} from './build.js'
import type { CompositionIndex } from './types.js'

export interface UpdateOptions {
  /** Index file path. Default: `<cwd>/tools/composition-index/index.json` */
  indexPath?: string
  /**
   * Rendered snapshot file path. Default: sibling of `indexPath` named
   * `snapshot.txt`. This is the pre-rendered digest that `/compose`,
   * `/remix`, and `/library-stats` read at skill startup — cheaper than
   * parsing the full `index.json` for just the aggregates and gaps.
   */
  snapshotPath?: string
  /** Repo root for computing relative paths. Default: `process.cwd()` */
  repoRoot?: string
  /** Compositions dir, used during fallback full rebuild. Default: `<cwd>/compositions` */
  compositionsDir?: string
}

function loadIndex(indexPath: string): CompositionIndex | null {
  if (!existsSync(indexPath)) return null
  try {
    const raw = readFileSync(indexPath, 'utf-8')
    const parsed = JSON.parse(raw) as CompositionIndex
    if (parsed.version !== '1.0' || typeof parsed.entries !== 'object') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function update(
  filePath: string,
  opts: UpdateOptions = {},
): { action: 'updated' | 'rebuilt'; entryPath: string } {
  const indexPath = opts.indexPath ?? INDEX_PATH
  const snapshotPath = opts.snapshotPath ?? deriveSnapshotPath(indexPath)
  const repoRoot = opts.repoRoot ?? REPO_ROOT
  const absPath = resolve(filePath)
  const relPath = relative(repoRoot, absPath).replace(/\\/g, '/')

  const existing = loadIndex(indexPath)
  if (!existing) {
    // Index missing or corrupt — rebuild from scratch
    const fresh = build({ repoRoot, compositionsDir: opts.compositionsDir })
    writeIndex(fresh, indexPath)
    writeSnapshot(fresh, snapshotPath)
    return { action: 'rebuilt', entryPath: relPath }
  }

  const entry = indexOne(absPath, repoRoot)
  existing.entries[entry.path] = entry
  existing.generatedAt = computeGeneratedAt(existing.entries)
  writeIndex(existing, indexPath)
  writeSnapshot(existing, snapshotPath)
  return { action: 'updated', entryPath: entry.path }
}

/**
 * Determine whether a file path is a composition JSON file — meaning inside
 * the `compositions/` directory and ending in `.json`. Uses only the relative
 * path components so it works regardless of absolute path prefix.
 */
export function isCompositionPath(filePath: string, repoRoot: string = REPO_ROOT): boolean {
  // Relative paths are resolved against repoRoot (Claude Code typically passes
  // repo-relative paths in tool_input.file_path). Absolute paths are used as-is.
  const abs = isAbsolute(filePath) ? filePath : join(repoRoot, filePath)
  const rel = relative(repoRoot, resolve(abs)).replace(/\\/g, '/')
  if (rel.startsWith('..') || rel.startsWith('/')) return false
  if (!rel.startsWith('compositions/')) return false
  if (!rel.endsWith('.json')) return false
  // Disallow nested subdirectories — only top-level compositions/*.json
  const inner = rel.slice('compositions/'.length)
  return !inner.includes('/')
}

/**
 * Resolve the composition path from either argv or stdin JSON payload.
 * Returns null when no path can be extracted (e.g. hook fired on a non-Write
 * event or the JSON has no `tool_input.file_path`).
 */
function resolveInputPath(argv: string[]): string | null {
  // Direct argv path (CLI invocation)
  if (argv[2]) return argv[2]

  // Stdin JSON (PostToolUse hook invocation)
  try {
    const stdin = readFileSync(0, 'utf-8')
    if (!stdin.trim()) return null
    const payload = JSON.parse(stdin) as { tool_input?: { file_path?: string } }
    return payload?.tool_input?.file_path ?? null
  } catch {
    return null
  }
}

const invokedDirectly = import.meta.url === `file://${process.argv[1]}`
if (invokedDirectly) {
  try {
    const filePath = resolveInputPath(process.argv)
    if (!filePath) {
      // No path → nothing to do. Non-blocking: silent exit.
      process.exit(0)
    }
    if (!isCompositionPath(filePath)) {
      // Not a composition file — hook fired on something else (source file,
      // skill doc, etc.). Silent exit so we don't spam logs.
      process.exit(0)
    }
    const result = update(filePath)
    const label = result.action === 'rebuilt' ? 'rebuilt index' : 'updated entry'
    console.log(`[composition-index] ${label} for ${result.entryPath}`)
  } catch (err) {
    // Non-blocking: log and exit 0 so the hook doesn't block session flow
    console.error('[composition-index] error:', err instanceof Error ? err.message : String(err))
    process.exit(0)
  }
}
