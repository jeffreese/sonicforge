# EDM Macro UI — Phase C: Tasks

(Full task breakdown pending — this plan will be refined when Phase A is closer to shipping. The items below are placeholders at epic-level granularity.)

## Inspector Panel

- [ ] Create `<sf-instrument-inspector>` Lit component
- [ ] Wire to CompositionStore + selected track state
- [ ] Layout: instrument name, source, preset name, macro row, effects summary, automation summary

## Knob Component

- [ ] Create `<sf-knob>` Lit component with drag/scroll/keyboard/reset
- [ ] Design token styling
- [ ] Tests: interaction, value clamping, accessibility

## Macro System

- [ ] Define macro schema (param mappings per preset)
- [ ] Extend synth preset library with macro definitions
- [ ] Resolver: macro value (0–1) → underlying Tone.js param updates
- [ ] Store `macros` field on InstrumentDef (persists in composition JSON)

## Real-Time Patch Updates

- [ ] `Engine.updateInstrumentPatch(id, patch)` method
- [ ] Apply patch to live Tone.js nodes without re-load
- [ ] `CompositionStore.dispatch('updateInstrumentMacros', ...)` command

## Preset Store

- [ ] `src/engine/preset-store.ts` — localStorage + bundled preset loading
- [ ] Save/load UI in inspector
- [ ] Bundled preset library (10–20 patches covering common EDM roles)

## Summaries (Read-Only)

- [ ] Effects summary display (placeholder for Phase B editor)
- [ ] Automation summary display (placeholder for Phase B editor)

## Verification

- [ ] Round-trip test: save preset, load into different instrument, verify same sound
- [ ] Round-trip test: edit macros, save composition, reload, verify macros persist
- [ ] Real-time audition works during playback
