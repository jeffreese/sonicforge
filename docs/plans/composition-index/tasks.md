# Composition Index — Tasks

## Phase 0: Draft-first convention (prerequisite)

Shipped in the plan PR, not this implementation. Reference only:

- [x] Rule at `.claude/rules/composition-drafts.md`
- [x] `/compose` skill updated with draft-first step
- [x] `/remix` skill updated with draft-first step
- [x] `/iterate` skill updated with draft-first step

## Phase 1: Scaffolding

- [x] Create `tools/composition-index/` directory with `src/` subdirectory
- [x] Write `tools/composition-index/README.md` — what the index is, how to read `index.json`, how to trigger a manual rebuild, how to read the snapshot
- [x] Add `.gitignore` entry for `tools/composition-index/dist/` _(covered by existing root `dist/` pattern)_
- [x] Add `package.json` scripts: `build:index` (tsc compile), `rebuild:index` (run `dist/build.js`) _(spec called for `.mjs`; actual output is `.js` ESM since root `package.json` has `"type": "module"` — simpler than `.mts` sources)_
- [x] Verify the build pipeline produces working ESM output that Node can invoke directly
- [x] Confirm `biome` + `vitest` configs pick up `tools/composition-index/src/**/*.ts`

## Phase 2: Feature extraction (Tier 1 + Tier 2)

- [x] `src/types.ts` — `IndexEntry`, `CompositionIndex`, `LibrarySnapshot`, `Gap` interfaces
- [x] `src/extract.ts` — Tier 1 extraction: metadata, section list, instrument list, EDM feature flags, note count, total bars
- [x] `src/extract.ts` — Tier 2 derived feature: simplified progression (bass-root-per-bar sequence). Uses narrow local `IndexableComposition` types rather than importing from `src/schema/composition.ts` to avoid tsc rootDir constraint — decouples the indexer from full schema additions.
- [x] `src/extract.ts` — Tier 2 derived feature: drum pattern classification with 50% threshold so fill kicks don't misclassify
- [x] `src/extract.ts` — Tier 2 derived feature: dominant register per melodic/bass track (middle 80% trimming)
- [x] Unit tests (33 passing) covering all extraction cases. `genre` is currently `null` for all entries — the composition schema doesn't have a `genre` field yet; indexer is ready to read one when added.

## Phase 3: Update + build entry points

- [x] `src/build.ts` — full rebuild with parameterized `BuildOptions` (compositionsDir, repoRoot) so it's unit-testable
- [x] `src/update.ts` — incremental update, parameterized, accepts argv path OR stdin JSON (PostToolUse hook payload with `tool_input.file_path`). Filters to `compositions/*.json` internally so it can run on every `Write`. Falls back to full rebuild on missing/corrupt/wrong-version index.
- [x] `dist/build.js` and `dist/update.js` compile and run correctly (~30ms per hook fire)
- [x] Integration tests (14 passing) with `mkdtempSync` temp directories covering: build from empty dir, build with multiple files, build with malformed file, update new entry, update existing entry, fallback on missing/corrupt/wrong-version index, path filtering via `isCompositionPath`

## Phase 4: Snapshot + gap analysis

- [x] `src/snapshot.ts` — aggregate `CompositionIndex` into a `LibrarySnapshot` with key/BPM/time-sig/genre/drum distributions, top 10 instruments, EDM feature usage counts
- [x] `src/snapshot.ts` — `computeGaps()` with hardcoded dimension list: major vs minor keys, 4 BPM brackets, non-4/4 time signatures, 4 drum patterns, instrumentation (synths, sampled), 2 length brackets
- [x] `src/snapshot.ts` — `renderSnapshot()` produces a plain-text report for `/library-stats` (Chunk B) and CLI use
- [x] Unit tests (29 passing) covering empty library, key classification, BPM stats, drum pattern distributions, top instruments cap, every gap category, positive-framing assertion (no gap contains "don't", "avoid", "never")

## Phase 5: Hook configuration

- [x] Add `PostToolUse` hook entry in `.claude/settings.json` with `matcher: "Write"`
- [x] Verified hook payload mechanism: Claude Code pipes tool call metadata as JSON to stdin; `tool_input.file_path` is the written file. `update.ts` reads stdin and parses the payload.
- [x] `PostToolUse` matcher filters on tool name only — no native path pattern. `update.ts` filters via `isCompositionPath()` internally and exits silently on non-composition writes (source files, drafts, the index itself).
- [x] Manual test — composition path → index updates (verified with mock stdin payload against `dark-dubstep-drops.json`)
- [x] Manual test — draft path `/tmp/composition-draft-test.json` → hook exits silently
- [x] Manual test — source file path `src/engine/Engine.ts` → hook exits silently
- [x] Latency: ~30ms end-to-end per hook fire (well under the 200ms target)
- [ ] End-to-end test: do a real `/compose` run after merge and confirm the hook fires once against the real tool-call flow (deferred to user verification)

## Phase 6: Skill integration

- [x] Update `/compose` skill: add "consult library snapshot" step after "parse the request", with specification-level detection and silent integration of gaps into generation. Reads `tools/composition-index/snapshot.txt` (pre-rendered digest) rather than `index.json` — see ADR-012 for the efficiency rationale.
- [x] Update `/remix` skill: add the lighter snapshot step — check whether target genre is overrepresented, consider sub-variants. Same pre-rendered-snapshot pattern.
- [x] Create `/library-stats` skill at `.claude/skills/library-stats/SKILL.md` — reads `snapshot.txt`, prints verbatim, no generation.
- [x] Update `CLAUDE.md`: brief pointer under Behavioral Notes + file-organization entry for `tools/composition-index/`.
- [x] **Emergent work:** pre-render the snapshot to `tools/composition-index/snapshot.txt` via new `writeSnapshot()` helper in `build.ts`, wired into both `build.ts` and `update.ts` so the hook maintains it automatically. Strictly more efficient than having each skill parse `index.json`.
- [x] **Emergent work:** filter `demo`-tagged entries inside `snapshot()` and `computeGaps()` (not in skill prompts), so every aggregate and gap reflects only real compositions. Adds `isRealComposition()` helper, `LibrarySnapshot.excludedDemoCount` field, and a render footer.
- [x] **Emergent from dogfood:** guarantee the composition-index hook fires on every final composition write via new `scripts/finalize-composition.sh` shell helper wired as `pnpm finalize-composition <slug>`. Resolves the matcher gap (hook only caught Claude `Write`; shell writes bypassed it) AND the large-file wrinkle (150KB compositions can't reasonably be piped through the `Write` tool). Updated `.claude/rules/composition-drafts.md` to prescribe the helper as the single final step across `/compose`, `/remix`, `/iterate`, and generator scripts. Updated all three skill SKILL.md files' draft-first steps to reference the helper. Added 9 tests in `scripts/finalize-composition.test.ts` covering static wiring checks, argument error paths, and one end-to-end happy-path integration with a demo-tagged test slug + aggressive cleanup.

## Phase 7: ADR + documentation

- [x] ADR-012 capturing the skill-integration decision: pre-rendered snapshot over direct index reads, demo filtering at the `snapshot()` boundary, specification-level detection heuristic, silent integration. See `docs/adrs/adr-012-composition-index-skill-integration.md`.
- [x] Updated `tools/composition-index/README.md` with the `snapshot.txt` consumption path, the demo-filter rule, and the positive-framing invariant.

## Phase 8: Dogfood

Completed during the PR #53 session (see `phase-8-dogfood-notes.md` for the full retro).

- [x] Run `rebuild:index` to populate the initial index from existing compositions — done multiple times during the PR #53 session, index and snapshot current.
- [x] Invoke `/library-stats` and verify the report is informative — rendered cleanly in a fenced code block, 17 real tracks + 3 demos filtered, gaps listed.
- [x] Invoke `/compose` with an underspecified request ("compose me a track") — `halflight.json` landed (melodic trap, F major, 142 BPM). Hit trap primary + trap drums + major-key gaps simultaneously. Silent integration held.
- [x] Invoke `/compose` with a specific request (genre + key + BPM) — `hollow-machine.json` landed (brooding minimal techno, A minor, 130 BPM). All four explicit constraints preserved; snapshot used for authorial distinctness only, not direction override.
- [x] Write a short retro note — `docs/plans/composition-index/phase-8-dogfood-notes.md` captures findings across all three runs with follow-ups routed to `tasks.md` (this file), `backlog.md` (`composition-index-polish` Queued entry), and `.forge/friction.md`.
- [x] Iterate on the snapshot format or gap framing if the first dogfood round shows friction — observations captured and routed; rather than patch in-place, findings go to the polish backlog entry (subgenre-aware genre matching, mood-dominance detection, cross-dimension gap marking) and friction log (top-tags scannability, truncation wording, length bracket boundary). The "iterate" decision was to route over patch in-place.

## Phase 9 (stretch / deferred)

- [ ] Tier 3 similarity scoring: pairwise similarity matrix, weighted feature vector
- [ ] Novelty score for new compositions relative to library
- [ ] Cross-composition drift reporting as its own skill
- [ ] Full chord-quality detection from pad voicings (upgrade from simplified bass-root progression)
