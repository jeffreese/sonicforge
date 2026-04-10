# EDM Schema Foundation

**Sub-epic #1 of EDM Phase A.** See `../edm-sound-design-schema/spec.md` for the full architectural context, type definitions, and rationale behind every field added here.

## Scope

Schema types, validation, and tests. No runtime code — this sub-epic establishes the contract that sub-epics #2–#6 will implement against.

## In scope

- New type definitions in `src/schema/composition.ts`:
  - `InstrumentSourceKind` (discriminator)
  - `SynthPatch`, `EffectConfig`, `EFFECT_TYPES`
  - `AutomationLane`, `AutomationPoint`
  - `LFOConfig`, `ModulationRoute`
  - `SidechainConfig`
- Extended `InstrumentDef` (add `source`, `synth`, `oneshots`; make `sample` optional)
- Extended `SonicForgeComposition` (add `masterEffects`, `automation`, `sidechain`, `lfos`, `modulation`)
- Rename `EffectDef` → `EffectConfig` across the codebase (engine `EffectsChain.ts` and any other references)
- Extended validation in `src/schema/validate.ts` covering the new fields
- Co-located unit tests in `validate.test.ts`
- Backwards compatibility: every existing composition in `compositions/` must still validate without changes

## Out of scope

- `SynthInstrument` runtime implementation (sub-epic #2)
- Expanded effect factory with new Tone.js types (sub-epic #2)
- `AutomationEngine` (sub-epic #3)
- `SidechainRouter`, `ModulationEngine` (sub-epic #4)
- `OneShotInstrument` + sample commit (sub-epic #5)
- `/compose` skill update + `composition-format.md` updates (sub-epic #6)
- Any UI changes (Phase B/C)

## Done when

- [ ] All new types exported from `src/schema/composition.ts`
- [ ] `EffectDef` → `EffectConfig` rename complete; no dangling references
- [ ] `src/schema/validate.ts` validates each new field (happy path + error cases)
- [ ] All new validation rules have co-located tests
- [ ] Backwards compat verified: existing compositions in `compositions/` still validate
- [ ] `pnpm test` passes
- [ ] `pnpm build` (TypeScript check) passes
- [ ] `pnpm lint` passes

## Notes

- Why the rename: we already had `EffectDef`; the umbrella spec uses `EffectConfig`. Aligning on the spec's name.
- Why `InstrumentSourceKind` (not `InstrumentSource`): the umbrella spec uses `InstrumentSource` for both the schema string literal and the engine runtime interface. Picking `InstrumentSourceKind` for the schema to reserve the cleaner name for the engine interface in sub-epic #2.
- Why `version` stays `'1.0'`: all new fields are optional and existing compositions validate unchanged, so no version bump is required. Can be reconsidered later if the schema diverges further.
