# Development Backlog

Ordered by priority. `/next` reads this to determine what to work on.

## Active

1. **[sample-quality-overhaul](sample-quality-overhaul/)** — Multi-velocity layers, per-semitone sampling, higher bitrate extraction

## Queued

2. **[edm-sound-design-schema](edm-sound-design-schema/)** — Phase A of EDM production: schema + engine for synth instruments, effects, automation, sidechain, LFO, one-shots. No UI changes.
3. **[edm-macro-ui](edm-macro-ui/)** — Phase C of EDM production: per-instrument macro knob UI, preset save/load, real-time parameter editing. Builds on Phase A.
4. **[edm-full-editor](edm-full-editor/)** — Phase B of EDM production: full parameter editors, automation lane drawing, effect chain editor, routing matrix, sample browser. Builds on Phase C.
5. **[dynamic-marks](dynamic-marks/)** — Wire up existing DynamicMark schema to engine (crescendo, decrescendo, dynamic levels)
6. **[sampled-drums](sampled-drums/)** — Replace synth oscillator drums with soundfont-extracted samples
7. **[round-robin-samples](round-robin-samples/)** — Multiple takes per note to eliminate machine-gun repetition (after sample-quality-overhaul)
8. **[effects-mix-polish](effects-mix-polish/)** — Master bus processing, send effects (reverb/delay), per-track mix controls
9. **undo-redo** — Command pattern with reversible commands, undo/redo stacks (spec after timeline ships)
10. **note-editing** — Draw/select/erase/move/resize notes in the piano roll (spec after undo/redo ships)
11. **audio-export** — WAV + OGG export via Tone.Offline(), stem export as stretch goal (spec when ready)

## Completed

1. **[migration](migration/)** — Vanilla DOM → Lit web components, Tailwind design tokens, reactive stores
2. **[humanization](humanization/)** — Timing jitter + velocity variation for natural-sounding playback
3. **[timeline-visualization](timeline-visualization/)** — Piano roll view: beat-granular note rendering, zoom/scroll, track focus, pitch ruler
