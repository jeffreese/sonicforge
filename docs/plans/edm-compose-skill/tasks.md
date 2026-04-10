# EDM Compose Skill + Examples + Documentation — Tasks

## Compose Skill

- [x] Update `.claude/rules/composition-format.md` with EDM guidance (new instrument source types, effects, automation syntax, all new composition-level fields)
- [x] Update `.claude/skills/compose/SKILL.md` to conditionally load EDM reference docs when the request is EDM-ish
- [x] Create `.claude/skills/compose/synth-presets.md` — all 14 preset names with role hints and quick-reference table
- [x] Create `.claude/skills/compose/effects-reference.md` — 12 effect types with params, defaults, and usage patterns
- [x] Create `.claude/skills/compose/modulation-patterns.md` — wobble bass, sidechain pumping, filter sweep, reverb bloom, volume swell, combined drops, target path grammar
- [x] Create `.claude/skills/compose/oneshot-hits.md` — every bundled CC0 sample with character notes and ready-to-copy kit templates
- [x] Extend `.claude/skills/compose/genre-guide.md` with 8 EDM subgenre sections: house, techno, trance, dubstep, drum & bass, trap, future bass, ambient

## Example Compositions (8, in `compositions/examples/edm/`)

- [x] `ambient.json` — sustained `warm_pad` + sparse `fm_bell`, sub drone, long reverbs, no drums, 72 BPM
- [x] `trap.json` — 808 sub, trap snare on 3, 32nd-note hat rolls with velocity variation, sparse FM bell melody, 140 BPM half-time
- [x] `techno.json` — driving 4-on-floor + acid bass 16ths with distortion, 130 BPM, minimal melodic content
- [x] `drum-and-bass.json` — breakbeat kick/snare at 174 BPM, rolling reese bass 8ths, atmospheric pad
- [x] `house.json` — 4-on-floor, open hat off-beats, snare+clap on 2/4, kick→pad sidechain, acid bass on 16th off-beats, 124 BPM
- [x] `dubstep.json` — half-time kick/snare, mono wobble bass with LFO → `bass.filter.frequency` at 8n rate, 140 BPM
- [x] `future-bass.json` — supersaw chord stabs with stereowidener, pluck lead melody, kick→stab sidechain, I-V-vi-IV progression in D major, 150 BPM
- [x] `trance.json` — driving 4-on-floor, off-beat bass (the trance signature), supersaw lead, 16th-note arpeggiator, organ pad with sidechain, 138 BPM

All 8 compositions validate against the schema (verified via temporary test).

## Documentation

- [x] Add ADR-009: "EDM Sound Design via Schema Extension" — full rationale, alternatives considered, consequences, and sub-epic paper trail
- [x] Update `CLAUDE.md` Schema section with instrument source dispatch overview + pointers to EDM reference docs
- [ ] Mark EDM Phase A complete in `docs/plans/backlog.md` (deferred until after manual verification of the examples)

## Final Verification

- [x] `pnpm test` passes (347 tests, no new test cases since sub-epic #5 — this is a docs + compositions sub-epic)
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] All 8 bundled EDM example compositions validate against the schema
- [ ] Manual: load each of the 8 EDM example compositions in the browser and verify they play cleanly (user to do)
- [ ] Manual regression: load an existing composition (e.g. `dreamwalker`, `sweepdrone`, `nachtmusik-machine`) and verify unchanged playback (user to do)
- [ ] Manual: test `/compose` skill with an EDM request (e.g. `/compose "a deep house track"`) and verify the generated composition uses the new EDM capabilities correctly (user to do, may iterate on skill docs)

## Notes

- **8 examples instead of 3.** Original spec suggested 3 (house, dubstep, future bass); user asked for all 8 genres covered to demonstrate breadth. Each example is intentionally minimal (4 bars, 2-5 instruments) — they're breadth demonstrations, not full productions. The user will iterate on quality via manual testing and `/iterate`.
- **Reference docs use topical split** (option b from the planning discussion) rather than a single EDM reference file. Four focused files (`synth-presets`, `effects-reference`, `modulation-patterns`, `oneshot-hits`) load conditionally when the request involves the relevant capability, keeping baseline `/compose` overhead minimal.
- **Hand-authored examples** rather than skill-generated ones. The skill docs will be validated by Jeff via manual `/compose` calls on a variety of EDM requests — the bundled examples serve as ground-truth references for the skill to match against.
