# Skill Watch Log

Patterns observed during development that may be worth codifying as skills.
Updated by `/retro`. When a pattern reaches 3+ observations, it's elevated to "strong candidate."

## Biome Auto-Fix on Write
**Count:** 4 | **First seen:** 2026-03-15 | **Last seen:** 2026-04-10
**Status:** strong candidate
**Description:** After writing new files, Biome import ordering or formatting violations are caught by lint or pre-commit hook. Running `biome check --write` automatically on newly created files would eliminate the fix-and-retry cycle.
**Observations:**
- 2026-03-15: Hit 4 times in one session (validate.test.ts, sf-app.ts, MixerStore.ts, bridge.test.ts). Could be a post-write hook rather than a skill.
- 2026-03-16: sf-composition-loader.ts needed import reorder + formatting fix after initial write. Test file also needed rewrite to avoid non-null assertions caught by lint.
- 2026-03-19: sf-arrangement.ts formatting (line length) and unused import in test caught by pre-commit hook, required format + fix + re-commit. A post-write hook would have caught this immediately.
- 2026-04-10: Hit across 6 new compose-helper files (time.ts, chords.ts, drums.ts, bass.ts, harmony.ts, humanize.ts) during the compose-helpers implementation — 7 errors plus 1 warning. Ran `biome check --write tools/` to auto-fix import ordering, `noInferrableTypes`, and formatting; manually removed an unused variable and a useless template literal in chords.ts. This is the pattern the strong candidate predicts: write a batch of files, lint runs, fix-and-retry. A `PostToolUse` hook on Write matching `**/*.ts` could run `biome check --write $FILE_PATH` in the background and eliminate the cycle entirely.

## Plan-then-implement two-PR cadence
**Count:** 2 | **First seen:** 2026-04-10 | **Last seen:** 2026-04-10
**Status:** observed
**Description:** For non-trivial features with creativity-sensitive design, shipping the plan as its own PR *before* implementation gives the user a clear review point on the design separately from the code. The implementation PR then references the merged plan and does what the spec says.
**Observations:**
- 2026-04-10: compose-helpers — #44 shipped the plan (spec.md + tasks.md + backlog update); #46 shipped the implementation following the spec. The user reviewed the design calls in #44 (TS vs Python, `tools/` location, primitives-vs-presets, rigidity pass framing) without being distracted by code. Two clean merge points.
- 2026-04-10: composition-index — #45 shipped the plan + the draft-first rule as a prerequisite. Implementation is deferred. Same separation of design review from code review.

## Design questions before writing the spec
**Count:** 2 | **First seen:** 2026-04-10 | **Last seen:** 2026-04-10
**Status:** observed
**Description:** For plans where the design space has load-bearing decisions, asking the user 3-5 specific questions *before* writing the spec (instead of writing the spec and asking them to review) produces better specs and faster alignment. The user's input shapes the plan; they're not just auditing a fait accompli.
**Observations:**
- 2026-04-10: compose-helpers — asked about scope (primitive vs preset), location (`.claude/tools/` vs `tools/`), language (TS vs Py), growth strategy. Answers became the plan's core principles.
- 2026-04-10: composition-index — asked about index location, update strategy, feature tiers, consumption pattern. User's responses unlocked the hook-based approach, draft-first convention, and positive-framing safeguard. Would have gotten a worse spec if I'd written it first and asked for review.
