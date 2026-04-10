# EDM Synth Instruments + Effects Vocabulary

**Sub-epic #2 of EDM Phase A.** See `../edm-sound-design-schema/spec.md` for architectural context.

## Scope

First audible EDM capability. Implements the runtime side of synth instruments and the full effect factory so a composition can use synth leads, synth bass, and the broader effect vocabulary.

## In scope

- `src/engine/SynthInstrument.ts` — wraps Tone.js synths, implements the `InstrumentSource` runtime interface
- `src/engine/synth-presets.ts` — starter preset library (10–15 patches: `reese_bass`, `wobble_bass`, `supersaw_lead`, `pluck_lead`, `warm_pad`, `fm_bell`, etc.)
- `src/engine/effect-factory.ts` — factory mapping `EffectConfig` → Tone.js effect node, supports all 12 v1 effects
- Refactor existing `EffectsChain` to use the factory
- Add master bus effects chain in `Engine.ts` (between mix bus output and `Tone.Destination`)
- Wire `composition.masterEffects` to the master bus chain
- Update `InstrumentLoader` to dispatch on `source` field (`'synth'` → `SynthInstrument`, `'sampled'` → `MultiLayerSampler`, etc.)
- Unit tests for factory, preset resolution, disposal

## Depends on

- Sub-epic #1 (schema foundation) must be merged first

## Out of scope

- Automation (sub-epic #3)
- LFO/sidechain (sub-epic #4)
- One-shot samples (sub-epic #5)

## Done when

- [ ] A composition with `source: 'synth'` on an instrument plays correctly
- [ ] All 12 effects construct without error when used in a composition
- [ ] `composition.masterEffects` is applied to the master bus
- [ ] Existing sampled compositions still play unchanged
- [ ] `pnpm test` passes

See `../edm-sound-design-schema/tasks.md` sections "Synth Instruments", "Effects Vocabulary", and "Engine Integration" for the full task list.
