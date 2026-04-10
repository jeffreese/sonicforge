# EDM Sidechain + LFO Modulation

**Sub-epic #4 of EDM Phase A.** See `../edm-sound-design-schema/spec.md` for architectural context.

## Scope

The two genre-defining modulation techniques for EDM: sidechain compression (the "pumping" effect) and LFO modulation (wobble bass, filter LFOs, tremolo).

## In scope

- `src/engine/SidechainRouter.ts` — creates `Tone.Follower` on source, routes to gain subtraction on target
- `src/engine/ModulationEngine.ts` — creates `Tone.LFO` instances, resolves routes to parameters, starts/stops with playback
- Share the target path resolver with `AutomationEngine` (sub-epic #3) — refactor out if needed
- Wire into `Engine.ts` load/dispose lifecycle
- Unit tests for routing, disposal, lifecycle

## Depends on

- Sub-epic #1 (schema foundation) — `SidechainConfig`, `LFOConfig`, `ModulationRoute` types
- Sub-epic #2 (synth + effects) — needed for any non-trivial target paths

## Out of scope

- Manual automation (sub-epic #3)
- UI for modulation editing (Phase C)

## Done when

- [ ] A composition with sidechain ducking from kick to pad correctly pumps the pad during kicks
- [ ] A composition with an LFO routed to a synth filter cutoff creates a wobble effect
- [ ] LFOs start on play, stop on stop, dispose on unload
- [ ] `pnpm test` passes

See `../edm-sound-design-schema/tasks.md` sections "Sidechain Compression" and "LFO Modulation" for the full task list.
