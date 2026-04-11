---
title: "ADR-010: Compose Helpers as Authoring-Time Tooling"
date: 2026-04-10
status: accepted
---

# ADR-010: Compose Helpers as Authoring-Time Tooling

## Status

Accepted

## Context

For short compositions, Claude hand-writes the composition JSON note-by-note — a deliberate, expressive process where every velocity and timing decision gets attention. For long compositions (Subterra: 300 KB, 1953 notes; deep-bass-house remix: 682 notes), hand-writing becomes a token and cognitive burden that produces no creative value. 48 kick hits per bar in a four-on-the-floor pattern are mechanically identical whether written by hand or generated in a loop.

Claude has already reached for ad-hoc Python generator scripts during two recent sessions (Subterra, deep-bass-house remix) to handle this scaffolding. Each script was rewritten from scratch, with the same drum/bass/pad primitives re-derived every time. The pattern clearly repeats; codifying it saves future sessions from reinventing the same loops, and provides a durable vocabulary for long-form composition work.

The hard constraint is **creativity preservation**. SonicForge's compositions shouldn't start sounding the same because Claude reaches for the same helper every time. The library must accelerate stenography without calcifying musical choices.

## Decision

**Ship a TypeScript helper library at `tools/compose-helpers/` with primitives for mechanical rhythm and voicing patterns, consumed from throwaway scratch scripts during `/compose` and `/remix`.** The library is authoring-time tooling — invisible to the engine, schema, UI, and validator. It exists solely to produce `Note[]` arrays that get merged into hand-written composition JSON.

Concretely:

- **Location:** `tools/compose-helpers/` at repo root. Treated as first-class project code — lint, tests, type checks via the same `biome` + `vitest` + `tsc` pipeline that covers `src/`.
- **Language:** TypeScript. Helpers import `Note` / `Track` types directly from `src/schema/composition.ts`, so schema drift becomes a compile error. Running via `npx tsx` is as fast as Python with no type-safety compromise.
- **Six modules, ~1400 lines total:** `time.ts` (time-string math), `chords.ts` (chord-tone lookup, voicings, progression parsing), `drums.ts` (four-on-floor / half-time / breakbeat / trap), `bass.ts` (sub sustain / root-octave bounce / offbeat pump), `harmony.ts` (pad sustain / stabs / arpeggio), `humanize.ts` (velocity curves / timing jitter).
- **Primitives only, never presets.** `drumGrid({ kickBeats, snareBeats, hatSubdivision })` is in; `trapBeat()` is out. Genre-specific sound design lives in `.claude/skills/compose/genre-templates.md`, not in helper code.
- **Rigidity pass** added to both `/compose` and `/remix` skills as a mandatory step before finalization: check velocity uniformity, bar-to-bar identicalness, section contrast, and transition markers. Applies whether helpers were used or not — hand-written compositions benefit equally.
- **Draft-first authoring convention** (`.claude/rules/composition-drafts.md`) is a prerequisite: all composition writes go to `/tmp/composition-draft-<slug>.json` first and only land in `compositions/` as a single final Write. Enables the composition-index hook to fire exactly once per completed composition.
- **Library growth is explicitly encouraged.** The compose skill instructs Claude to add new primitives rather than reinvent ad-hoc code when a needed helper doesn't exist. The user watches library size as a calcification signal.

Every new helper must be pure, single-parameter-object, ~5 params max, genre-agnostic, and co-located with a vitest test.

## Alternatives Considered

### Status quo: ad-hoc scratch scripts per session (rejected)

Leave things as they are — Claude writes a throwaway Python script whenever a long composition needs scaffolding.

- **Pros:** Zero infrastructure. Maximum flexibility per script.
- **Cons:** Each session reinvents the same primitives. No shared vocabulary or quality baseline. Token cost compounds over time. No way to pass improvements forward.

Rejected because the cost of rewriting the same loops is compounding, and there's no mechanism to accumulate learnings across sessions.

### Schema-level pattern directives (rejected)

Extend `SonicForgeComposition` with a `patterns: [...]` field on tracks. Engine expands pattern directives to notes at load time.

- **Pros:** Compositions become dramatically smaller on disk. UI could render patterns as collapsible blocks.
- **Cons:** Engine has to know every pattern type — adding a new one requires engine code and a release. Breaks the "JSON is just notes" principle that ADR-009 relies on. Mixing explicit notes with directives creates conflict-resolution questions. Worst of all: Claude loses creative flexibility at *exactly* the layer we want to preserve it. If a new pattern isn't in the engine, Claude can't invent it — only pick from a menu.

Rejected because it puts the abstraction in the wrong place. We want Claude's expressiveness unconstrained; helpers should be flexible authoring tools, not runtime-interpreted directives.

### JSON snippet library (rejected)

Pre-built 1-bar or 4-bar JSON fragments Claude copies and adapts in-place.

- **Pros:** Pure JSON, no language dependency, immediately inspectable.
- **Cons:** Still token-expensive — copying a 4-bar drum pattern 16 times burns tokens and re-introduces bar-offset math errors. Doesn't actually solve the underlying problem of stenography.

Rejected as too thin — it saves typing characters but not the mental overhead of repetitive grid construction.

### Python helper library (rejected in favor of TypeScript)

Same shape as the accepted decision, but with Python modules.

- **Pros:** Claude reaches for Python instinctively for quick scripting. List comprehensions and f-strings make pattern generation concise.
- **Cons:** No type safety against `src/schema/composition.ts`. Schema drift would silently break Python helpers at runtime. Adds a language to the project's tooling surface. Python scripts would need to serialize to JSON and be read back in TS-land — a trip through untyped data.

Rejected because the type-safety argument was decisive once we realized helpers could import schema types directly.

## Consequences

**Positive:**

- Long compositions become materially faster to author; the stenography burden is offloaded to reusable primitives.
- Schema drift is caught at compile time rather than at composition-load time.
- The draft-first convention (shipped alongside) gives transactional authoring, a validation gate, and clean index-hook semantics as a free bonus for non-helper use cases too.
- The rigidity pass creates a formal moment for diversification that applies even to hand-written compositions.

**Negative / risks:**

- Risk of calcification: Claude reaches for helpers reflexively and produces same-y output. Mitigated structurally by primitives-only policy, by the rigidity pass, by library growth being encouraged rather than gated, and by the user watching library size as a signal.
- Risk of invisible conventions: a helper bakes in timing or velocity choices that can't be seen in the composition JSON without reverse-engineering. Mitigated because helper output IS the composition JSON — whatever's there is whatever the helper emitted, inspectable end-to-end.
- Maintenance surface: lint, tests, and type checks now cover `tools/**` in addition to `src/**`. One-time cost to extend the configs; negligible ongoing.
- Tsconfig include broadens from `["src"]` to `["src", "tools"]`, which means future tooling directories need to either live under `tools/` or be added explicitly.

**Neutral:**

- The library starts at 6 modules covering the patterns used in recent compositions. Growth will be shaped by actual friction, not speculation.
- Similarity/novelty scoring across the library is deferred to a future plan (`composition-index`), which depends on this ADR's draft-first convention landing.
