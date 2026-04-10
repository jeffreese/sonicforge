# EDM Parameter Automation

**Sub-epic #3 of EDM Phase A.** See `../edm-sound-design-schema/spec.md` for architectural context.

## Scope

Parameter automation over time — the core building block for filter sweeps, volume rides, effect wet sweeps, and other EDM-signature moves.

## In scope

- `src/engine/AutomationEngine.ts` — schedules and cancels parameter changes
- Target path resolver: parse dotted paths like `"bass.filter.cutoff"` → reference to `Tone.Signal` / `Tone.Param`
- Schedule points on play using `setValueAtTime` / `linearRampToValueAtTime` / `exponentialRampToValueAtTime`
- Cancel scheduled values on stop/seek
- Time conversion from `"bar:beat:sixteenth"` strings using existing timing utilities
- Wire into `Engine.ts` play/stop/seek lifecycle
- Unit tests for target resolution, point scheduling, stop cleanup

## Depends on

- Sub-epic #1 (schema foundation) — `AutomationLane` and `AutomationPoint` types
- Sub-epic #2 (synth + effects) — needed for any non-trivial target paths (filter cutoff, effect params)

## Out of scope

- Drawing automation curves in the UI (Phase B)
- Sidechain / LFO modulation (sub-epic #4 — different modulation source, same target resolver)

## Done when

- [ ] A composition with an `automation` lane targeting a synth filter cutoff correctly sweeps the filter during playback
- [ ] Seeking cancels and reschedules pending automation points
- [ ] Stopping cleans up all scheduled values
- [ ] `pnpm test` passes

See `../edm-sound-design-schema/tasks.md` section "Automation Engine" for the full task list.
