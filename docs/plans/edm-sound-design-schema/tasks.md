# EDM Sound Design — Phase A: Tasks

## Schema Foundation

- [ ] Add `InstrumentSource` type and `source` discriminator to `InstrumentDef` in `src/schema/composition.ts`
- [ ] Add `SynthPatch` type covering oscillator, envelope, filter, filterEnvelope, FM params
- [ ] Add `EffectConfig` type with `type`, `params`, `bypass`
- [ ] Add `AutomationLane` and `AutomationPoint` types
- [ ] Add `LFOConfig` and `ModulationRoute` types
- [ ] Add `SidechainConfig` type
- [ ] Add `oneshots` field to `InstrumentDef` (mapping hit name → sample URL)
- [ ] Add `masterEffects`, `automation`, `sidechain`, `lfos`, `modulation` fields to `SonicForgeComposition`
- [ ] Update `src/schema/validate.ts` to validate new fields (target paths, LFO id uniqueness, preset names exist, etc.)
- [ ] Unit tests for new schema validation

## Synth Instruments

- [ ] Create `src/engine/SynthInstrument.ts` implementing `InstrumentSource` interface
- [ ] Support `mono`, `poly`, `fm`, `am`, `duo`, `pluck` synth types via Tone.js
- [ ] Wire `oscillator`, `envelope`, `filter`, `filterEnvelope` patch params to Tone.js synth construction
- [ ] Create `src/engine/synth-presets.ts` with starter preset library (10–15 patches)
- [ ] Resolve preset name → patch in `SynthInstrument` constructor (allow inline patches too)
- [ ] Update `InstrumentLoader` to dispatch on `source` field: `sampled` → `MultiLayerSampler`, `synth` → `SynthInstrument`, `oneshot` → `OneShotInstrument`, `drums` → `DrumKit`
- [ ] Unit tests for `SynthInstrument` construction, preset resolution, disposal
- [ ] Verify synth instruments play through the existing effects chain + mixer

## Effects Vocabulary

- [ ] Create `src/engine/effect-factory.ts` — factory function mapping `EffectConfig` to Tone.js effect nodes
- [ ] Support all v1 effects: reverb, delay, pingpong, chorus, phaser, distortion, bitcrusher, autofilter, compressor, limiter, eq3, stereowidener
- [ ] Refactor existing `EffectsChain` to use the factory
- [ ] Add master bus effects chain in `Engine.ts` (applied between mix bus output and `Tone.Destination`)
- [ ] Wire `composition.masterEffects` to the master bus chain
- [ ] Unit tests for factory (each effect type constructs without error, params apply correctly)

## Automation Engine

- [ ] Create `src/engine/AutomationEngine.ts`
- [ ] Target path resolver: parse `"bass.filter.cutoff"` → reference to `Tone.Signal`/`Tone.Param`
- [ ] Schedule points on play using `setValueAtTime` / `linearRampToValueAtTime` / `exponentialRampToValueAtTime`
- [ ] Cancel scheduled values on stop/seek
- [ ] Handle time conversion from `"bar:beat:sixteenth"` strings using existing timing utilities
- [ ] Wire into `Engine.ts` play/stop/seek lifecycle
- [ ] Unit tests for target resolution, point scheduling, stop cleanup

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
- [ ] Resolve modulation route targets using the same resolver as automation
- [ ] Scale LFO output by `amount` before connecting to target signal
- [ ] Start LFOs on play, stop on stop, dispose on unload
- [ ] Unit tests for LFO construction, routing, lifecycle

## One-Shot Samples

- [ ] Create `src/engine/OneShotInstrument.ts` implementing `InstrumentSource`
- [ ] Load each sample URL into a `Tone.Player`
- [ ] `triggerAttackRelease(hitName, ...)` looks up the matching player and triggers it
- [ ] Velocity scales player volume (dB conversion)
- [ ] All players share an output `Tone.Gain` that serves as the instrument's node
- [ ] Source CC0-licensed one-shot samples (kicks, snares, hats, claps, fx) from Freesound.org
- [ ] Commit bundled samples to `public/samples/oneshots/` (~1MB total)
- [ ] Add `LICENSE.md` or attribution file listing sample sources
- [ ] Unit tests for `OneShotInstrument` loading, triggering, velocity scaling, disposal

## Engine Integration

- [ ] Update `Engine.ts` to instantiate `AutomationEngine`, `SidechainRouter`, `ModulationEngine` on composition load
- [ ] Verify signal flow order: source → effects → mix bus → sidechain ducking → master bus → master effects → destination
- [ ] Update `dispose()` to clean up all new modules
- [ ] Update `EngineState` transitions if needed
- [ ] Integration test: load a composition with every new feature, verify it plays and disposes cleanly

## Compose Skill

- [ ] Update `~/.claude/commands/compose.md` (or plugin equivalent) with EDM awareness
- [ ] Document available synth presets, effects, and one-shot hit names in a rule file
- [ ] Document automation / sidechain / LFO patterns with common EDM examples (buildup sweep, drop sidechain, wobble bass)
- [ ] Add genre hint parameter to `/compose` ("house", "techno", "dubstep", "trap", "future bass", "ambient")
- [ ] Create 2–3 bundled EDM example compositions in `compositions/examples/edm/`
  - [ ] House track with sidechain pad, synth bass, 4-on-the-floor kick
  - [ ] Dubstep track with wobble bass (LFO mod), filter sweep on drop, trap snare
  - [ ] Future bass track with supersaw lead, pluck bass, automation
- [ ] Generate test compositions via `/compose` to validate the skill update

## Documentation

- [ ] Update `CLAUDE.md` with overview of new instrument source types and schema capabilities
- [ ] Add ADR: "EDM sound design via schema extension, not new data model"
- [ ] Document preset library and available effects in `docs/` (reference for Claude + humans)

## Verification

- [ ] Load every example composition (existing + new EDM) and verify they play correctly
- [ ] Verify backwards compat: old compositions load with no changes
- [ ] Verify cross-mixing: a composition with both sampled acoustic instruments and synth instruments plays correctly
- [ ] Performance check: CPU usage during EDM playback stays reasonable
