# Compose Helpers — Tasks

## Phase 1: Foundation

- [ ] Create `tools/compose-helpers/` directory
- [ ] Write `tools/compose-helpers/README.md` with conventions (return `Note[]`, pure, single-param object, ~5 params max, no genre logic, library growth encouraged) and an empty function inventory
- [ ] Add `tools/compose-helpers/index.ts` barrel exports
- [ ] Verify `biome` and `vitest` configs pick up `tools/**/*.ts` and `tools/**/*.test.ts` — extend globs if not
- [ ] Confirm `Note` / `Track` / `Instrument` types import cleanly from `src/schema/composition.ts` across the `tools/` boundary
- [ ] Add a top-level pointer to `tools/compose-helpers/README.md` in `CLAUDE.md`

## Phase 2: Core helper modules

Extract primitives from the ad-hoc scripts used for the Subterra composition and the deep-bass-house remix. Start minimal; grow as needed.

- [ ] `time.ts` — `bar()`, `beat()`, `time()` string builders; bar-offset math; section-bar conversion
- [ ] `chords.ts` — `CHORD_TONES` dict for common triads/sevenths; `voicing()` helper (close, open, root-position, inversions); `progression()` parser (string like `"Am | F–E | Dm–C | E–Am"` → structured array)
- [ ] `drums.ts` — `fourOnFloor()`, `halfTime()`, `breakbeat()`, `trap()`. Each parameterized on bars, velocity curves, open-hat cadence.
- [ ] `bass.ts` — `subSustain()` (root whole/half notes per chord), `rootOctaveBounce()` (root on beats, octave on offbeats), `offbeatPump()` (trance-style all-offbeats bass)
- [ ] `harmony.ts` — `padSustain()` (hold chord tones over N bars), `stabOnBeats()` (rhythmic chord hits on specified beats), `arpeggio()` (rotate chord tones up/down/up-down at a subdivision)
- [ ] `humanize.ts` — `velocityCurve()` (apply a shape to existing notes: natural, crescendo, decrescendo), `timingJitter()` (micro-offset notes for non-mechanical feel)
- [ ] Co-located vitest tests per module: happy path, one edge case, output shape validation

## Phase 3: Skill integration

- [ ] Update `/compose` skill (`.claude/skills/compose/SKILL.md`) — add the "when to reach for helpers" step with the ~32-bar / ~200-note threshold
- [ ] Update `/compose` skill — add the rigidity-pass step with the four checks (velocity uniformity, bar-to-bar identicalness, section contrast, transition markers)
- [ ] Update `/remix` skill (`.claude/skills/remix/SKILL.md`) — add the same rigidity-pass step
- [ ] Verify skill descriptions still fit under 30 tokens (per `standards-skills.md`)

## Phase 4: ADR + documentation

- [ ] Capture decision record via `/forge:adr`: problem framing, alternatives considered (helper library vs schema pattern directives vs status quo ad-hoc scripts; TS vs Python), creativity guardrails, success metrics
- [ ] Update `tools/compose-helpers/README.md` with the final function inventory once Phase 2 is complete
- [ ] Brief mention in relevant `CLAUDE.md` section (Schema or Behavioral Notes) that long compositions should use helpers

## Phase 5: Dogfood

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

- [ ] Extract a `tools/compose-helpers/rigidity.ts` analysis function if the manual pass proves useful enough to automate
- [ ] Consider a `/rigidity-check` standalone skill for auditing existing compositions
- [ ] Revisit cross-song similarity tracking if drift becomes noticeable after several compositions
