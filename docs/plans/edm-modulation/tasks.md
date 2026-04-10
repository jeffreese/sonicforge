# EDM Sidechain + LFO Modulation — Tasks

Tasks extracted from `../edm-sound-design-schema/tasks.md` sections "Sidechain Compression" and "LFO Modulation".

## Sidechain Compression

- [ ] Create `src/engine/SidechainRouter.ts`
- [ ] For each `SidechainConfig`, create `Tone.Follower` tapped off source post-fader
- [ ] Route follower output through a gain-subtraction node on the target signal path
- [ ] Respect `amount`, `attack`, `release` params
- [ ] Wire into `Engine.ts` load/dispose lifecycle
- [ ] Unit tests for single-source-single-target routing, multiple targets, disposal

## LFO Modulation

- [ ] Create `src/engine/ModulationEngine.ts`
- [ ] Create `Tone.LFO` instance for each `LFOConfig` entry
- [ ] Resolve modulation route targets using the same resolver as automation (from sub-epic #3)
- [ ] Scale LFO output by `amount` before connecting to target signal
- [ ] Start LFOs on play, stop on stop, dispose on unload
- [ ] Unit tests for LFO construction, routing, lifecycle

## Checks

- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Manual: test composition with kick → pad sidechain, verify pumping
- [ ] Manual: test composition with LFO → filter cutoff, verify wobble
