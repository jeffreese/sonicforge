---
title: "ADR-004: Reactive Stores for State Management"
phase: 2
project: sonicforge
date: 2026-03-15
status: accepted
---

# ADR-004: Reactive Stores for State Management

## Status

Accepted

## Context

SonicForge has two independent state owners: Tone.js (audio state — transport, samplers, effects) and the UI (interaction state — panels, selections, editing). The composition data sits between them — both need to read it, and the planned visual editor needs to write to it. The current implementation uses ad-hoc callbacks, which works but doesn't scale to bidirectional state flow or multiple consumers.

## Decision

We will use **small, typed reactive store classes** — one per domain (CompositionStore, TransportStore, MixerStore, UIStore). Stores are observable: Lit components subscribe for updates, the engine layer pushes state changes. No external state management framework.

## Alternatives Considered

### Redux / Zustand / external state library
- **Pros:** Battle-tested patterns, devtools, middleware
- **Cons:** Overkill for this application. Adds framework weight and concepts (actions, reducers, selectors) that don't map well to audio state. Tone.js state doesn't fit in a Redux store — it's imperative and side-effect-heavy.

### Keep ad-hoc callbacks
- **Pros:** Zero overhead, already working
- **Cons:** Doesn't scale. Adding the visual editor requires multiple components to observe composition changes. Cross-component communication becomes spaghetti. No clear ownership of state.

### Make Tone.js state reactive (proxy/observable wrapper)
- **Pros:** Single source of truth
- **Cons:** Fighting Tone.js internals. Transport position changes 4+ times per beat — reactive wrappers would fire excessive updates. Better to let the engine push summarized updates to stores at controlled frequency.

## Consequences

### Positive
- Clear state ownership — each store is the single source of truth for its domain
- Multiple components can subscribe to the same store (editor, timeline, mixer all watch CompositionStore)
- Bidirectional flow: UI writes to stores, stores notify engine, engine pushes back
- Scales to planned features: visual editor writes to CompositionStore, audio export reads from it, undo/redo layers on top
- No framework dependency — stores are plain TypeScript classes

### Negative
- Custom implementation to maintain (vs. using an established library)
- Need to manage subscription lifecycle carefully (subscribe on connect, unsubscribe on disconnect)
- High-frequency updates from transport require throttling/RAF to avoid over-rendering

## Related Decisions

- ADR-001: Lit over React (Lit's reactive controllers pair well with observable stores)
- ADR-005: Integrated timeline/editor (shares CompositionStore with multiple consumers)
