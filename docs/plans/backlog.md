# Development Backlog

Ordered by priority. `/next` reads this to determine what to work on.

## Active

1. **[timeline-visualization](timeline-visualization/)** — Piano roll view: beat-granular note rendering, zoom/scroll, track focus, pitch ruler

## Queued

2. **[humanization](humanization/)** — Timing jitter + velocity variation for natural-sounding playback (pure engine code, no new samples)
3. **[sample-quality-overhaul](sample-quality-overhaul/)** — Multi-velocity layers, per-semitone sampling, higher bitrate extraction
4. **[dynamic-marks](dynamic-marks/)** — Wire up existing DynamicMark schema to engine (crescendo, decrescendo, dynamic levels)
5. **[sampled-drums](sampled-drums/)** — Replace synth oscillator drums with soundfont-extracted samples
6. **[round-robin-samples](round-robin-samples/)** — Multiple takes per note to eliminate machine-gun repetition (after sample-quality-overhaul)
7. **[effects-mix-polish](effects-mix-polish/)** — Master bus processing, send effects (reverb/delay), per-track mix controls
8. **undo-redo** — Command pattern with reversible commands, undo/redo stacks (spec after timeline ships)
9. **note-editing** — Draw/select/erase/move/resize notes in the piano roll (spec after undo/redo ships)
10. **audio-export** — WAV + OGG export via Tone.Offline(), stem export as stretch goal (spec when ready)

## Completed

1. **[migration](migration/)** — Vanilla DOM → Lit web components, Tailwind design tokens, reactive stores
