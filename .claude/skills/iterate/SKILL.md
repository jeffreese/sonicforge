---
name: iterate
description: "Modify an existing SonicForge composition — add instruments, change key, adjust energy."
allowed-tools: Read, Write, Glob
---

# /iterate — Modify an Existing Composition

## Steps

1. **Find the composition.** Look in `compositions/` for the most recently modified JSON. If ambiguous, ask which one.

2. **Read and understand it.** Note instruments, section structure, key, harmonic language, and energy arc before making changes.

3. **Read reference material** if needed:
   - `.claude/skills/compose/gm-samples.md` — when adding instruments
   - `.claude/skills/compose/genre-guide.md` — when changing style or adding genre elements

4. **Make targeted changes** while preserving everything else. Be surgical — don't alter parts the user didn't ask about.

5. **Write the modified JSON — draft-first.** Author modifications at `/tmp/composition-draft-<slug>.json` rather than editing the original in place. Validate against the schema. Then run `pnpm finalize-composition <slug>` as the final step — the helper overwrites `compositions/<slug>.json` with the modified draft and updates the composition index in one atomic operation. See `.claude/rules/composition-drafts.md` for the full convention and rationale.

6. **Briefly describe what changed.** A few sentences max.

## Common Operations

**Adding an instrument:** Add to `instruments[]`, add tracks in relevant sections, write notes that follow the existing chord progression.

**Adding a section:** Insert at correct position, include tracks for active instruments. Bridges use contrasting progressions.

**Changing key:** Transpose every pitched note by the interval. Update `metadata.key`. Drum hits don't change.

**Adjusting energy:** Increase = add notes, raise velocity, add instruments, higher register. Decrease = opposite.

**Swapping instruments:** Update `sample` and `name` fields. Adjust note ranges for the new instrument if needed.

**Tags:** Preserve `metadata.tags` by default. Only update tags when the iteration changes the composition's genre or character — e.g., adding horror motifs could add `"horror"` to the tag list; reducing intensity could add `"ambient"` or replace `"aggressive"` with `"melancholic"`. Never remove the primary (first) tag unless the iteration is large enough to fundamentally re-genre the piece.

## Do Not

- Change parts the user didn't ask about
- Remove existing notes unless asked to simplify
- Break the energy arc without reason
