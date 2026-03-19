---
title: "ADR-008: Fixed Viewport DAW Layout"
date: 2026-03-19
status: accepted
---

# ADR-008: Fixed Viewport DAW Layout

## Status

Accepted

## Context

As the piano roll timeline replaced the simple section-level view, the page grew taller — the canvas, mixer, sample explorer, and composition loader all stacked vertically and required window scrolling. This is a poor fit for a DAW-style workbench where the user needs persistent access to transport controls, the mixer, and loading tools while working in the timeline.

## Decision

The app uses a **fixed viewport layout** (`h-screen flex flex-col overflow-hidden`). The window never scrolls. Three regions:

- **Header** (flex-shrink-0): Transport bar + composition info. Always visible at top.
- **Center** (flex-1 min-h-0): Arrangement canvas. Fills remaining space. All scrolling and zooming is internal to the canvas via wheel events.
- **Footer** (flex-shrink-0): Mixer, sample explorer, composition loader, controls legend. Always visible at bottom. Panels that expand (loader textarea) use floating popovers rather than inline expansion, so they don't push the layout.

This means **no component in the footer may grow unboundedly** — expandable content must float above as an overlay.

## Alternatives Considered

### Scrollable page with sticky header/footer
- **Pros:** Simpler CSS, natural browser scrolling
- **Cons:** Scroll position fights with canvas internal scroll. Hard to prevent canvas wheel events from scrolling the page. Sticky positioning has z-index complexity with popovers.

### Resizable split panes
- **Pros:** User controls how much space each section gets
- **Cons:** Significant UI complexity (drag handles, min sizes, persistence). Premature — the current three-region split works well.

## Consequences

- Footer panels must use floating overlays (popovers, drawdowns) for expandable content — inline expansion is not allowed as it steals space from the canvas.
- The canvas relies on `clientHeight` from flex layout rather than computing its own height from content — it fills whatever space is available.
- New panels added to header or footer must be `flex-shrink-0` and kept compact.
- Future features (property panels, automation editors) should either float as overlays or replace existing footer panels, not stack below them.

## Related Decisions

- ADR-005: Integrated timeline/editor (the canvas that fills the center region)
- ADR-003: Light DOM (no shadow DOM barriers for the layout flex context)
