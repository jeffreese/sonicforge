# EDM Sidechain + LFO Modulation — Tasks

Tasks extracted from `../edm-sound-design-schema/tasks.md` sections "Sidechain Compression" and "LFO Modulation".

## Target resolver extension (sub-epic #4 commit 1)

- [x] `SynthInstrument.getInnerSynth()` — returns inner Tone.js synth node for mono voices; null for PolySynth
- [x] `AutomationTargetRegistry.getInstrumentSynthNode(id)` — registry adds synth-node lookup
- [x] `resolveTarget` extended with synth-internal property walking as a fallback after effect lookup
- [x] Exported `walkPath` helper so ModulationEngine can reuse the traversal
- [x] Engine builds `getInstrumentSynthNode` as a closure over loaded instruments, duck-typing `.getInnerSynth`

## Sidechain Compression

- [x] Create `src/engine/SidechainRouter.ts`
- [x] `prepareTargets(configs)` — creates one `Tone.Gain(1)` per unique target instrument; Engine uses these as effects-chain terminals so the ducking gain sits between the effects chain and the mix bus channel
- [x] `connectSources(configs, instruments, mixBus)` — for each config: tap source channel → `Tone.Follower` → `Tone.Multiply(-amount)` → target gain's `.gain` signal. Respects custom `release` (used as follower smoothing time); `attack` is accepted for forward compat but not separately applied (Tone.Follower v15 takes a single smoothing time)
- [x] Warn-and-skip policy for unknown sources or targets
- [x] Multiple sidechain configs targeting the same instrument share a single ducking gain
- [x] Wire into `Engine.ts` load (two phases: prepareTargets before chain build, connectSources after) and dispose lifecycle
- [x] Unit tests for single-source-single-target, multi-source-shared-target, custom release, defaults, error paths, disposal

## LFO Modulation

- [x] Create `src/engine/ModulationEngine.ts`
- [x] Create `Tone.LFO` instance for each `LFOConfig` entry (`compile` method)
- [x] Resolve modulation route targets using `resolveTarget` (the same resolver as AutomationEngine, including synth-internal paths)
- [x] Scale LFO output by `amount` via `Tone.Multiply` before connecting to target signal (default amount 1 = direct pass-through)
- [x] Warn-and-skip on unknown LFO source or unresolvable target path
- [x] Duplicate LFO id detected and ignored with a warning
- [x] Start LFOs on play, stop on stop/pause, dispose on unload
- [x] Unit tests for LFO construction, route resolution, amount scaling, lifecycle, error paths

## Engine integration

- [x] Engine instantiates `SidechainRouter` and `ModulationEngine` alongside `AutomationEngine`
- [x] `load()`:
  - sidechain phase 1 (prepareTargets) before per-instrument chain build
  - per-instrument chain routes through ducking gain when instrument is a target
  - sidechain phase 2 (connectSources) after chains are wired
  - modulation compile against the full target registry
- [x] `play()` starts the modulation engine
- [x] `pause()` / `stop()` stops the modulation engine
- [x] `dispose()` disposes all three engines (automation, modulation, sidechain)

## Tests

- [x] 7 new cases in `SynthInstrument.test.ts` covering `getInnerSynth()` across all synth types (mono/duo/pluck/fm-mono return non-null; poly/fm/am default return null; inner filter exposes a Tone.Param)
- [x] 7 new cases in `automation-targets.test.ts` covering synth-internal paths, walking non-Tone properties, PolySynth null case, and effect-first fallback ordering
- [x] 10 cases in `SidechainRouter.test.ts` (prepareTargets, shared targets, connectSources wiring, custom release, defaults, error paths, multi-source-multi-target, disposal)
- [x] 10 cases in `ModulationEngine.test.ts` (compile, LFO creation, duplicate id, amount scaling, direct connect, error paths, lifecycle)

## Demo composition

- [x] `compositions/wobblepump.json` — 8-bar dubstep-ish groove in E minor exercising both sub-epic #4 capabilities:
  - **Wobble bass** — mono synth with LFO at `8n` rate modulating `bass.filter.frequency` between 120 Hz and 2 kHz (synth-internal target path)
  - **Kick-to-pad sidechain** — `amount: 0.85` with `release: 0.1` for clear pumping
  - **Kick-to-stab sidechain** — secondary sidechain target sharing the same kick source, `amount: 0.6`
  - Tests: synth-internal resolver, LFO → target wiring, sidechain phase 1/2, multi-source shared/multi-target, the full Engine lifecycle integration
- [x] Validates cleanly against the schema

## Checks

- [x] `pnpm test` passes (332 tests, 33 new across commits 1 and 2)
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [ ] Manual: load `compositions/wobblepump.json` in the browser, verify the wobble bass filter sweeps audibly and the pad/stab pump under the kick

## Notes

- **PolySynth limitation (documented):** `Tone.PolySynth` manages N voices internally with no shared-voice filter Signal, so modulation targeting a PolySynth's filter returns null from the resolver and the route is skipped with a warning. Compositions that want LFO on a filter must use `type: 'mono'` (or `polyphony: false` on fm/am). This matches the natural wobble-bass pattern where bass is intrinsically mono.
- **Tone.Follower smoothing:** Tone.js v15's `Tone.Follower` accepts a single smoothing time, not separate attack/release. We use `release` for smoothing since release time is what controls pumping feel; the schema's `attack` is accepted for forward compat but not separately applied in v1. Can be revisited if Tone.js ever exposes a follower with split attack/release.
