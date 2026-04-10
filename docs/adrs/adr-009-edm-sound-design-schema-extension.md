---
title: "ADR-009: EDM Sound Design via Schema Extension"
date: 2026-04-10
status: accepted
---

# ADR-009: EDM Sound Design via Schema Extension

## Status

Accepted

## Context

Before EDM Phase A, SonicForge sounded like a notation playback tool: every instrument was a sampled acoustic one, played note-for-note. The defining sonic characteristics of electronic music — synthesis, effects, parameter automation, sidechain compression, LFO modulation, fixed-pitch one-shots — were absent from both the engine and the composition format.

We needed to add these capabilities without breaking existing compositions, without creating a parallel "production mode" that diverged from the notation format, and without making the schema so large that Claude's `/compose` skill couldn't emit it reliably.

## Decision

**Extend the existing `SonicForgeComposition` schema with optional fields dispatched by an `InstrumentDef.source` discriminator.** One data model, backwards-compatible, Claude-composable.

Concretely:

- **`source: 'sampled' | 'synth' | 'oneshot' | 'drums'`** on `InstrumentDef` (optional, defaults to `'sampled'`). The engine's `InstrumentLoader` dispatches on this field: `sampled` → `MultiLayerSampler`, `synth` → `SynthInstrument`, `oneshot` → `OneShotInstrument`, `drums` → synthesized `DrumKit`.
- **New optional fields on `InstrumentDef`**: `synth` (a `SynthPatch` or preset name), `oneshots` (hit name → URL map). `sample` becomes optional — required only when `source === 'sampled'`.
- **New optional composition-level fields**: `masterEffects[]` (master bus processing), `automation[]` (parameter ramps over transport time), `lfos[]` + `modulation[]` (LFO instances and routes), `sidechain[]` (envelope-follower ducking).
- **Effect vocabulary expanded** from 6 to 12 types via a single `EFFECT_TYPES` const array. `EffectConfig` replaces the old `EffectDef`; gets a new optional `id` field for stable automation targeting.
- **New `LoadedInstrument.mode: 'pitched' | 'drum' | 'oneshot'`** discriminator (replacing the old `isDrum` boolean) so `TrackPlayer` can route hit names correctly per instrument type.

Every new field is optional. Every existing composition continues to validate and play unchanged.

## Alternatives Considered

### A separate "production format" (rejected)

Create a second schema — `ProductionJSON` — for EDM work. Existing compositions stay on the notation format.

- **Pros:** Clean separation of concerns. No risk of "EDM bloat" polluting the notation format.
- **Cons:**
  - Two formats Claude has to learn, two validators to maintain, two loader paths in the engine.
  - Hybrid compositions (acoustic melody + synth bass + oneshot drums) become awkward to express — which format wins?
  - Diverges from the single-source-of-truth principle: `composition.ts` is the contract.
  - The core schema (sections, tracks, notes, timing) is the same for both; duplication would be wasteful.

### An in-schema "mode" flag at the composition level (rejected)

One field: `composition.mode: 'notation' | 'production'`. Flips behavior of the engine and the skill.

- **Pros:** Single format with a mode switch.
- **Cons:**
  - Mode flips are worse than per-instrument discriminators: you can't mix notation-style and production-style instruments in one piece.
  - The engine would need conditional logic everywhere, rather than dispatching cleanly on a per-instrument property.

### Extend per-instrument without a discriminator (rejected)

Let any instrument have any combination of `sample`, `synth`, `oneshots`, and infer the type from which field is set.

- **Pros:** No new enum, fewer schema fields.
- **Cons:**
  - Ambiguous if multiple fields are set — which one wins? Validators have to define precedence.
  - Claude and human authors have to infer the semantics from field presence rather than reading the explicit discriminator.
  - Future instrument types (wavetable synthesis, granular samplers, external audio buses) would need to find another way to mark themselves.

The `source` discriminator is the "extension point" for future instrument types without requiring schema-wide refactors.

## Consequences

### Positive

- **Backwards compatibility:** every pre-Phase-A composition validates and plays unchanged. All 238 tests at start of Phase A are still passing at the end.
- **One data model to reason about.** The compose skill, the validator, the engine, and the UI all read the same interface.
- **Hybrid compositions work naturally.** A single piece can mix sampled piano, a synthesized wobble bass, oneshot trap drums, and a master-bus limiter. The `source` discriminator makes this explicit and well-defined per instrument.
- **The schema doubled in surface area but stayed coherent.** The new fields group logically: per-instrument fields stay on `InstrumentDef`, modulation/automation fields live at the composition level where they can reference anything.
- **Dispatch is explicit.** `InstrumentLoader` is a switch on `source`. `TrackPlayer` is a switch on `LoadedInstrument.mode`. Neither file has to know about specific instrument implementations — just the discriminator.

### Negative

- **The schema is larger.** Sub-epic #1 added 13 new types. The `composition.ts` file grew from ~58 lines to ~140. This is a real cost for Claude's context budget during composition generation — mitigated by the path-scoped `composition-format.md` rule and the conditional loading of EDM reference docs in `/compose` (only when the request is EDM-ish).
- **The `isDrum` → `mode` refactor** (caught during sub-epic #5 browser verification) touched every site that constructed a `LoadedInstrument`. Worth it for correctness but a reminder that boolean discriminators don't scale when a third state appears.
- **PolySynth internals aren't modulatable from outside.** Wobble bass must use `type: 'mono'` or `polyphony: false`. This is a Tone.js architecture constraint, not our choice, but it shapes how compositions express the wobble-bass pattern.
- **Dispatch precedence matters.** The loader checks `source` before `category === 'drums'` so a drum-category instrument can opt into `source: 'oneshot'`. This ordering is tested but easy to get wrong if more source types are added.
- **Automation on dB-ranged params requires linear curves.** Exponential ramps reject non-positive values; the engine falls back to linear for ≤ 0 targets, but authors should use linear explicitly on volume/threshold/pan. Documented in `modulation-patterns.md`.

## Related Decisions

- ADR-005: Integrated timeline/editor — the canvas that renders these compositions
- Phase B (future): visual automation lane drawing, preset save/load UI, synth parameter editors

## Sub-epic paper trail

EDM Phase A shipped as six reviewable sub-epic PRs plus a one-line hotfix:

| # | Sub-epic | PR |
|---|----------|-----|
| 1 | edm-schema-foundation | #29 |
| 2 | edm-synth-effects | #30 |
| 3 | edm-automation | #31 |
| (hotfix) | exponential ramp negative values | #32 |
| 4 | edm-modulation (sidechain + LFO) | #33 |
| 5 | edm-oneshots | #34 |
| 6 | edm-compose-skill | (this PR) |

Each sub-epic built on a merged, stable base — slicing at architectural boundaries rather than timeboxes. The schema foundation had to land first because every other sub-epic depends on types it introduced; the compose skill had to land last because it describes capabilities that need to already exist.
