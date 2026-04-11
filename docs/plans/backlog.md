# Development Backlog

Ordered by priority. `/forge:next` reads this to determine what to work on.

## Active

**[composition-index](composition-index/)** — Hook-maintained feature index of every composition in `compositions/*.json`. Lives at `tools/composition-index/index.json`, updated via a `PostToolUse` hook that fires on final composition Writes (enabled by the draft-first authoring convention). Surfaces library "gaps" — dimensions with low or zero coverage — as positive-framed diversification cues for `/compose` and `/remix`, counteracting training-distribution drift and within-session recency pull. Ships with a `/library-stats` reporting skill. Explicitly avoids negative framing ("don't repeat X") because negation primes rather than suppresses in transformer attention.

Progress:

- **Chunk A shipped in PR #50** — indexer package (`tools/composition-index/`), `extract.ts` with Tier 1 + Tier 2 features, `build.ts` + `update.ts` entry points, `snapshot.ts` with gap analysis, `PostToolUse` hook wired into `.claude/settings.json`, 78 new tests. Hook latency ~30ms per fire.
- **Schema tags shipped in PR #51** (infrastructure improvement that emerged mid-plan) — `metadata.tags?: string[]` with lowercase-hyphenated format enforcement, human-reviewed backfill of all 20 existing compositions, indexer updated to read tags + aggregate `tagDistribution` / `primaryTagDistribution` / missing-primary-genre gaps. 12 new tests. See ADR-011. Real library snapshot now surfaces actionable gaps like "no jazz, lo-fi, house, techno, trap" as diversification cues.
- **Chunk B (Phases 6–7) shipped in this PR** — pre-rendered `snapshot.txt` via new `writeSnapshot()` helper wired into `build.ts` + `update.ts`; demo-tag filter applied inside `snapshot()` / `computeGaps()` (`isRealComposition` helper, `LibrarySnapshot.excludedDemoCount` field, render footer); `/compose` step 2 consults the snapshot with a specification-level heuristic and silent gap integration; `/remix` step 3 adds a lighter variant for sub-variant flavor; new `/library-stats` skill reads `snapshot.txt` and prints verbatim; ADR-012 captures the design; `biome.json` ignores `index.json` + `snapshot.txt` as generated artifacts (latent PR #50 bug). 23 new tests; 110 composition-index tests passing total; 607/607 full suite.
- **Phase 8 (dogfood) effectively complete** — three skill invocations during the same PR session validated the pipeline end-to-end. `/library-stats` rendered cleanly; `/compose "make me a song"` landed `halflight.json` (melodic trap, F major, 142 BPM) hitting three gaps at once via silent integration; `/compose "a brooding techno track in A minor at 130 BPM"` landed `hollow-machine.json` with all four explicit constraints preserved. Retro notes at `docs/plans/composition-index/phase-8-dogfood-notes.md`.
- **Chunk B remaining** — one unchecked task: guarantee the composition-index hook fires on every final composition write via a new `pnpm finalize-composition <slug>` helper script. Current draft-first rule permits `cp`, which bypasses the `Write`-matcher hook and leaves the index stale. Fix is a small helper + rule + skill edits; target for the next `/forge:next` cycle. Plan closes after that ships.

## Queued

1. **composition-index-polish** — Small follow-up scope that emerged from Chunk B dogfood. No plan directory yet; spec when we pick it up. Candidates to scope:
   - **Subgenre-aware primary-genre coverage check.** `computeGaps()` currently does exact-tag match against the hardcoded `PRIMARY_GENRES_TO_CHECK` list. It reported "no techno" while the library had `dark-techno`, `industrial-techno`, and `melodic-techno` as primary tags — three legitimate techno variants. Fix: when checking coverage for a generic genre like `techno`, also consider `*-techno` primary tags as covering the genre. Applies to any compound genre in the check list (`house` ← `deep-bass-house`, `trance` ← `progressive-trance`, etc.). Open question: does the check *only* widen (compound tags count as coverage) or also tighten the gap message (e.g., "no compositions in the generic `techno` variant, though the library has 3 techno subgenres")? Observed during the hollow-machine dogfood run.
   - **Mood-dominance gap detection.** Add a check to `computeGaps()` that flags mood tags exceeding ~50% of the library (currently `dark` dominates at 9/19) and names under-represented moods as positive opportunities. Most actionable diversification signal in the current report, but the hardcoded dimension list only checks primary genres and drum patterns.
   - **Weighted / cross-dimension gap marking.** When a gap spans two dimensions at once (e.g., trap was missing as a primary genre *and* as a drum pattern), mark it visually in the rendered snapshot (`★` or equivalent) so higher-value diversification cues are obvious rather than requiring the reader to cross-reference.
   - Possibly: widen or soft-boundary the length brackets (the current 96-bar track trips the "over 96 bars" gap because the bracket is `min: 97`).
2. **[dynamic-marks](dynamic-marks/)** — Wire the existing `DynamicMark` schema (pp/mf/ff, crescendo, decrescendo) into the engine as velocity envelopes. Small scope, data model already exists, high expressive payoff for every composition.
3. **[sampled-drums](sampled-drums/)** + **[round-robin-samples](round-robin-samples/)** — Bundle. Replace `DrumKit.ts` synth oscillators with GM soundfont samples, and extract multiple takes per note/velocity at the same time to eliminate the machine-gun repetition effect. Shared extraction pipeline, single sample re-build.
4. **[effects-mix-polish](effects-mix-polish/)** — Master bus chain (EQ → compressor → limiter), shared reverb send, per-track EQ and send levels. The "glue" layer that separates a demo from a produced track. Touches every instrument, so sequence after drums are in their final sampled form.
5. **[edm-macro-ui](edm-macro-ui/)** — Phase C of EDM production: per-instrument inspector panel, 8–12 macro knobs mapped to musically meaningful parameter combinations, preset save/load. First UI work for EDM sound design — unblocks the full editor.
6. **[edm-full-editor](edm-full-editor/)** — Phase B of EDM production: full synth parameter editors, automation lane drawing in the piano roll, effect chain editor, routing matrix, sample browser. Largest scope in the repo. Depends on `edm-macro-ui`.
7. **undo-redo** — Command pattern with reversible commands, undo/redo stacks (spec after timeline ships).
8. **note-editing** — Draw/select/erase/move/resize notes in the piano roll (spec after undo/redo ships).
9. **audio-export** — WAV + OGG export via `Tone.Offline()`, stem export as stretch goal (spec when ready).

_Note: `edm-sound-design-schema/` remains as an architectural umbrella reference — its `spec.md` is the canonical source for type definitions and design rationale for all six EDM Phase A sub-epics, all of which are now shipped._

## Completed

1. **[migration](migration/)** — Vanilla DOM → Lit web components, Tailwind design tokens, reactive stores
2. **[humanization](humanization/)** — Timing jitter + velocity variation for natural-sounding playback
3. **[timeline-visualization](timeline-visualization/)** — Piano roll view: beat-granular note rendering, zoom/scroll, track focus, pitch ruler
4. **[sample-quality-overhaul](sample-quality-overhaul/)** — Multi-velocity layers, per-semitone sampling, higher bitrate extraction (PR #28)
5. **[edm-schema-foundation](edm-schema-foundation/)** — Phase A #1: schema types + validation for synth instruments, effects, automation, sidechain, LFO, one-shots
6. **[edm-synth-effects](edm-synth-effects/)** — Phase A #2: `SynthInstrument`, preset library, effect factory, master bus effects
7. **[edm-automation](edm-automation/)** — Phase A #3: `AutomationEngine` for parameter changes over time (filter sweeps, volume rides)
8. **[edm-modulation](edm-modulation/)** — Phase A #4: sidechain compression + LFO modulation (wobble bass, pumping pads)
9. **[edm-oneshots](edm-oneshots/)** — Phase A #5: `OneShotInstrument` + bundled CC0 samples (kicks, snares, hats, claps, FX)
10. **[edm-compose-skill](edm-compose-skill/)** — Phase A #6: `/compose` skill update, bundled EDM examples, CLAUDE.md + ADR updates. Manual-verification tasks in `tasks.md` remain as user-owned smoke tests, not engineering work.
11. **[compose-helpers](compose-helpers/)** — TypeScript helper library at `tools/compose-helpers/` for long-form composition. Primitives (drum grids, bass patterns, pad sustains, arpeggios, humanization) that Claude imports during `/compose` and `/remix` to handle mechanical stenography while keeping musical choices hand-written. Rigidity pass added to both skills. Phase 5 dogfood shipped in PR #47 (`dark-dubstep-drops`), produced three follow-up primitives: `snareRoll`, `hatRoll` (with round-robin + accent pattern), `gatedBass`.
