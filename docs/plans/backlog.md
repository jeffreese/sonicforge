# Development Backlog

Ordered by priority. `/forge:next` reads this to determine what to work on.

## Active

**[dynamic-marks](dynamic-marks/)** — Wire the existing `DynamicMark` schema (pp/mf/ff, crescendo, decrescendo) into the engine as velocity envelopes. Small scope, data model already exists, high expressive payoff for every composition in the library (including the 21 already shipped). Different layer of the stack than the recent composition-index + skill integration work, which keeps the engineering view broad.

Progress:

- **Engine + Testing shipped in this PR** — new `src/engine/dynamics.ts` module with `levelToMultiplier()` (MIDI Standard Level 2 mapping ÷ 80), `buildDynamicEnvelope()` (compiles DynamicMark[] into a queryable section-relative envelope), and `DynamicEnvelope.multiplierAt()`. Wired into `TrackPlayer.scheduleTrack()` between articulation and humanization. Tracks without dynamics get constant 1.0 — existing compositions play identically. 19 new tests. `mf` = 1.0 baseline ensures strict superset behavior.
- **Remaining** — playback verification with existing compositions (user-owned); Integration tasks: verify `/compose` + `/iterate` emit dynamic marks and update skill instructions if they don't (currently they don't — they rely on per-note velocity only).

## Queued

1. **[sample-prep-pipeline](sample-prep-pipeline/)** — Trim leading silence, normalize loudness, and extract metadata for all oneshot samples. Addresses two friction classes from the Goldberg Aria session: timing drift (oneshot drums sounding late due to pre-attack silence in Freesound samples) and loudness imbalance (reese/acid bass overpowering piano due to uneven peak levels). Phases: trim+normalize (destructive, fixes both problems at the source) → extract metadata to `metadata.json` (onset latency, peak, RMS, spectral centroid, duration) → enrich `oneshot-hits.md` with measured characteristics → stretch: engine-level onset compensation via metadata. See `spec.md` for the full rationale and design.
2. **composition-index-polish** — Small follow-up scope that emerged from Chunk B dogfood. No plan directory yet; spec when we pick it up. Candidates to scope:
   - **Subgenre-aware primary-genre coverage check.** `computeGaps()` currently does exact-tag match against the hardcoded `PRIMARY_GENRES_TO_CHECK` list. It reported "no techno" while the library had `dark-techno`, `industrial-techno`, and `melodic-techno` as primary tags — three legitimate techno variants. Fix: when checking coverage for a generic genre like `techno`, also consider `*-techno` primary tags as covering the genre. Applies to any compound genre in the check list (`house` ← `deep-bass-house`, `trance` ← `progressive-trance`, etc.). Open question: does the check *only* widen (compound tags count as coverage) or also tighten the gap message (e.g., "no compositions in the generic `techno` variant, though the library has 3 techno subgenres")? Observed during the hollow-machine dogfood run.
   - **Mood-dominance gap detection.** Add a check to `computeGaps()` that flags mood tags exceeding ~50% of the library (currently `dark` dominates at 9/19) and names under-represented moods as positive opportunities. Most actionable diversification signal in the current report, but the hardcoded dimension list only checks primary genres and drum patterns.
   - **Weighted / cross-dimension gap marking.** When a gap spans two dimensions at once (e.g., trap was missing as a primary genre *and* as a drum pattern), mark it visually in the rendered snapshot (`★` or equivalent) so higher-value diversification cues are obvious rather than requiring the reader to cross-reference.
   - Possibly: widen or soft-boundary the length brackets (the current 96-bar track trips the "over 96 bars" gap because the bracket is `min: 97`).
2. **[sampled-drums](sampled-drums/)** + **[round-robin-samples](round-robin-samples/)** — Bundle. Replace `DrumKit.ts` synth oscillators with GM soundfont samples, and extract multiple takes per note/velocity at the same time to eliminate the machine-gun repetition effect. Shared extraction pipeline, single sample re-build.
3. **[effects-mix-polish](effects-mix-polish/)** — Master bus chain (EQ → compressor → limiter), shared reverb send, per-track EQ and send levels. The "glue" layer that separates a demo from a produced track. Touches every instrument, so sequence after drums are in their final sampled form.
5. **[edm-macro-ui](edm-macro-ui/)** — Phase C of EDM production: per-instrument inspector panel, 8–12 macro knobs mapped to musically meaningful parameter combinations, preset save/load. First UI work for EDM sound design — unblocks the full editor.
6. **[edm-full-editor](edm-full-editor/)** — Phase B of EDM production: full synth parameter editors, automation lane drawing in the piano roll, effect chain editor, routing matrix, sample browser. Largest scope in the repo. Depends on `edm-macro-ui`.
7. **undo-redo** — Command pattern with reversible commands, undo/redo stacks (spec after timeline ships).
8. **note-editing** — Draw/select/erase/move/resize notes in the piano roll (spec after undo/redo ships).

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
12. **[composition-index](composition-index/)** — Hook-maintained feature index of every composition in `compositions/*.json`. Chunk A: indexer package with Tier 1 + Tier 2 feature extraction, PostToolUse hook wiring (PR #50). Schema tags: `metadata.tags?: string[]` multi-value field, lowercase-hyphenated format enforcement, human-reviewed backfill, ADR-011 (PR #51). Chunk B: pre-rendered `snapshot.txt` digest, demo-tag filtering inside `snapshot()` / `computeGaps()`, `/compose` + `/remix` skill integration with specification-level detection and silent gap integration, new `/library-stats` skill, ADR-012, Phase 8 dogfood that landed `halflight.json` + `hollow-machine.json` (PR #53). Finalize-helper: `scripts/finalize-composition.sh` + `pnpm finalize-composition <slug>` wiring to close the hook-matcher gap for large compositions and shell-side writes (this PR). Remaining polish routed to `composition-index-polish` Queued entry.
13. **audio-export** — WAV export via `Tone.Recorder`, export button in the transport bar, `/export` skill documenting the browser workflow + MP3 conversion path (PR #59).
