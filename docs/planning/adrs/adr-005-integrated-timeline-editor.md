---
title: "ADR-005: Integrated Timeline and Visual Editor"
phase: 2
project: sonicforge
date: 2026-03-15
status: accepted
---

# ADR-005: Integrated Timeline and Visual Editor

## Status

Accepted

## Context

Two related needs converged: (1) the existing timeline needs enhancement — currently section-level-only seeking, no visible note detail; (2) a visual composition editor (piano roll) is planned. The enhanced timeline (beat-granular seeking, visible notes) is 80% of a piano roll already — the only difference is whether you can edit what you see.

## Decision

We will **merge the timeline and visual editor into a single component** (`<sf-arrangement>`). It serves triple duty: visualization (see all notes), navigation (beat-granular seeking), and editing (draw/select/move/delete notes). The current section-level view becomes a compact arrangement bar (minimap) above the main editor canvas.

## Alternatives Considered

### Separate timeline and editor components
- **Pros:** Simpler individual components, can ship timeline enhancement without editor
- **Cons:** Two canvas-based views rendering overlapping data. Syncing playhead, zoom, scroll between them. Duplicated note rendering logic. Users would see the same notes in two places.

### Enhance timeline only, defer editor
- **Pros:** Less work now
- **Cons:** Would have to rebuild most of the same canvas rendering when the editor is eventually added. The enhanced timeline with note display IS the editor minus interaction handlers.

## Consequences

### Positive
- Single source of note visualization — no duplication
- Progressive disclosure: see notes by default, edit when you pick up a tool
- Playhead, seeking, zooming, and scrolling work identically for viewing and editing
- Arrangement bar preserves the quick section-level navigation users already know

### Negative
- Most complex component in the application — handles viewing, navigation, and editing
- Need careful interaction design: clicking in view mode = seek, clicking in edit mode = draw/select
- Must support both section-level overview (arrangement bar) and beat-level detail (main canvas) simultaneously

## Related Decisions

- ADR-004: Reactive stores (editor writes to CompositionStore, multiple components observe changes)
- ADR-006: Command pattern for undo/redo (editor actions must be reversible)
