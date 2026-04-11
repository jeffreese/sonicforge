---
name: remix
description: "Rework an existing SonicForge composition in a different genre while keeping its harmonic structure."
argument-hint: "[source.json] [target-genre]"
allowed-tools: Read, Write, Glob
---

# /remix — Reimagine a Composition in a New Genre

Produce a genre variant of an existing composition that keeps the harmonic skeleton (key, chord progression, section layout) and changes the sound-design layer (instruments, rhythm, tempo, effects, modulation).

## Invocation

- `/remix <path> <genre>` — both positional args optional
- `/remix <genre>` — use the most recently modified file in `compositions/`
- `/remix` — ask for source and target

## Steps

1. **Resolve the source.** If no path given, glob `compositions/*.json` and pick the most recently modified. If ambiguous or the user clearly meant a different file, ask.

2. **Read and map the source.** Extract and write down (for yourself) before touching anything:
   - `metadata.key`, original `bpm`, original `genre`
   - Section names, bar counts, and order
   - The chord progression per section (derive it from the pad/keys/bass tracks if not annotated)
   - The energy arc — which sections are builds, drops, breakdowns, outros
   - Any distinctive structural features (drop at bar N, breakdown halfway, tag ending)

   This map is the invariant. Every structural choice in the remix should trace back to it.

3. **Load target-genre reference.** Always read:
   - `.claude/skills/compose/gm-samples.md` — for any sampled instruments
   - `.claude/skills/compose/genre-guide.md` — for target-genre conventions

   If the target genre is one of house, bass house, dubstep, drum & bass, future bass, or trance, also read:
   - `.claude/skills/compose/genre-templates.md` — and use the target genre's template as a sound-design starting point

   If the target involves synths, effects, modulation, or one-shot drums, also read:
   - `.claude/skills/compose/synth-presets.md`
   - `.claude/skills/compose/effects-reference.md`
   - `.claude/skills/compose/modulation-patterns.md`
   - `.claude/skills/compose/oneshot-hits.md`

4. **Plan the transformation.** Decide before writing any notes:
   - **Tempo.** Adopt the target genre's natural BPM unless the source is already in range. Document the change.
   - **Instrument swap table.** For each source instrument, pick a target-genre equivalent (role-preserving: bass→bass, pad→pad, lead→lead). Drop instruments that don't fit; add ones the genre requires (e.g., supersaw lead + arp pluck for trance).
   - **Drum rework.** Target genre's drum pattern, not the source's. Four-on-the-floor for house/trance; half-time for dubstep; breakbeat for DnB.
   - **Effects/modulation.** Master chain, sidechain routes, automation lanes — pulled from the genre template, not the source.

5. **Preserve these exactly.**
   - `metadata.key`
   - Section names, order, and bar counts
   - Chord progression per section (root + quality; voicings can change)
   - Overall energy arc (if source has a drop at section 4, the remix drops at section 4)

6. **Rework these freely.**
   - `metadata.bpm`, `metadata.genre`, `metadata.title` (append `" (Genre Remix)"` or similar)
   - `instruments[]` — new list per the swap table
   - Every track's notes — re-voiced for the new instruments, re-rhythmed for the new genre, but constrained to the preserved chords
   - Melodies: re-compose over the same changes in a genre-appropriate style. Don't transplant the source melody verbatim — a trance lead moves differently than a dubstep growl even over Fm–Db–Ab–Eb.
   - `masterEffects`, `automation`, `lfos`, `modulation`, `sidechain`

7. **Generate the composition JSON.** Follow `composition-format` and `music-theory` rules. Every note written out — no placeholders. Vary velocity. Keep instruments in their natural registers (bass C1–G3, melody C4–C6, pads C3–G5).

   **For long remixes or heavy genre reworks**, reach for the helper library at `tools/compose-helpers/` for repetitive scaffolding (drum grids, bass patterns, pad sustains, arpeggios, humanization). Write a throwaway scratch script that imports primitives, builds repetitive tracks, and leaves melodies and fills hand-written. Helper output is a starting point — hand-edit for expression. New helpers are encouraged if a primitive you need doesn't exist yet.

8. **Rigidity pass.** Before finalizing, scan the generated remix for mechanical uniformity and adjust. Applies regardless of whether helpers were used:
   - **Velocity uniformity:** if >60% of notes in a track share the same velocity, apply a natural velocity curve (emphasize downbeats, soften offbeats, ghost notes between hits).
   - **Bar-to-bar identicalness:** if 4+ consecutive bars are literal duplicates within a track, introduce one variation — a ghost note, a dropped hit, a velocity accent, a one-bar fill.
   - **Section contrast:** each section should have at least one distinguishing element from its neighbors (instrumentation, density, dynamics, register, drum variation).
   - **Transition markers:** every section boundary should have some audible marker — fill, crash, drop-out, sweep, automation point. Add one if none exist.

9. **Write the JSON — draft-first.** Author to `/tmp/composition-draft-<source-stem>-<genre-slug>.json` throughout generation. Validate against the schema. Then perform a single final Write to `compositions/<source-stem>-<genre-slug>.json` (e.g., `subterra-trance.json`). Do not overwrite the source. See `.claude/rules/composition-drafts.md` for the full convention and rationale.

10. **Describe the remix briefly.** New title, new BPM, instrument swap summary, what was preserved, and what the rigidity pass adjusted (or "rigidity pass clean" if no adjustments were needed). A few sentences max.

## Quality Checklist

Before outputting, verify:
- `version` is `"1.0"`
- Key is unchanged from source
- Section names, order, and bar counts match source
- Chord progression per section matches source (voicings may differ)
- Tempo reflects the target genre
- All `instrumentId` references match an instrument `id`
- Drum patterns are genre-appropriate, not ported from source
- Velocity varies naturally
- Bass in C1–G3, melody in C4–C6
- No leftover source instruments that don't belong in the target genre

## Do Not

- Change the key
- Change section structure (names, count, bar lengths)
- Copy drum patterns or bass rhythms from the source — those are genre-dependent
- Overwrite the source file
- Skip writing notes for sections because "it's the same as before" — every note must be explicit
