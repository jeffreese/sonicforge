# EDM Synth Instruments + Effects Vocabulary — Tasks

Tasks extracted from `../edm-sound-design-schema/tasks.md` sections "Synth Instruments", "Effects Vocabulary", and "Engine Integration" (partial).

## Synth Instruments

- [ ] Create `src/engine/SynthInstrument.ts` implementing the `InstrumentSource` runtime interface
- [ ] Support `mono`, `poly`, `fm`, `am`, `duo`, `pluck` synth types via Tone.js
- [ ] Wire `oscillator`, `envelope`, `filter`, `filterEnvelope` patch params to Tone.js synth construction
- [ ] Create `src/engine/synth-presets.ts` with starter preset library (10–15 patches)
- [ ] Resolve preset name → patch in `SynthInstrument` constructor (allow inline patches too)
- [ ] Update `InstrumentLoader` to dispatch on `source` field
- [ ] Unit tests for `SynthInstrument` construction, preset resolution, disposal
- [ ] Verify synth instruments play through the existing effects chain + mixer

## Effects Vocabulary

- [ ] Create `src/engine/effect-factory.ts` — factory function mapping `EffectConfig` → Tone.js effect node
- [ ] Support all v1 effects: reverb, delay, pingpong, chorus, phaser, distortion, bitcrusher, autofilter, compressor, limiter, eq3, stereowidener
- [ ] Refactor existing `EffectsChain` to use the factory
- [ ] Add master bus effects chain in `Engine.ts` (applied between mix bus output and `Tone.Destination`)
- [ ] Wire `composition.masterEffects` to the master bus chain
- [ ] Unit tests for factory (each effect type constructs without error, params apply correctly)

## Checks

- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] Manual: load an existing sampled composition, verify unchanged playback
- [ ] Manual: create a test composition with a synth lead, verify it plays
