# EDM Schema Foundation — Tasks

## Schema types (`src/schema/composition.ts`)

- [ ] Add `InstrumentSourceKind` type (`'sampled' | 'synth' | 'oneshot' | 'drums'`)
- [ ] Add `source` discriminator to `InstrumentDef`
- [ ] Make `sample` field optional on `InstrumentDef`
- [ ] Add `synth` field to `InstrumentDef` (`SynthPatch | string` — full patch or preset name)
- [ ] Add `oneshots` field to `InstrumentDef` (`Record<string, string>`)
- [ ] Add `SynthPatch` type (oscillator, envelope, filter, filterEnvelope, FM params)
- [ ] Rename `EffectDef` → `EffectConfig`
- [ ] Add `EFFECT_TYPES` const array and `EffectType` derived type (12 effect types)
- [ ] Relax `EffectConfig.params` from `Record<string, number>` to `Record<string, number | string>`
- [ ] Add `bypass?: boolean` to `EffectConfig`
- [ ] Add `AutomationPoint` and `AutomationLane` types
- [ ] Add `LFOConfig` and `ModulationRoute` types
- [ ] Add `SidechainConfig` type
- [ ] Add `masterEffects`, `automation`, `sidechain`, `lfos`, `modulation` optional fields to `SonicForgeComposition`

## Rename propagation

- [ ] Update `src/engine/EffectsChain.ts` import from `EffectDef` → `EffectConfig`
- [ ] `grep` for any other `EffectDef` references and update them

## Validation (`src/schema/validate.ts`)

- [ ] Extract helper functions: `validateInstrument`, `validateEffect`, `validateLFO`, `validateSidechain`, `validateModulationRoute`, `validateAutomationLane`
- [ ] Validate `source` discriminator is one of the four valid values
- [ ] Validate instrument field presence based on `source` (`sampled` → `sample`, `synth` → `synth`, `oneshot` → `oneshots`)
- [ ] Validate effect `type` is in `EFFECT_TYPES`
- [ ] Validate `LFOConfig.id` uniqueness across the composition
- [ ] Validate `ModulationRoute.source` references an existing LFO id
- [ ] Validate `SidechainConfig.source`/`target` reference existing instrument ids
- [ ] Validate `AutomationLane.target` is a non-empty string (full path resolution deferred to sub-epic #3)
- [ ] Validate `AutomationPoint.curve` is one of `step | linear | exponential`

## Tests (`src/schema/validate.test.ts`)

- [ ] Backwards compat: existing `validComposition` shape still validates
- [ ] Synth instrument: valid synth composition validates
- [ ] Synth instrument: `source: 'synth'` without `synth` field fails
- [ ] Oneshot instrument: `source: 'oneshot'` without `oneshots` field fails
- [ ] Effects: unknown effect type fails
- [ ] Effects: accepts all 12 supported types
- [ ] LFO: duplicate LFO id fails
- [ ] Modulation: route referencing unknown LFO id fails
- [ ] Sidechain: unknown source/target instrument id fails
- [ ] Automation: unknown curve type fails
- [ ] Master effects: composition with `masterEffects` validates

## Checks

- [ ] `pnpm test` passes
- [ ] `pnpm build` (TypeScript check) passes
- [ ] `pnpm lint` passes
- [ ] Existing compositions in `compositions/` still load (manual check: run validate against each)
