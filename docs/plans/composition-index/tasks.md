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
- [ ] **Emergent from dogfood:** guarantee the composition-index hook fires on every final composition write. Current rule accepts `cp` / "any atomic file operation," but the PostToolUse hook matcher is `Write` — `cp` and other shell writes bypass the hook entirely, and the snapshot/index go stale until someone runs `pnpm rebuild:index` manually. Observed during the `halflight` dogfood. **Nuance surfaced during the `hollow-machine` dogfood:** a naive "just require Claude's Write tool" fix doesn't work for large compositions — `hollow-machine.json` is 150KB, which would burn huge context to pipe through Write tool content. The fix needs to preserve the hook contract *without* forcing large files through the model's output channel. Target design:
  - Add a `pnpm finalize-composition <slug>` helper script that does `cp /tmp/composition-draft-<slug>.json compositions/<slug>.json && node tools/composition-index/dist/update.js compositions/<slug>.json` in one atomic step. (Or a `scripts/finalize-composition.sh` wrapper if the pnpm-script entry point fights with shell args.)
  - Update `.claude/rules/composition-drafts.md` to require this helper for the final step in `/compose`, `/remix`, `/iterate`, and the "Generator scripts" section — replacing the current "cp, Write, or equivalent" language with a single explicit command.
  - Update the three skill SKILL.md files' draft-first step to reference the helper.
  - Add a test for the helper script: given a draft file in `/tmp/`, the helper copies + updates the index in one invocation and exits cleanly.
  - The helper makes the contract explicit (one command, one path), reusable across all three skills, and keeps the large-file case working.

## Phase 7: ADR + documentation

- [x] ADR-012 capturing the skill-integration decision: pre-rendered snapshot over direct index reads, demo filtering at the `snapshot()` boundary, specification-level detection heuristic, silent integration. See `docs/adrs/adr-012-composition-index-skill-integration.md`.
- [x] Updated `tools/composition-index/README.md` with the `snapshot.txt` consumption path, the demo-filter rule, and the positive-framing invariant.

## Phase 8: Dogfood

- [ ] Run `rebuild:index` to populate the initial index from existing compositions
- [ ] Invoke `/library-stats` and verify the report is informative
- [ ] Invoke `/compose` with an underspecified request ("compose me a track") and observe whether the gaps list meaningfully influences the generation
- [ ] Invoke `/compose` with a specific request (genre + key + BPM) and verify the snapshot injection is silent / doesn't override specification
- [ ] Write a short retro note: did the gaps list help? Was the snapshot injection distracting? Did the hook misfire?
- [ ] Iterate on the snapshot format or gap framing if the first dogfood round shows friction

## Phase 9 (stretch / deferred)

- [ ] Tier 3 similarity scoring: pairwise similarity matrix, weighted feature vector
- [ ] Novelty score for new compositions relative to library
- [ ] Cross-composition drift reporting as its own skill
- [ ] Full chord-quality detection from pad voicings (upgrade from simplified bass-root progression)
