# EDM Compose Skill + Examples + Documentation

**Sub-epic #6 of EDM Phase A (final).** See `../edm-sound-design-schema/spec.md` for architectural context.

## Scope

Last-mile integration — teach the `/compose` skill about the new capabilities so Claude can generate genre-appropriate EDM tracks from natural language, ship bundled example compositions, and update docs.

## In scope

- Update `.claude/rules/composition-format.md` with EDM awareness: synth instruments, effects vocabulary, automation syntax, sidechain, LFO, one-shots
- Update `.claude/skills/compose/` with EDM guidance (synth presets, common EDM patterns, genre hints)
- Add a genre hint parameter to `/compose` (`"house" | "techno" | "dubstep" | "trap" | "future bass" | "ambient"`)
- Create 2–3 bundled EDM example compositions in `compositions/examples/edm/`:
  - House track: sidechain pad, synth bass, 4-on-the-floor kick
  - Dubstep track: wobble bass (LFO mod), filter sweep on drop, trap snare
  - Future bass track: supersaw lead, pluck bass, automation
- Generate test compositions via `/compose` to validate the skill update
- Update `CLAUDE.md` with an overview of the new instrument source types and schema capabilities
- Add ADR: "EDM sound design via schema extension, not new data model"
- Document preset library and available effects in `docs/` as a reference for Claude + humans
- Final verification: load every example composition, verify playback and backwards compat

## Depends on

- All of sub-epics #1–#5 merged

## Out of scope

- Nothing — this is the final sub-epic for Phase A

## Done when

- [ ] `/compose` with a genre hint generates a genre-appropriate 32-bar EDM track that sounds coherent
- [ ] All 3 bundled EDM examples load and play correctly
- [ ] Every existing (non-EDM) composition still loads and plays unchanged
- [ ] CLAUDE.md, ADR, and reference docs are updated
- [ ] `pnpm test` passes

See `../edm-sound-design-schema/tasks.md` sections "Compose Skill", "Documentation", and "Verification" for the full task list.
