# Development Backlog

Ordered by priority. `/forge:next` reads this to determine what to work on.

## Active

_No active plan. Pick the top queued item._

## Queued

1. **[compose-helpers](compose-helpers/)** — TypeScript helper library at `tools/compose-helpers/` for long-form composition. Primitives (drum grids, bass patterns, pad sustains, arpeggios, humanization) that Claude imports during `/compose` and `/remix` to handle mechanical stenography while keeping musical choices hand-written. Includes a "rigidity pass" step added to both skills that scans for velocity uniformity, bar-to-bar identicalness, section contrast, and transition markers — applies whether helpers were used or not.
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
