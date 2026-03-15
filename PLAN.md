# SonicForge Implementation Plan

## Phase 1: Minimum Playable Product (COMPLETE)

1. Project scaffolding (`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`)
2. `src/schema/composition.ts` — TypeScript interfaces for composition JSON
3. `src/schema/validate.ts` — Runtime validation with error messages
4. `src/engine/InstrumentLoader.ts` — CDN sample loading → Tone.Sampler (FluidR3_GM OGG)
5. `src/engine/Transport.ts` — Tone.Transport wrapper (BPM, time sig, section offsets, beat tracking)
6. `src/engine/TrackPlayer.ts` — Note scheduling with articulations (staccato, legato, accent, ghost, tenuto)
7. `src/engine/Engine.ts` — Orchestrator (load/play/pause/stop/seek, state machine)
8. `src/ui/TransportBar.ts` — Play/pause/stop buttons, position display, status label
9. `src/ui/CompositionLoader.ts` — Paste JSON / upload file / drag-and-drop
10. `src/ui/App.ts` + `src/main.ts` — Bootstrap, keyboard shortcuts (spacebar)
11. `src/ui/styles.css` — Dark theme (indigo/purple gradient)
12. `compositions/demo-ballad.json` — "Quiet Evening" test composition (piano + bass, 3 sections)
13. `CLAUDE.md` — Project documentation

## Phase 2: Visualization & Mixing (COMPLETE)

14. `src/ui/Timeline.ts` — Canvas-based section × track grid, color-coded cells, playhead, click-to-seek
15. `src/ui/Mixer.ts` — Per-track channel strips: volume slider, pan slider, mute/solo buttons
16. `src/engine/MixBus.ts` — Per-instrument Tone.Channel routing, solo/mute logic, master output
17. `src/engine/EffectsChain.ts` — Per-instrument effects (reverb, delay, chorus, distortion, EQ, compressor)
18. Updated `InstrumentLoader.ts` — Samplers no longer hardwired to destination; routed through effects → mix channels
19. Updated `Engine.ts` — Integrates MixBus + EffectsChain, exposes `getMixBus()`

## Phase 3: Claude Integration (COMPLETE)

All music generation logic lives in `.claude/` config — no composition logic in application code.

### Rules (encode what Claude needs to output valid, musical JSON)
20. `.claude/rules/composition-format.md` — Full JSON schema reference, all available GM instrument/sample names, drum hit names, duration notation, time format. This is what makes Claude output valid JSON.
21. `.claude/rules/music-theory.md` — Guidelines for chord progressions, voice leading, section structure, dynamics, genre conventions. Makes the music sound good.

### Skills (slash commands for composing)
22. `.claude/skills/compose/SKILL.md` — `/compose` — Generate a new composition from a description. Loads the schema rule, asks clarifying questions about mood/genre/instrumentation, generates full composition JSON.
23. `.claude/skills/iterate/SKILL.md` — `/iterate` — Modify an existing composition. Reads current JSON, makes targeted changes (add a bridge, change chords, adjust dynamics, swap instruments).
24. `.claude/skills/play/SKILL.md` — `/play` — Open the browser player and load a composition.
25. `.claude/skills/explain/SKILL.md` — `/explain` — Music theory education (scales, chords, progressions, genres).

### Key Principle
The rules and skills encode everything Claude needs to generate high-quality, schema-valid compositions. The application code is purely a playback engine — it takes valid JSON and makes sound.

## Phase 4: Polish

- Richer demo composition (drums, effects, more instruments/sections) to exercise full feature set
- URL parameter loading (`?load=compositions/demo.json`)
- Loading progress indicators (per-instrument sample loading feedback)
- Section looping (loop a single section for practice/review)
- Chord shorthand expansion in schema (e.g., "Cmaj7" → individual notes)
- Self-hosted sample upgrades for key instruments
- Responsive layout for narrower viewports (mixer strip wrapping, timeline scaling)

_Note: Drag-and-drop loading and spacebar play/pause were completed in Phase 1._

## Phase 5: Sample Browser & Auditioner (COMPLETE)

A unified feature set for discovering, previewing, and playing all available sounds in the engine.

### Shared Infrastructure

**`SampleAuditioner`** — new engine class (`src/engine/SampleAuditioner.ts`)
- Loads any GM instrument sample from the CDN on demand (reuses `fetchSoundfontData`)
- Creates a DrumKit instance for previewing drum hits
- Caches loaded Tone.Samplers so switching instruments is instant after first load
- Exposes `play(note, duration, velocity?)` and `stop()` for one-shot previewing
- Connects through a dedicated preview channel (separate from composition mix bus)

### Feature A: Sample Explorer Panel

New UI section in the main page for browsing all available sounds.

- List all 128 GM instruments grouped by category (Piano/Keys, Guitar, Bass, Strings, Brass, Woodwinds, Synth Lead, Synth Pad, Chromatic Percussion, Organ, Ensemble)
- Drum Kit section with all 9 named hits (kick, snare, hihat, hihat-open, ride, crash, tom-high, tom-mid, tom-low)
- Click any instrument → loads sample via SampleAuditioner → plays a demo note (C4 for melodic, hit sound for drums)
- Adjustable preview controls: pitch (note selector), velocity slider
- Visual loading state per instrument (spinner while fetching from CDN)
- Search/filter input to quickly find instruments by name

### Feature B: Keyboard Mode

Interactive keyboard that lets you play any loaded sample with computer keys.

- Toggle button in the Sample Explorer (or floating toolbar)
- Computer keyboard mapping:
  - Bottom row (Z-M) or middle row (A-L) = white keys
  - Row above = black keys (W, E, T, Y, U, O, P)
  - Configurable octave (shift up/down with arrow keys or +/- buttons)
- On-screen visual keyboard showing which keys are mapped
- Highlights keys as they're pressed
- Works with whatever sample is currently selected in the explorer
- Velocity controlled by a slider (or could use key press timing if feasible)

### Feature C: Inline Sample Picker

Enhance the mixer to allow swapping instrument samples in a loaded composition.

- Each instrument name in the mixer becomes clickable
- Opens a dropdown/modal filtered by category (with option to show all)
- Each option has a preview button (plays demo note with that sample)
- Selecting a new sample hot-swaps it in the running composition
- Updates the in-memory composition data (doesn't write to file unless user saves)
- Shows current sample name and category in the mixer strip

### Implementation Order

1. `SampleAuditioner` engine class (shared foundation)
2. GM instrument registry in code (`src/data/gm-instruments.ts` — structured list with categories, derived from `gm-samples.md`)
3. Sample Explorer panel UI
4. Keyboard Mode (enhances explorer)
5. Inline Sample Picker (ties into mixer)

### Design Notes

- The explorer panel should match the existing dark theme (indigo/purple)
- Sample loading is async and can be slow on first load — show clear loading feedback
- DrumKit synth sounds are instant (no CDN fetch needed) — good UX contrast
- Keyboard mode should not interfere with existing keyboard shortcuts (spacebar for play/pause)
- Consider a collapsible panel so it doesn't clutter the main view when not in use
