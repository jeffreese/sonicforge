/**
 * Tests for `scripts/finalize-composition.sh` and its pnpm wiring.
 *
 * The helper is the prescribed final step of the composition draft-first
 * workflow — it guarantees the composition-index hook's code path runs on
 * every final composition write regardless of which tool produced the draft.
 * See ADR-012 and `.claude/rules/composition-drafts.md`.
 *
 * Tests split into three layers:
 *
 * 1. **Static checks** — package.json script entry, file presence,
 *    executability, shebang, expected error-message strings. No filesystem
 *    side effects.
 * 2. **Argument error paths** — run the script with bad inputs and verify
 *    it exits non-zero with actionable messages. No pollution of the real
 *    compositions/ directory.
 * 3. **Happy-path integration** — write a uniquely-named demo-tagged draft,
 *    run the helper, verify the file lands and the index was updated, then
 *    clean up aggressively (remove both files + rebuild the index to drop
 *    the test entry).
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const REPO_ROOT = join(__dirname, '..')
const SCRIPT_PATH = join(REPO_ROOT, 'scripts', 'finalize-composition.sh')
const PACKAGE_JSON_PATH = join(REPO_ROOT, 'package.json')
const INDEX_PATH = join(REPO_ROOT, 'tools', 'composition-index', 'index.json')
const COMPOSITIONS_DIR = join(REPO_ROOT, 'compositions')

// ─── Static checks ────────────────────────────────────────────────────────

describe('finalize-composition script wiring', () => {
  it('is present at scripts/finalize-composition.sh', () => {
    expect(existsSync(SCRIPT_PATH)).toBe(true)
  })

  it('has executable permissions', () => {
    const stats = statSync(SCRIPT_PATH)
    // Owner-execute bit (0o100)
    expect(stats.mode & 0o100).toBeGreaterThan(0)
  })

  it('has a bash shebang', () => {
    const firstLine = readFileSync(SCRIPT_PATH, 'utf-8').split('\n')[0]
    expect(firstLine).toBe('#!/usr/bin/env bash')
  })

  it('uses strict mode (set -euo pipefail)', () => {
    const content = readFileSync(SCRIPT_PATH, 'utf-8')
    expect(content).toContain('set -euo pipefail')
  })

  it('is exposed via the pnpm finalize-composition script', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'))
    expect(pkg.scripts['finalize-composition']).toBeDefined()
    expect(pkg.scripts['finalize-composition']).toContain('scripts/finalize-composition.sh')
  })

  it('contains actionable error messages for each failure mode', () => {
    const content = readFileSync(SCRIPT_PATH, 'utf-8')
    // Missing argument
    expect(content).toContain('missing slug argument')
    // Missing draft file
    expect(content).toContain('draft not found')
    // Missing compiled update.js
    expect(content).toContain("run 'pnpm build:index'")
  })
})

// ─── Argument error paths ─────────────────────────────────────────────────

describe('finalize-composition error paths', () => {
  it('fails with exit 1 when no slug is provided', () => {
    let caught: { status: number; stderr: string } | null = null
    try {
      execSync(`bash ${SCRIPT_PATH}`, { cwd: REPO_ROOT, stdio: 'pipe' })
    } catch (err) {
      const e = err as { status: number; stderr: Buffer }
      caught = { status: e.status, stderr: e.stderr.toString() }
    }
    expect(caught).not.toBeNull()
    expect(caught?.status).toBe(1)
    expect(caught?.stderr).toContain('missing slug argument')
  })

  it('fails with exit 1 when the draft file does not exist', () => {
    const nonexistent = `__finalize_nonexistent_${Date.now()}`
    let caught: { status: number; stderr: string } | null = null
    try {
      execSync(`bash ${SCRIPT_PATH} ${nonexistent}`, { cwd: REPO_ROOT, stdio: 'pipe' })
    } catch (err) {
      const e = err as { status: number; stderr: Buffer }
      caught = { status: e.status, stderr: e.stderr.toString() }
    }
    expect(caught).not.toBeNull()
    expect(caught?.status).toBe(1)
    expect(caught?.stderr).toContain('draft not found')
  })
})

// ─── Happy-path integration ───────────────────────────────────────────────

describe('finalize-composition happy path', () => {
  // Use a timestamped unique slug so parallel runs or lingering failures
  // don't collide with real compositions. Prefix `__finalize_test_` also
  // makes cleanup obvious if something goes wrong.
  const slug = `__finalize_test_${Date.now()}_${Math.floor(Math.random() * 10000)}`
  const draftPath = `/tmp/composition-draft-${slug}.json`
  const finalPath = join(COMPOSITIONS_DIR, `${slug}.json`)

  afterEach(() => {
    // Aggressive cleanup: remove the test draft, the committed final file,
    // and rebuild the index to drop the test entry. The draft is demo-tagged
    // so it doesn't pollute snapshot aggregates even if cleanup partially
    // fails, but a lingering file in `compositions/` would still confuse
    // humans — hence the full cleanup.
    rmSync(draftPath, { force: true })
    rmSync(finalPath, { force: true })
    try {
      execSync('node tools/composition-index/dist/build.js', {
        cwd: REPO_ROOT,
        stdio: 'pipe',
      })
    } catch {
      // Non-fatal — the rebuild just tidies up the index. If it fails the
      // test still reports the actual assertion result.
    }
  })

  it('copies the draft to compositions/ and updates the index in one step', () => {
    // Minimal valid composition with a `demo` tag so it's filtered from
    // real-library snapshots and doesn't skew aggregates if cleanup
    // partially fails.
    const minimal = {
      version: '1.0',
      metadata: {
        title: 'Finalize Test',
        bpm: 120,
        timeSignature: [4, 4],
        key: 'A minor',
        tags: ['demo'],
      },
      instruments: [{ id: 'drums', name: 'Drums', category: 'drums' }],
      sections: [
        {
          id: 's1',
          name: 'one',
          bars: 1,
          tracks: [
            {
              instrumentId: 'drums',
              notes: [
                {
                  pitch: 'kick',
                  time: '0:0:0',
                  duration: '4n',
                  velocity: 100,
                },
              ],
            },
          ],
        },
      ],
    }
    writeFileSync(draftPath, JSON.stringify(minimal))

    // Run the helper exactly as a user would
    const stdout = execSync(`bash ${SCRIPT_PATH} ${slug}`, {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    }).toString()

    // Compositions file landed
    expect(existsSync(finalPath)).toBe(true)

    // Helper wrote the expected log line from the composition-index update
    expect(stdout).toContain('[composition-index]')
    expect(stdout).toContain(`compositions/${slug}.json`)

    // Index was updated with the new entry
    const index = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'))
    expect(index.entries[`compositions/${slug}.json`]).toBeDefined()
    expect(index.entries[`compositions/${slug}.json`].title).toBe('Finalize Test')
  })
})
