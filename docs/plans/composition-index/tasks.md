# Composition Index — Tasks

## Phase 0: Draft-first convention (prerequisite)

Shipped in the plan PR, not this implementation. Reference only:

- [x] Rule at `.claude/rules/composition-drafts.md`
- [x] `/compose` skill updated with draft-first step
- [x] `/remix` skill updated with draft-first step
- [x] `/iterate` skill updated with draft-first step

## Phase 1: Scaffolding

- [ ] Create `tools/composition-index/` directory with `src/` subdirectory
- [ ] Write `tools/composition-index/README.md` — what the index is, how to read `index.json`, how to trigger a manual rebuild, how to read the snapshot
- [ ] Add `.gitignore` entry for `tools/composition-index/dist/`
- [ ] Add `package.json` scripts: `build:index` (tsc compile), `rebuild:index` (run `dist/build.mjs`)
- [ ] Verify the build pipeline produces working `.mjs` output that Node can invoke directly
- [ ] Confirm `biome` + `vitest` configs pick up `tools/composition-index/src/**/*.ts`

## Phase 2: Feature extraction (Tier 1 + Tier 2)

- [ ] `src/types.ts` — `IndexEntry`, `CompositionIndex`, `LibrarySnapshot`, `Gap` interfaces
- [ ] `src/extract.ts` — Tier 1 extraction: metadata, section list, instrument list, EDM feature flags, note count, total bars
- [ ] `src/extract.ts` — Tier 2 derived feature: simplified progression (bass-root-per-bar sequence from the `category: 'bass'` track). Graceful fallback to `null` when no bass track exists.
- [ ] `src/extract.ts` — Tier 2 derived feature: drum pattern classification (4-on-floor / trap / half-time / breakbeat / other / none) from drums track kick/snare timing
- [ ] `src/extract.ts` — Tier 2 derived feature: dominant register per melodic/bass track (MIDI note range covering >80% of notes)
- [ ] Unit tests covering: a full EDM composition, a pure acoustic composition, a composition with no drums, a composition with multiple bass tracks, a composition with `genre` set, a composition without `genre`

## Phase 3: Update + build entry points

- [ ] `src/build.ts` — full rebuild: reads all `compositions/*.json`, runs `extract()` on each, writes `tools/composition-index/index.json`
- [ ] `src/update.ts` — incremental update: reads one composition path from argv, extracts features, updates or inserts the entry in the existing `index.json`, writes back. Falls back to `build.ts` if `index.json` is missing or unparseable.
- [ ] `dist/update.mjs` and `dist/build.mjs` compile and run correctly
- [ ] Integration test: write a test composition, run `update.mjs` against it, verify the index contains the expected entry

## Phase 4: Snapshot + gap analysis

- [ ] `src/snapshot.ts` — aggregate `CompositionIndex` into a `LibrarySnapshot`: key/BPM/genre/drum/time-sig distributions, top instruments, EDM feature usage counts
- [ ] `src/snapshot.ts` — compute `gaps[]` from snapshot: major keys, BPM brackets, time signatures, drum patterns, instrumentation, length. Hardcoded dimension list, extensible.
- [ ] `src/snapshot.ts` — render snapshot as a human-readable report for `/library-stats`
- [ ] Unit tests covering: empty library, single-composition library, library with obvious gaps, library with no gaps

## Phase 5: Hook configuration

- [ ] Add `PostToolUse` hook entry in `.claude/settings.json` matching `Write` on `compositions/*.json`
- [ ] Verify exact env var name for file path in current Claude Code version (`$CLAUDE_FILE_PATH` / `$TOOL_INPUT_FILE_PATH` / stdin)
- [ ] Manual test: write a composition via `/compose`, verify the hook fires once and updates the index
- [ ] Manual test: draft a composition at `/tmp/composition-draft-test.json`, verify the hook does NOT fire
- [ ] Manual test: edit `src/engine/Engine.ts`, verify the hook does NOT fire

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
