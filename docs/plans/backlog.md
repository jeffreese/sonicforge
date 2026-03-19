# Development Backlog

Ordered by priority. `/next` reads this to determine what to work on.

## Active

1. **[timeline-visualization](timeline-visualization/)** — Piano roll view: beat-granular note rendering, zoom/scroll, track focus, pitch ruler

## Queued

2. **undo-redo** — Command pattern with reversible commands, undo/redo stacks (spec after timeline ships)
3. **note-editing** — Draw/select/erase/move/resize notes in the piano roll (spec after undo/redo ships)
4. **audio-export** — WAV + OGG export via Tone.Offline(), stem export as stretch goal (spec when ready)

## Completed

1. **[migration](migration/)** — Vanilla DOM → Lit web components, Tailwind design tokens, reactive stores
