---
title: "Phase 2 Summary: Technical Planning"
project: sonicforge
date: 2026-03-15
---

## Key Outcomes

- **UI framework decided: Lit** (ADR-001) — Web components with reactive properties, no virtual DOM. Chosen over React because Tone.js manages its own state and virtual DOM reconciliation fights that model. ~5KB footprint.
- **Styling decided: Tailwind + design token abstraction** (ADR-002) — Semantic style maps (`btn.primary`, `surface.elevated`) imported by components. No raw Tailwind classes in templates. CSS custom properties enable theme switching (dark default, light mode planned).
- **Light DOM for all components** (ADR-003) — Tailwind's global stylesheet needs to reach component internals. No shadow DOM anywhere.
- **State management: reactive stores** (ADR-004) — Four stores (Composition, Transport, Mixer, UI) bridge Tone.js engine and Lit components. Observable pattern with subscriber lifecycle management. CompositionStore is the central document that both Claude and the user edit.
- **Integrated timeline/editor** (ADR-005) — Current section-level timeline evolves into a full arrangement view with beat-granular navigation, visible notes, and editing tools. Arrangement bar (minimap) + main canvas (piano roll) + track selector.
- **Command pattern for undo/redo** (ADR-006) — Reversible command objects dispatched through CompositionStore. Enables grouped operations and undo history display.
- **Audio export: WAV + OGG** (ADR-007) — Browser-native encoding for both formats. No external libraries needed. Stem export as stretch goal.
- **DAW direction confirmed as future vision** — SonicForge evolving from playback engine to composition workbench. Informs current architecture decisions.
- **MIDI moved to non-goals** — May revisit but not planning for now.
- **All-at-once migration strategy** — 7 vanilla UI files rewritten to Lit. Engine/schema/utility layers untouched. Bottom-up order by complexity.

## Documents Produced

- **technical-spec.md** — Full architecture: system overview, component breakdown (10 Lit components), data flow for core actions, technology decisions with rationale, migration strategy, planned features (draft)
- **adrs/** — 7 ADRs covering all major architectural decisions (accepted)

## Open Questions

- None blocking Phase 3. All major technical decisions resolved.

## Context for Next Phase

Phase 3 (Development Preparation) builds the dev config that will be exported to the SonicForge repo:

- **CLAUDE.md** should reference the Lit + Tailwind + stores architecture, composition JSON schema, engine layer boundaries, and the design token pattern
- **Task breakdown** should follow the migration strategy: foundation (Lit/Tailwind/stores setup) → store implementation → component migration (bottom-up) → integrated editor → audio export
- **Rules** should enforce ADR decisions: no React imports, no shadow DOM, no raw Tailwind in components, all composition mutations through CompositionStore.dispatch()
- The existing SonicForge `.claude/` config (compose/iterate/explain/play skills, composition-format and music-theory rules) should be preserved and integrated — those are working and valuable
- Remember this is a retrofit: the exported config will be applied to an existing codebase, not a greenfield project
