# EDM Parameter Automation — Tasks

Tasks extracted from `../edm-sound-design-schema/tasks.md` section "Automation Engine".

## Schema amendment (motivated by target disambiguation)

- [x] Add `EffectConfig.id?: string` for stable effect identifiers
- [x] Validation enforces unique effect ids within a single chain
- [x] `EffectsChain` tracks effects by id + type, exposes `getEffect(idOrType)`

## Engine

- [x] Create `src/engine/automation-targets.ts` — target path resolver
- [x] Support path shapes: track volume/pan, per-instrument effect params (by id or type), master effect params
- [x] Create `src/engine/AutomationEngine.ts`
- [x] `compile(lanes, metadata, registry)` — resolve targets, compile points to absolute seconds, skip unresolvable lanes with a warning
- [x] `scheduleFromCurrentPosition()` — cancels prior scheduled values, anchors each lane's param to its interpolated value at current transport position, schedules remaining points as absolute AudioContext times
- [x] Schedule points using `setValueAtTime` / `linearRampToValueAtTime` / `exponentialRampToValueAtTime`
- [x] Clamp exponential ramp targets to `1e-5` (Web Audio API rejects zero/negative)
- [x] `stop()` — cancels all scheduled values
- [x] Handle time conversion from `"bar:beat:sixteenth"` strings and numeric absolute beats
- [x] Wire into `Engine.ts` play/stop/pause/seek/dispose lifecycle
- [x] `chainsByInstrument` map on Engine so the target registry can find per-instrument chains by id

## Tests

- [x] Unit tests for `automation-targets` resolver (12 cases: each path shape + error paths)
- [x] Unit tests for `AutomationEngine` (14 cases: compile, fresh-start scheduling, mid-lane seek, seek anchoring, step/linear/exponential curves, clamping, stop, numeric time inputs)
- [x] 5 new validate.test.ts cases for `EffectConfig.id` (accepted, duplicates rejected, empty rejected, cross-chain reuse, masterEffects uniqueness)
- [x] Target resolver tests verify id-first then type-fallback lookup order

## Demo composition

- [x] `compositions/sweepdrone.json` — 8-bar piece exercising every automation path shape and curve type (track volume linear ramp, effect-by-id linear ramp, track pan step flip, master limiter exponential ramp)

## Checks

- [x] `pnpm test` passes (296 tests total, 31 new across automation-targets + AutomationEngine + validate id tests)
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] Manual: `compositions/sweepdrone.json` plays correctly in the browser — volume swell, reverb bloom, pan flip, and limiter crush all audible end-to-end

## Notes

- Synth-internal filter/envelope params (e.g. `"bass.filter.cutoff"`) are intentionally deferred to sub-epic #4, which needs the same infrastructure for LFO modulation targets. That sub-epic will extend `resolveTarget` to walk into SynthInstrument internals.
- AutomationEngine mocks Tone.now() and Tone.getTransport() via vi.hoisted in tests — jsdom can't schedule real audio param events, so we verify the scheduling math without an AudioContext.
- "First-match by type" lookup behavior: if an author has multiple effects of the same type in one chain and doesn't give them ids, automation targets the first. Validator doesn't warn (deliberately — the behavior is documented and deterministic). Adding an id makes targeting explicit.
