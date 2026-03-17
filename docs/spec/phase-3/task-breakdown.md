---
title: "Task Breakdown"
phase: 3
project: sonicforge
date: 2026-03-15
status: draft
---

# Task Breakdown

## Epics Overview

| Epic | Description | MVP? | Dependencies |
|------|-------------|------|--------------|
| Foundation | Add Lit, Tailwind, PostCSS, Biome, Vitest. Design tokens, store infra, app shell. | Yes | — |
| Reactive Stores | Implement four stores, wire to engine callbacks. | Yes | Foundation |
| Component Migration | Rewrite 7 vanilla UI files as Lit web components. | Yes | Stores |
| Dev Tooling & Cleanup | Update .claude/ config, remove old code, finalize docs. | Yes | Component Migration |
| Integrated Editor | Beat-grid canvas, note rendering, editing tools in `<sf-arrangement>`. | Post-MVP | Component Migration |
| Audio Export | `<sf-export-panel>` + offline rendering via Tone.Offline. WAV + OGG. | Post-MVP | Stores |

---

## Epic: Foundation

### Tasks

| # | Task | Size | Dependencies |
|---|------|------|--------------|
| 1 | Add Lit, Tailwind, PostCSS to project. Update `vite.config.ts` for Lit + Tailwind. | S | — |
| 2 | Add Biome config. Add `pnpm lint` and `pnpm format` scripts. | S | — |
| 3 | Add Vitest config. Add `pnpm test` script. Write one smoke test to verify setup. | S | — |
| 4 | Switch package manager from npm to pnpm (remove `package-lock.json`, generate `pnpm-lock.yaml`). | S | — |
| 5 | Create design token layer: `src/styles/tokens.css` (CSS custom properties) + `src/styles/components.ts` (semantic style maps). Carry forward existing indigo/purple dark theme. | M | 1 |
| 6 | Create store infrastructure: base `Store` class with subscribe/notify pattern in `src/stores/`. | S | — |
| 7 | Create `<sf-app>` shell component. Register as custom element. Wire into `main.ts` entry point alongside existing code (both can coexist during migration). | M | 1, 5 |
| 8 | Add husky + lint-staged. Pre-commit hook runs Biome check and Vitest on staged files. | S | 2, 3 |

### Acceptance Criteria

- `pnpm dev` serves the app with Lit + Tailwind active
- `<sf-app>` renders in the page
- Design tokens are applied (indigo/purple dark theme via CSS custom properties)
- Store base class exists with subscribe/notify API
- Biome and Vitest are configured and passing
- Existing functionality is unchanged

---

## Epic: Reactive Stores

### Tasks

| # | Task | Size | Dependencies |
|---|------|------|--------------|
| 1 | Implement `TransportStore` + tests — playback state, position, BPM, time signature, loop region. Wire to Engine transport callbacks. | M | Foundation |
| 2 | Implement `MixerStore` + tests — per-channel volume, pan, mute, solo. Bidirectional binding with MixBus. | M | Foundation |
| 3 | Implement `UIStore` + tests — active panel, selected instrument, keyboard octave, zoom, snap. Pure UI state, no engine involvement. | S | Foundation |
| 4 | Implement `CompositionStore` + tests — loaded composition JSON, metadata, instruments, sections, tracks, notes. Wire to Engine load/schedule. Implement `dispatch(command)` pattern for mutations. | L | Foundation |
| 5 | Integration verification — console-log all store state changes, verify correct flow with existing engine during playback of a test composition. | S | 1-4 |

### Acceptance Criteria

- All four stores implemented with typed interfaces
- Engine callbacks push state to stores
- Store changes notify subscribers
- CompositionStore accepts mutations via `dispatch()`
- Verified with console logging before any UI work begins

---

## Epic: Component Migration

All tasks include co-located tests. A component is not done until its tests pass.

### Tasks

| # | Task | Size | Dependencies |
|---|------|------|--------------|
| 1 | `<sf-composition-loader>` + tests — Paste JSON, upload file, drag-and-drop. Schema validation. Writes to CompositionStore. | M | Stores |
| 2 | `<sf-transport-bar>` + tests — Play/pause/stop buttons, position display (bar:beat), BPM display. Subscribes to TransportStore. | M | Stores |
| 3 | `<sf-mixer>` + `<sf-channel-strip>` + tests — Container with per-instrument channel strips. Volume slider, pan knob, mute/solo. Bidirectional binding to MixerStore. | M | Stores |
| 4 | `<sf-sample-explorer>` + `<sf-keyboard>` + tests — Browse GM instruments by category, preview via SampleAuditioner, computer keyboard play mode. | M | Stores |
| 5 | `<sf-sample-picker>` + tests — Modal/dropdown for inline instrument swap from mixer. Category-filtered with preview. Hot-swaps in CompositionStore and Engine. | M | 3, Stores |
| 6 | `<sf-arrangement>` + tests — Migrate current timeline as-is: section grid, playhead, click-to-seek, section looping. Canvas-based. Subscribes to TransportStore + CompositionStore. | M | Stores |
| 7 | Wire all components into `<sf-app>` shell. End-to-end integration test. | S | 1-6 |

### Acceptance Criteria

- Every migrated component behaves identically to the vanilla version
- Every component has co-located tests that pass
- Full load → play → mix → seek → loop workflow works end-to-end
- No vanilla UI code remains active (old files still present but unused — cleanup is next epic)

---

## Epic: Dev Tooling & Cleanup

### Tasks

| # | Task | Size | Dependencies |
|---|------|------|--------------|
| 1 | Delete old vanilla UI files from `src/ui/`. Remove old `styles.css`. Update `main.ts` entry point to use only Lit components. | S | Component Migration |
| 2 | Update `composition-format` rule to reference `src/schema/composition.ts` instead of inlining schema details. | S | — |
| 3 | Review and update `/compose`, `/iterate`, `/explain`, `/play` skills for compatibility with new architecture. Preserve existing functionality. | M | — |
| 4 | Create `src/ui/README.md` — component catalog table (referenced by CLAUDE.md via `@`). | S | Component Migration |
| 5 | Add a `tests-with-implementation` rule to `.claude/rules/` — all new code includes co-located tests. | S | — |

### Acceptance Criteria

- No dead vanilla UI code remains
- Claude skills and rules reference the canonical schema file
- `src/ui/README.md` exists and is accurate
- `pnpm build`, `pnpm lint`, and `pnpm test` all pass clean

---

## Implementation Sequence

### Critical Path

```
Foundation (1-8) → Stores (1-5) → Components (1-7) → Cleanup (1-5)
```

### Suggested Build Order

1. **Foundation tasks 1-4** in parallel (Lit/Tailwind, Biome, Vitest, pnpm switch — all independent)
2. **Foundation tasks 5-6** (design tokens + store base class — token layer needs Tailwind from step 1)
3. **Foundation tasks 7-8** (app shell + husky)
4. **Stores 1-3** in parallel (Transport, Mixer, UI stores — all independent, just need the base class)
5. **Stores 4** (CompositionStore — largest single task, can start alongside 1-3 but will take longer)
6. **Stores 5** (integration verification — needs all stores)
7. **Components 1-2** in parallel (composition loader + transport bar — simplest, validates the pattern)
8. **Components 3-6** (mixer, explorer, sample picker, arrangement — can be parallelized in pairs)
9. **Components 7** (wire into shell, end-to-end test)
10. **Cleanup 1-5** (can be parallelized — mostly independent tasks)

### Parallelization Notes

- Foundation tasks 1-4 are fully independent — do them all at once
- Store implementations 1-3 are independent — can be built in parallel
- Component migrations have minimal interdependency (only sample picker depends on mixer)
- Cleanup tasks are mostly independent

## Post-MVP Backlog

### Integrated Editor
Replaces the section-grid timeline with a beat-granular arrangement view and note editing. Includes arrangement bar (minimap), main canvas (piano roll), track selector, pitch ruler, editor toolbar (draw/select/erase), and snap-to-grid. Edits write to CompositionStore via `dispatch()`. Full spec in `phase-2/technical-spec.md` under "Integrated Editor."

**Depends on:** Component Migration complete (builds on `<sf-arrangement>` shell).

### Audio Export
WAV + OGG export via `Tone.Offline` non-real-time rendering. `<sf-export-panel>` with format selector, progress bar, download. Stem export (per-track solo render) as stretch goal. Full spec in `phase-2/technical-spec.md` under "Audio Export."

**Depends on:** Reactive Stores (needs CompositionStore + MixerStore state).

### Undo/Redo
Command pattern already designed (ADR-006). Each edit is a reversible command object dispatched through CompositionStore. Undo stack, redo stack cleared on new edits. Enables undo history display and grouped operations.

**Depends on:** Integrated Editor (editing is what generates undo-able commands).

### Light Theme
CSS custom property swap via `.theme-light` class on root. Design token values defined in `phase-2/technical-spec.md`. No component changes needed — just new values in `tokens.css`.

### DAW-Direction Features
Arrangement editing (section move/copy/split/merge), automation lanes, plugin extensibility, MIDI controller input. Furthest out. See `phase-2/technical-spec.md` "DAW Direction" section.
