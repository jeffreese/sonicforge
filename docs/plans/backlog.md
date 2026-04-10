# Development Backlog

Ordered by priority. `/next` reads this to determine what to work on.

## Active

1. **[edm-schema-foundation](edm-schema-foundation/)** — Phase A sub-epic #1: schema types + validation for synth instruments, effects vocabulary, automation, sidechain, LFO, one-shots. No runtime code.

## Queued

2. **[edm-synth-effects](edm-synth-effects/)** — Phase A sub-epic #2: SynthInstrument, preset library, effect factory, master bus effects. First audible EDM capability.
3. **[edm-automation](edm-automation/)** — Phase A sub-epic #3: AutomationEngine for parameter changes over time (filter sweeps, volume rides).
4. **[edm-modulation](edm-modulation/)** — Phase A sub-epic #4: sidechain compression + LFO modulation (wobble bass, pumping pads).
5. **[edm-oneshots](edm-oneshots/)** — Phase A sub-epic #5: OneShotInstrument + bundled CC0 samples (kicks, snares, hats, claps, FX).
6. **[edm-compose-skill](edm-compose-skill/)** — Phase A sub-epic #6 (final): `/compose` skill update, bundled EDM examples, CLAUDE.md + ADR updates.
7. **[edm-macro-ui](edm-macro-ui/)** — Phase C of EDM production: per-instrument macro knob UI, preset save/load, real-time parameter editing. Builds on Phase A.
8. **[edm-full-editor](edm-full-editor/)** — Phase B of EDM production: full parameter editors, automation lane drawing, effect chain editor, routing matrix, sample browser. Builds on Phase C.
9. **[dynamic-marks](dynamic-marks/)** — Wire up existing DynamicMark schema to engine (crescendo, decrescendo, dynamic levels)
10. **[sampled-drums](sampled-drums/)** — Replace synth oscillator drums with soundfont-extracted samples
11. **[round-robin-samples](round-robin-samples/)** — Multiple takes per note to eliminate machine-gun repetition (after sample-quality-overhaul)
12. **[effects-mix-polish](effects-mix-polish/)** — Master bus processing, send effects (reverb/delay), per-track mix controls
13. **undo-redo** — Command pattern with reversible commands, undo/redo stacks (spec after timeline ships)
14. **note-editing** — Draw/select/erase/move/resize notes in the piano roll (spec after undo/redo ships)
15. **audio-export** — WAV + OGG export via Tone.Offline(), stem export as stretch goal (spec when ready)

_Note: `edm-sound-design-schema/` remains as an architectural umbrella reference — its `spec.md` is the canonical source for type definitions and design rationale for all six EDM Phase A sub-epics above._

## Completed

1. **[migration](migration/)** — Vanilla DOM → Lit web components, Tailwind design tokens, reactive stores
2. **[humanization](humanization/)** — Timing jitter + velocity variation for natural-sounding playback
3. **[timeline-visualization](timeline-visualization/)** — Piano roll view: beat-granular note rendering, zoom/scroll, track focus, pitch ruler
4. **[sample-quality-overhaul](sample-quality-overhaul/)** — Multi-velocity layers, per-semitone sampling, higher bitrate extraction (PR #28)
