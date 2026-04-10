# EDM Parameter Automation — Tasks

Tasks extracted from `../edm-sound-design-schema/tasks.md` section "Automation Engine".

- [ ] Create `src/engine/AutomationEngine.ts`
- [ ] Target path resolver: parse `"bass.filter.cutoff"` → reference to `Tone.Signal`/`Tone.Param`
- [ ] Schedule points on play using `setValueAtTime` / `linearRampToValueAtTime` / `exponentialRampToValueAtTime`
- [ ] Cancel scheduled values on stop/seek
- [ ] Handle time conversion from `"bar:beat:sixteenth"` strings using existing timing utilities
- [ ] Wire into `Engine.ts` play/stop/seek lifecycle
- [ ] Unit tests for target resolution, point scheduling, stop cleanup
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Manual: compose a test composition with a filter sweep, verify it sounds correct
