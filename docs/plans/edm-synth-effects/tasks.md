# EDM Synth Instruments + Effects Vocabulary — Tasks

Tasks extracted from `../edm-sound-design-schema/tasks.md` sections "Synth Instruments", "Effects Vocabulary", and "Engine Integration" (partial).

## Synth Instruments

- [x] Create `src/engine/SynthInstrument.ts` implementing the `InstrumentSource` runtime interface
- [x] Support `mono`, `poly`, `fm`, `am`, `duo`, `pluck` synth types via Tone.js
- [x] Wire `oscillator`, `envelope`, `filter`, `filterEnvelope` patch params to Tone.js synth construction
- [x] Create `src/engine/synth-presets.ts` with starter preset library (14 patches across bass/lead/pad/pluck roles)
- [x] Resolve preset name → patch in `SynthInstrument` constructor (allow inline patches too)
- [x] Add `polyphony?: boolean` field to `SynthPatch` as an explicit override for each type's default
- [x] Update `InstrumentLoader` to dispatch on `source` field (`'synth'` → `SynthInstrument`)
- [x] Unit tests for `SynthInstrument` helpers (resolvePatch, defaultPolyphony, buildSynthOptions) + preset library
- [ ] Manual verification: synth instruments play through the existing effects chain + mixer (browser test)

## Effects Vocabulary

- [x] Create `src/engine/effect-factory.ts` — factory function mapping `EffectConfig` → Tone.js effect node
- [x] Support all v1 effects: reverb, delay, pingpong, chorus, phaser, distortion, bitcrusher, autofilter, compressor, limiter, eq3, stereowidener
- [x] Refactor existing `EffectsChain` to use the factory (no more switch statement in EffectsChain)
- [x] Honor `bypass: true` on effect configs
- [x] Add master bus effects chain in `Engine.ts` (applied between mix bus output and `Tone.Destination`)
- [x] Wire `composition.masterEffects` to the master bus chain
- [x] Expose `MixBus.getMaster()` for Engine to route the master signal through master effects
- [x] Unit tests for factory (each type maps to the expected Tone class, params pass through, defaults applied)

## Checks

- [x] `pnpm test` passes (265 tests, 27 new across effect-factory + SynthInstrument + synth-presets)
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [ ] Manual: load an existing sampled composition, verify unchanged playback (browser smoke test)
- [ ] Manual: create a test composition with a synth lead, verify it plays through the new SynthInstrument path (browser smoke test)

## Notes

- Tone.js audio nodes can't construct under jsdom (no real `AudioContext`), so tests use `vi.mock('tone', ...)` to stub the classes or test pure helpers only. End-to-end integration is verified in the browser.
- `BitCrusher` is an AudioWorklet-based effect with a different API — `wet` is set on the instance after construction, not in options.
- DuoSynth and PluckSynth don't wrap cleanly in `Tone.PolySynth`; their `polyphony` flag is ignored. Compositions needing polyphonic plucks should use `type: 'poly'` with a plucky envelope/oscillator combo.
