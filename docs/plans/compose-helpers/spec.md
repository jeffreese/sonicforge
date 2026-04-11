# Compose Helpers

## Overview

A small TypeScript helper library at `tools/compose-helpers/` that Claude imports when generating long SonicForge compositions. Helpers handle the mechanical stenography of repetitive patterns — drum grids, sustained pads, root+octave basslines, arpeggios, humanization passes — so Claude can think at the pattern level instead of the sixteenth-note level.

The composition JSON file remains the canonical artifact. Helpers are pure authoring tools that never touch the runtime engine, schema, or UI. Their only output is typed note arrays matching the existing `src/schema/composition.ts` types.

## Why

For short compositions, hand-writing the JSON is fast and forces deliberate note-by-note choices. For long compositions (Subterra-scale: 300 KB, 1953 notes; the deep-bass-house remix: 682 notes), hand-writing becomes a token and cognitive burden that produces no creative value — 48 kick hits in a bar are mechanically identical whether written by hand or by loop. The creativity lives in the *pattern choice*, not the stenography.

Claude has already ad-hoc-written Python generator scripts during two recent sessions (Subterra and the deep-bass-house remix) to handle exactly this scaffolding. Codifying the pattern saves future sessions from reinventing the same primitives, and establishes shared vocabulary for long-form composition work.

## Core principle: helpers are primitives, not presets

The creativity risk is real and must be designed against. The rule:

- **Helpers handle:** rhythm grids, voicings, sustains, arpeggios, humanization passes — the "how many notes does this pattern produce over N bars" layer.
- **Helpers do NOT handle:** instrument selection, chord progressions, section structure, melodic contours, fills, or any musical judgment call.
- **Genre knowledge stays in `.claude/skills/compose/genre-templates.md`.** Helpers know nothing about house vs dubstep; Claude reads the genre template, picks primitives that match, and parameterizes them.
- **Helper output is a starting point, not a deliverable.** Claude hand-edits the generated notes for fills, accents, humanization nuance, and musical taste.

## Requirements

### Library location and language

- **Location:** `tools/compose-helpers/` at repo root, not `.claude/`. Treating this as first-class project code (with lint, tests, and type checks) rather than skill scaffolding.
- **Language:** TypeScript.
  - The project is TS end-to-end. Helpers import `Note` / `Track` / `Instrument` types from `src/schema/composition.ts` directly — schema drift becomes a compile error instead of a silent untyped-dict mismatch.
  - Existing tooling (biome, vitest, tsx) applies for free.
  - `npx tsx tools/compose-helpers/scratch.ts` is as fast to invoke as Python; startup overhead is negligible compared to the work.

### Module layout

```
tools/compose-helpers/
├── README.md           # Conventions + function inventory (kept current as helpers grow)
├── index.ts            # Barrel re-exports
├── time.ts             # bar(), time arithmetic, bar-offset math
├── chords.ts           # CHORD_TONES, voicing helpers, progression parsing
├── drums.ts            # fourOnFloor, halfTime, breakbeat, trap — parameterized
├── bass.ts             # subSustain, rootOctaveBounce, offbeatPump
├── harmony.ts          # padSustain, stabOnBeats, arpeggio
├── humanize.ts         # velocityCurve, timingJitter — applied to existing note arrays
└── *.test.ts           # Co-located vitest tests per module
```

### Shape of a helper

Each helper:

- Takes a single parameter object (no positional args — clarity over brevity)
- Returns `Note[]` matching the schema exactly
- Is **pure**: no file I/O, no side effects, deterministic given the same input
- Is a **primitive**: one concept, ~5 params max. If growing past 5, split.
- Has a co-located vitest test covering the happy path, one edge case (0 bars / 1 bar), and the output shape

Illustrative API (final shape TBD during implementation):

```typescript
import type { Note } from '../../src/schema/composition'

export interface FourOnFloorOptions {
  bars: number
  startBar?: number
  kickVelocities?: [number, number, number, number] // beats 1,2,3,4
  clapOnBeats?: number[] // default [1, 3] (0-indexed → beats 2 and 4)
  hatSubdivision?: '8n' | '16n'
  openHatEvery?: number | null // "every N bars on beat 4&" or null
}

export function fourOnFloor(opts: FourOnFloorOptions): Note[] { ... }
```

### `/compose` and `/remix` skill integration

**Step added to both skills — "when to reach for helpers":**

> For compositions over ~32 bars or expected to exceed ~200 notes, consider using helpers from `tools/compose-helpers/`. Write a throwaway scratch script that imports the primitives you need, builds the repetitive tracks, merges with hand-written expressive tracks, and emits the composition JSON. For shorter compositions, hand-write JSON directly.
>
> **If a primitive you need doesn't exist yet, add it.** The library is designed to grow. New helpers are explicitly encouraged — don't reinvent ad-hoc scripts. See `tools/compose-helpers/README.md` for conventions (return `Note[]`, pure, parameterized, no genre logic).

**Step added to both skills — "rigidity pass":**

> Before writing the final JSON, scan the composition for rigidity and adjust:
>
> 1. **Velocity uniformity.** For any track where >60% of notes share the same velocity, apply a natural velocity curve (emphasize downbeats, soften passing tones, ghost notes between hits).
> 2. **Bar-to-bar identicalness.** Identify spans where 4+ consecutive bars are literal duplicates within a track. Introduce one variation per span — a ghost note, a dropped hit, a velocity accent, a one-bar fill.
> 3. **Section contrast.** Verify each section has at least one distinguishing element from its neighbors (instrumentation, density, dynamics, register, drum variation).
> 4. **Transition markers.** Every section boundary should have some audible marker: fill, crash, drop-out, sweep, automation point. If none exist, add one.
>
> Report briefly what was adjusted. This pass applies regardless of whether helpers were used — hand-written compositions benefit equally.

### Testing

- Vitest tests for each helper module, co-located next to the source
- One end-to-end integration test: generate a small composition using only helpers, validate against the schema via `src/schema/validate.ts`, confirm `pnpm test` passes
- Run via existing `pnpm test` — no new CI configuration needed

## Architecture

### What does NOT change

- **`src/schema/composition.ts`** — no new types. Helpers emit the existing `Note` / `Track` shape.
- **Engine** — nothing. Helpers are authoring-only; the engine never sees them.
- **UI** — nothing. The piano roll renders the same note arrays as before.
- **Validator** — nothing. Helper output is plain composition JSON.

This is the critical invariant: the helper library is invisible to everything downstream. Pure cognitive offloading for the Claude → JSON authoring path.

### What does change

- New `tools/compose-helpers/` directory
- `/compose` skill gains two new steps (helpers + rigidity pass)
- `/remix` skill gains the rigidity pass
- New entry in `CLAUDE.md` pointing to `tools/compose-helpers/README.md`
- New ADR capturing the decision: problem, alternatives considered, creativity guardrails
- `biome` and `vitest` coverage extended to `tools/**` (verify config already picks this up; add glob if not)

## Creativity safeguards

This is the single most important design goal. The library must not produce same-y compositions. Structural guarantees:

1. **Helpers are primitives, not presets.** No `trapBeat()`. Instead `drumGrid({ kickBeats, snareBeats, hatSubdivision })`. Claude picks the primitive *and* its parameters — the musical choice stays with Claude.
2. **Genre knowledge lives in `genre-templates.md`, not in helper code.** Clean separation between creative reference and stenography.
3. **Helper output is explicitly a starting point.** Skill wording: "hand-edit for expression before shipping."
4. **The rigidity pass catches mechanical output** regardless of source — applies whether Claude used helpers or hand-wrote the composition.
5. **Usage threshold** in the skill: compositions under ~32 bars / ~200 notes should be hand-written. Helpers are for long-form work where the stenography burden is real.
6. **Library growth is encouraged** so Claude isn't forced into a fixed vocabulary of primitives. New helpers are added when needed rather than working around a missing one.

## Non-goals

- **Schema changes.** No new track types, no pattern directives, no runtime pattern expansion. The JSON file remains canonical.
- **Genre-specific presets.** See above — primitives only.
- **Pattern DSL.** Helpers are TypeScript functions, not a declarative mini-language. There is no runtime interpreter.
- **Melody / fill / transition generation.** Those stay hand-written. No `generateLead()`, no `writeTransitionFill()`.
- **Cross-composition similarity tracking.** Keeping compositions dissimilar from *each other* (not just internally non-rigid) is an interesting follow-up but out of scope for the initial shipment — it requires an index of past compositions and cross-referencing infrastructure that shouldn't block this plan. Revisit if we see drift after a few compositions.

## Success metrics

The library is working if:

1. Long compositions (>32 bars, >200 notes) become materially faster to generate
2. Claude reaches for helpers for scaffolding but hand-writes melodies / fills / transitions
3. The rigidity pass catches real instances of uniformity (and is occasionally a no-op, proving the hand-writing was already expressive)
4. The library stays small-ish (goal: <800 lines total initially) and grows only when Claude hits real friction
5. Output compositions pass the same "does this sound good" bar as hand-written ones — dogfood verdict after 3–5 compositions

If after 3–5 long compositions the library feels restrictive or output feels mechanical, reassess the abstraction boundaries.

## Open questions

1. **Scratch file location and cleanup.** Should scratch generation scripts live in `tools/compose-helpers/scratch.ts` (gitignored) or `/tmp/`? Either works; pick one for consistency during implementation. Leaning `/tmp/` to avoid accidental commits.
2. **Rigidity pass: manual or automated?** Start with Claude performing the check mentally against the criteria above. If it proves useful, extract into a `tools/compose-helpers/rigidity.ts` analysis function that reports specific offenders.
3. **Cross-song similarity (future).** Would require a `compositions/.index.json` tracking instruments, progressions, tempos, and drum patterns across all shipped compositions, plus a skill step to check new work against recent history. Significant scope — worth its own plan if we see drift.
4. **Should the rigidity pass also be available as a standalone skill** (e.g., `/rigidity-check <composition.json>`) so existing hand-written compositions can be audited? Nice-to-have, not blocking.
