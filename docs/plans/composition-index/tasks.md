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

- [ ] Update `/compose` skill: add "consult library snapshot" step after "parse the request", with specification-level detection and silent integration of gaps into generation
- [ ] Update `/remix` skill: add the lighter snapshot step — check whether target genre is overrepresented, consider sub-variants
- [ ] Create `/library-stats` skill at `.claude/skills/library-stats/SKILL.md` — reads index, renders snapshot, no generation
- [ ] Update `CLAUDE.md`: brief pointer to the index under the Schema or Behavioral Notes section

## Phase 7: ADR + documentation

- [ ] Capture decision record via `/forge:adr`: problem framing, the pattern-matching tendency, positive-framing principle (don't-think-of-an-elephant), hook-based architecture, tier structure, non-goals
- [ ] Finalize `tools/composition-index/README.md` with current feature list and example snapshot output

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
