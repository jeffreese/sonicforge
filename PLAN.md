# SonicForge Implementation Plan

## Phase 1: Minimum Playable Product (COMPLETE)

1. Project scaffolding (`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`)
2. `src/schema/composition.ts` — Types
3. `src/schema/validate.ts` — Runtime validation
4. `src/engine/InstrumentLoader.ts` — CDN sample loading → Tone.Sampler
5. `src/engine/Transport.ts` — Tone.Transport wrapper
6. `src/engine/TrackPlayer.ts` — Note scheduling
7. `src/engine/Engine.ts` — Orchestrator
8. `src/ui/TransportBar.ts` — Play/pause/stop
9. `src/ui/CompositionLoader.ts` — Paste JSON
10. `src/ui/App.ts` + `src/main.ts` — Bootstrap
11. `src/ui/styles.css` — Basic styling
12. `compositions/demo-ballad.json` — Hand-crafted test composition
13. `CLAUDE.md` — Project documentation

## Phase 2: Visualization & Mixing

14. `src/ui/Timeline.ts` — Section × track grid with playhead
15. `src/ui/Mixer.ts` — Per-track volume/pan/mute/solo
16. `src/engine/MixBus.ts` — Channel routing
17. `src/engine/EffectsChain.ts` — Reverb, delay, etc.

## Phase 3: Claude Integration

18. `.claude/rules/composition-format.md` — Schema rules + GM instrument list
19. `.claude/rules/music-theory.md` — Musical quality guidelines
20. `.claude/skills/compose/SKILL.md` — /compose skill
21. `.claude/skills/iterate/SKILL.md` — /iterate skill
22. `.claude/skills/play/SKILL.md` — /play skill
23. `.claude/skills/explain/SKILL.md` — /explain skill

## Phase 4: Polish

- URL parameter loading (`?load=compositions/demo.json`)
- Loading progress indicators
- Section looping
- Chord shorthand expansion in schema
- Self-hosted sample upgrades for key instruments

_Note: Drag-and-drop loading and spacebar play/pause were completed in Phase 1._
