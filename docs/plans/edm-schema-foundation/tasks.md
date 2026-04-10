# EDM Schema Foundation — Tasks

## Schema types (`src/schema/composition.ts`)

- [x] Add `InstrumentSourceKind` type (`'sampled' | 'synth' | 'oneshot' | 'drums'`)
- [x] Add `source` discriminator to `InstrumentDef`
- [x] Make `sample` field optional on `InstrumentDef`
- [x] Add `synth` field to `InstrumentDef` (`SynthPatch | string` — full patch or preset name)
- [x] Add `oneshots` field to `InstrumentDef` (`Record<string, string>`)
- [x] Add `SynthPatch` type (oscillator, envelope, filter, filterEnvelope, FM params)
- [x] Rename `EffectDef` → `EffectConfig`
- [x] Add `EFFECT_TYPES` const array and `EffectType` derived type (12 effect types)
- [x] Relax `EffectConfig.params` from `Record<string, number>` to `Record<string, number | string>`
- [x] Add `bypass?: boolean` to `EffectConfig`
- [x] Add `AutomationPoint` and `AutomationLane` types
- [x] Add `LFOConfig` and `ModulationRoute` types
- [x] Add `SidechainConfig` type
- [x] Add `masterEffects`, `automation`, `sidechain`, `lfos`, `modulation` optional fields to `SonicForgeComposition`

## Rename propagation

- [x] Update `src/engine/EffectsChain.ts` import from `EffectDef` → `EffectConfig`
- [x] `grep` for any other `EffectDef` references and update them (only EffectsChain.ts had one)
- [x] Bonus fallout: `Engine.getSampleMap()` skips sample-less instruments
- [x] Bonus fallout: `InstrumentLoader.loadInstruments()` throws a clear error for non-sampled non-drum instruments (synth/oneshot runtime comes in sub-epic #2/#5)
- [x] Bonus fallout: `EffectsChain` `'eq'` case → `'eq3'` to match new const array (no existing composition used `'eq'`, verified)

## Validation (`src/schema/validate.ts`)

- [x] Extract helper functions: `validateInstrument`, `validateEffect`, `validateLFOs`, `validateSidechain`, `validateModulation`, `validateAutomation`, `validateMasterEffects`, `validateMetadata`, `validateSections`, `validateInstruments`
- [x] Validate `source` discriminator is one of the four valid values
- [x] Validate instrument field presence based on `source` (`sampled` → `sample`, `synth` → `synth`, `oneshot` → `oneshots`)
- [x] Validate effect `type` is in `EFFECT_TYPES`
- [x] Validate `LFOConfig.id` uniqueness across the composition
- [x] Validate `ModulationRoute.source` references an existing LFO id
- [x] Validate `SidechainConfig.source`/`target` reference existing instrument ids
- [x] Validate `AutomationLane.target` is a non-empty string (full path resolution deferred to sub-epic #3)
- [x] Validate `AutomationPoint.curve` is one of `step | linear | exponential`
- [x] Validate `SidechainConfig.amount` is in the 0–1 range

## Tests (`src/schema/validate.test.ts`)

- [x] Backwards compat: existing `validComposition` shape still validates
- [x] Synth instrument: valid synth composition validates (preset name + inline patch variants)
- [x] Synth instrument: `source: 'synth'` without `synth` field fails
- [x] Oneshot instrument: `source: 'oneshot'` without `oneshots` field fails
- [x] Oneshot instrument: valid oneshots map validates
- [x] Source: unknown source kind rejected
- [x] Effects: unknown effect type fails
- [x] Effects: accepts all 12 supported types
- [x] LFO: duplicate LFO id fails
- [x] Modulation: route referencing unknown LFO id fails
- [x] Sidechain: unknown source/target instrument id fails
- [x] Sidechain: amount out of 0–1 range rejected
- [x] Automation: unknown curve type fails
- [x] Automation: empty target fails
- [x] Master effects: composition with `masterEffects` validates

## Checks

- [x] `pnpm test` passes (238 tests total, 23 in validate.test.ts)
- [x] `pnpm build` (TypeScript check) passes
- [x] `pnpm lint` passes
- [x] Existing compositions in `compositions/` still load (verified via temporary test against all 12 bundled compositions — all pass)
