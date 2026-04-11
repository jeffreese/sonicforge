# Compose Helpers — Tasks

## Phase 1: Foundation

- [x] Create `tools/compose-helpers/` directory
- [x] Write `tools/compose-helpers/README.md` with conventions (return `Note[]`, pure, single-param object, ~5 params max, no genre logic, library growth encouraged) and an empty function inventory
- [x] Add `tools/compose-helpers/index.ts` barrel exports
- [x] Verify `biome` and `vitest` configs pick up `tools/**/*.ts` and `tools/**/*.test.ts` — extend globs if not
- [x] Confirm `Note` / `Track` / `Instrument` types import cleanly from `src/schema/composition.ts` across the `tools/` boundary
- [x] Add a top-level pointer to `tools/compose-helpers/README.md` in `CLAUDE.md`

## Phase 2: Core helper modules

Extract primitives from the ad-hoc scripts used for the Subterra composition and the deep-bass-house remix. Start minimal; grow as needed.

- [x] `time.ts` — `beatTime()`, `beatsToTime()`, `parseBeatTime()`, `offsetBars()`; time arithmetic
- [x] `chords.ts` — `CHORD_TONES` via `chordTones()`; `voicing()` (close/open/drop2); `parseProgression()` string parser
- [x] `drums.ts` — `fourOnFloor()`, `halfTime()`, `breakbeat()`, `trap()`. Each parameterized on bars, velocity curves, open-hat cadence.
- [x] `bass.ts` — `subSustain()`, `rootOctaveBounce()`, `offbeatPump()`
- [x] `harmony.ts` — `padSustain()`, `stabOnBeats()`, `arpeggio()` (up / down / up-down)
- [x] `humanize.ts` — `velocityCurve()` (natural / crescendo / decrescendo / accented-downbeats / subtle), `timingJitter()` with seeded PRNG
- [x] Co-located vitest tests per module: 79 new tests covering happy paths, edge cases, and output shape

## Phase 3: Skill integration

- [x] Update `/compose` skill — "when to reach for helpers" step with the ~32-bar / ~200-note threshold and library-growth encouragement
- [x] Update `/compose` skill — rigidity-pass step with the four checks (velocity uniformity, bar-to-bar identicalness, section contrast, transition markers)
- [x] Update `/remix` skill — same rigidity-pass step and helpers-reach pointer
- [x] Update `/compose` and `/remix` describe steps to report what the rigidity pass adjusted (observability fix)
- [x] Create standalone `/rigidity-check` skill at `.claude/skills/rigidity-check/SKILL.md` for on-demand auditing of existing compositions — canonical home for the four checks
- [x] Verify skill descriptions still fit under 30 tokens (per `standards-skills.md`)

## Phase 4: ADR + documentation

- [x] Capture decision record: `docs/adrs/adr-010-compose-helpers-tooling.md` covers problem framing, alternatives (status quo / schema directives / JSON snippets / Python), creativity guardrails, consequences
- [x] `tools/compose-helpers/README.md` includes the full Phase 2 function inventory
- [x] `CLAUDE.md` File Organization section points to `tools/` and `tools/compose-helpers/`

## Phase 5: Dogfood

Runs as a separate follow-up session, after this PR merges. The helpers need to exist on main before dogfooding makes sense.

- [ ] Pick a long composition as the first real test. Candidates: a progressive house track (~4 min, 6+ sections) or a dubstep remix of an existing composition with a complex drop section.
- [ ] Generate using helpers as scaffolding, hand-write the expressive tracks (leads, fills, transitions)
- [ ] Run the rigidity pass and record what it flagged — how many adjustments did it suggest? Were they meaningful?
- [ ] Brief retro as a session note or friction log entry:
  - Did anything feel restrictive?
  - Was the output musically distinct from existing compositions?
  - Did library growth happen? (new helpers added?)
  - Are there primitives Claude wanted but didn't have?
- [ ] Capture findings and iterate on the library based on what was actually used / missed

## Phase 6 (deferred / optional)

- [ ] Extract a `tools/compose-helpers/rigidity.ts` analysis function if the manual pass in `/rigidity-check` proves useful enough to automate programmatically
- [ ] Revisit cross-song similarity tracking if drift becomes noticeable after several compositions (this is now its own plan at `docs/plans/composition-index/`)
