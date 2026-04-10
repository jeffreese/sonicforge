# EDM Compose Skill + Examples + Documentation — Tasks

## Compose Skill

- [ ] Update `.claude/rules/composition-format.md` with EDM guidance (new instrument source types, effects, automation syntax)
- [ ] Update `.claude/skills/compose/` with EDM awareness
- [ ] Document available synth presets, effects, and one-shot hit names in a rule file
- [ ] Document automation / sidechain / LFO patterns with common EDM examples (buildup sweep, drop sidechain, wobble bass)
- [ ] Add genre hint parameter to `/compose` ("house", "techno", "dubstep", "trap", "future bass", "ambient")

## Example Compositions

- [ ] House track: sidechain pad, synth bass, 4-on-the-floor kick, one-shot drums
- [ ] Dubstep track: wobble bass (LFO mod), filter sweep on drop, trap-style snare
- [ ] Future bass track: supersaw lead, pluck bass, automation sweeps
- [ ] Place in `compositions/examples/edm/`
- [ ] Generate each via `/compose` to validate the skill update (iterate on the skill until quality is acceptable)

## Documentation

- [ ] Update `CLAUDE.md` with overview of new instrument source types and schema capabilities
- [ ] Add ADR: "EDM sound design via schema extension, not new data model"
- [ ] Document preset library and available effects in `docs/` (reference for Claude + humans)

## Final Verification

- [ ] Load every example composition (existing + new EDM) and verify playback
- [ ] Backwards compat: old compositions load with no changes
- [ ] Cross-mixing: composition with both sampled acoustic instruments and synth instruments plays correctly
- [ ] Performance check: CPU usage during EDM playback stays reasonable
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
