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

## Phase 3: Claude Integration

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

- URL parameter loading (`?load=compositions/demo.json`)
- Loading progress indicators
- Section looping
- Chord shorthand expansion in schema
- Self-hosted sample upgrades for key instruments

_Note: Drag-and-drop loading and spacebar play/pause were completed in Phase 1._
