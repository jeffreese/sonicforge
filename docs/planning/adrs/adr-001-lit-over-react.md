---
title: "ADR-001: Lit over React for UI Components"
phase: 2
project: sonicforge
date: 2026-03-15
status: accepted
---

# ADR-001: Lit over React for UI Components

## Status

Accepted

## Context

SonicForge needs a component model for its UI layer. The current vanilla TypeScript DOM code (~7 files) works but lacks structure, reusability, and reactive state management. The core audio engine is built on Tone.js, which manages its own state (transport, samplers, effects) independently of any UI framework. Future plans include a visual composition editor (piano roll) and DAW-direction features that will increase UI complexity.

## Decision

We will use **Lit** as the UI component framework, using light DOM mode.

## Alternatives Considered

### React
- **Pros:** Mature ecosystem, large community, strong component patterns, user familiarity
- **Cons:** Virtual DOM fights Tone.js state management — leads to `useRef`/`useEffect` escape hatches. 40KB+ bundle. Reconciliation overhead is a concern for audio latency sensitivity. React's "UI as a function of state" model doesn't map well to imperative audio APIs.

### Vanilla TypeScript (formalized patterns)
- **Pros:** Zero dependencies, maximum control, no framework churn risk
- **Cons:** No built-in reactivity, manual DOM wiring, no standardized component lifecycle. Would require building a custom component base class that approximates what Lit already provides.

### Preact
- **Pros:** React API in 3KB, familiar patterns
- **Cons:** Same virtual DOM mismatch with Tone.js as React, just smaller

### Solid
- **Pros:** Signals-based, no virtual DOM, very fast, compiles away
- **Cons:** Smaller ecosystem, less established for this use case

## Consequences

### Positive
- No virtual DOM — avoids fighting Tone.js's imperative state model
- Native custom elements — web standards, not a framework abstraction
- ~5KB footprint vs React's 40KB+
- Reactive properties with automatic re-rendering removes manual DOM wiring
- Light DOM mode works naturally with Tailwind CSS
- Lifecycle callbacks (connectedCallback/disconnectedCallback) map cleanly to audio component needs

### Negative
- Smaller ecosystem than React — fewer pre-built components and community resources
- User has less familiarity with Lit than React (learning curve)
- Template literals syntax is different from JSX — team needs to adapt

## Related Decisions

- ADR-002: Tailwind with design token abstraction (styling approach works with Lit's light DOM)
- ADR-003: Light DOM for all components (driven by Tailwind + Lit combination)
