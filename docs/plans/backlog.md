# Development Backlog

Ordered by priority. `/forge:next` reads this to determine what to work on.

## Active

**[composition-index](composition-index/)** — Hook-maintained feature index of every composition in `compositions/*.json`. Lives at `tools/composition-index/index.json`, updated via a `PostToolUse` hook that fires on final composition Writes (enabled by the draft-first authoring convention). Surfaces library "gaps" — dimensions with low or zero coverage — as positive-framed diversification cues for `/compose` and `/remix`, counteracting training-distribution drift and within-session recency pull. Ships with a `/library-stats` reporting skill. Explicitly avoids negative framing ("don't repeat X") because negation primes rather than suppresses in transformer attention.

Progress:

- **Chunk A shipped in PR #50** — indexer package (`tools/composition-index/`), `extract.ts` with Tier 1 + Tier 2 features, `build.ts` + `update.ts` entry points, `snapshot.ts` with gap analysis, `PostToolUse` hook wired into `.claude/settings.json`, 78 new tests. Hook latency ~30ms per fire.
- **Schema tags shipped in PR #51** (infrastructure improvement that emerged mid-plan) — `metadata.tags?: string[]` with lowercase-hyphenated format enforcement, human-reviewed backfill of all 20 existing compositions, indexer updated to read tags + aggregate `tagDistribution` / `primaryTagDistribution` / missing-primary-genre gaps. 12 new tests. See ADR-011. Real library snapshot now surfaces actionable gaps like "no jazz, lo-fi, house, techno, trap" as diversification cues.
- **Chunk B (Phases 6–8) remaining** — `/compose` + `/remix` consult the snapshot during their startup, new `/library-stats` skill, ADR-012, dogfood with an underspecified request to verify the tag-rich gaps actually influence output.

## Queued

1. **[dynamic-marks](dynamic-marks/)** — Wire the existing `DynamicMark` schema (pp/mf/ff, crescendo, decrescendo) into the engine as velocity envelopes. Small scope, data model already exists, high expressive payoff for every composition.
2. **[sampled-drums](sampled-drums/)** + **[round-robin-samples](round-robin-samples/)** — Bundle. Replace `DrumKit.ts` synth oscillators with GM soundfont samples, and extract multiple takes per note/velocity at the same time to eliminate the machine-gun repetition effect. Shared extraction pipeline, single sample re-build.
3. **[effects-mix-polish](effects-mix-polish/)** — Master bus chain (EQ → compressor → limiter), shared reverb send, per-track EQ and send levels. The "glue" layer that separates a demo from a produced track. Touches every instrument, so sequence after drums are in their final sampled form.
4. **[edm-macro-ui](edm-macro-ui/)** — Phase C of EDM production: per-instrument inspector panel, 8–12 macro knobs mapped to musically meaningful parameter combinations, preset save/load. First UI work for EDM sound design — unblocks the full editor.
5. **[edm-full-editor](edm-full-editor/)** — Phase B of EDM production: full synth parameter editors, automation lane drawing in the piano roll, effect chain editor, routing matrix, sample browser. Largest scope in the repo. Depends on `edm-macro-ui`.
6. **undo-redo** — Command pattern with reversible commands, undo/redo stacks (spec after timeline ships).
7. **note-editing** — Draw/select/erase/move/resize notes in the piano roll (spec after undo/redo ships).
8. **audio-export** — WAV + OGG export via `Tone.Offline()`, stem export as stretch goal (spec when ready).

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
