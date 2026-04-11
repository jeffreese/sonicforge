---
name: compose
description: "Generate a new SonicForge composition from a natural language description."
allowed-tools: Read, Write, Glob
---

# /compose — Generate a New Composition

## Steps

1. **Parse the request.** Extract genre/mood, instruments, BPM, key, structure, length. Fill in sensible defaults for anything not specified.

2. **Load reference material.** Always read:
   - `.claude/skills/compose/gm-samples.md` — valid instrument sample names (for `source: 'sampled'`)
   - `.claude/skills/compose/genre-guide.md` — genre conventions, progressions, drum patterns

   If the request involves EDM, synths, effects, automation, sidechain, LFO modulation, or one-shot drums, also read:
   - `.claude/skills/compose/synth-presets.md` — 14 starter synth patches with role hints
   - `.claude/skills/compose/effects-reference.md` — the 12 supported effect types with params and usage patterns
   - `.claude/skills/compose/modulation-patterns.md` — wobble bass, sidechain pumping, filter sweeps, drops
   - `.claude/skills/compose/oneshot-hits.md` — bundled CC0 drum/FX samples available via `source: 'oneshot'`

   **Optional starter templates:** if the request names a specific genre that has a starter kit and you want a base to adapt rather than building from scratch, also read:
   - `.claude/skills/compose/genre-templates.md` — opt-in starter kits for house, bass house, dubstep, drum & bass, future bass, and trance. Templates are starting points, **not** prescriptions — you're free to deviate, swap instruments, change progressions, or ignore them entirely. Skip this file for non-listed genres (lofi, trap, ambient, classical, etc.) or when the request is genre-agnostic.

3. **Ask clarifying questions only if the request is very vague** (e.g., bare "/compose"). If there's enough to work with, generate directly.

4. **Generate the composition JSON.** Follow the `composition-format` and `music-theory` rules. Key principles:
   - Write every note — no placeholders or "repeat" comments
   - Vary velocity across notes
   - Build energy across sections (add instruments, raise dynamics)
   - Keep instruments in their natural registers
   - Ensure harmonic consistency across simultaneous instruments

   **For compositions over ~32 bars or expected to exceed ~200 notes,** reach for the helper library at `tools/compose-helpers/` for repetitive scaffolding (drum grids, bass patterns, pad sustains, arpeggios, humanization). Write a throwaway scratch script (in `/tmp/`), import primitives you need, build repetitive tracks with them, and hand-write melodies, fills, and transitions on top. Helper output is a starting point — hand-edit for expression before finalizing. See `tools/compose-helpers/README.md` for the inventory and conventions. **New helpers are encouraged** — if a primitive you need doesn't exist yet, add it rather than reinventing ad-hoc code.

5. **Rigidity pass.** Before finalizing, scan the generated composition for mechanical uniformity and adjust. Applies regardless of whether helpers were used:
   - **Velocity uniformity:** if >60% of notes in a track share the same velocity, apply a natural velocity curve (emphasize downbeats, soften offbeats, ghost notes between hits).
   - **Bar-to-bar identicalness:** if 4+ consecutive bars are literal duplicates within a track, introduce one variation — a ghost note, a dropped hit, a velocity accent, a one-bar fill.
   - **Section contrast:** each section should have at least one distinguishing element from its neighbors (instrumentation, density, dynamics, register, drum variation).
   - **Transition markers:** every section boundary should have some audible marker — fill, crash, drop-out, sweep, automation point. Add one if none exist.

6. **Write the JSON — draft-first.** Author to `/tmp/composition-draft-<slug>.json` throughout generation. Validate against the schema. Then perform a single final Write to `compositions/<slug>.json`. See `.claude/rules/composition-drafts.md` for the full convention and rationale.

7. **Briefly describe what you created** — title, key, BPM, instruments, section overview, and what the rigidity pass adjusted (or "rigidity pass clean" if no adjustments were needed). A few sentences max.

## Quality Checklist

Before outputting, verify:
- `version` is `"1.0"`
- All `instrumentId` references match an instrument `id`
- Note times don't exceed section bar counts
- Velocity varies naturally
- Bass in C1–G3, melody in C4–C6
- Drum tracks use named hits, not pitches
- Dynamic contrast between sections
- No empty sections or tracks
