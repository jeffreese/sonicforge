---
paths:
  - "src/ui/**"
  - "src/main.ts"
---

# Lit Components Only — No React

All UI components use Lit web components. Do not import React, ReactDOM, Preact, or any React-like framework.

## Why

ADR-001: Lit was chosen because Tone.js manages its own audio state and React's virtual DOM reconciliation fights that model. Lit's native custom elements with reactive properties provide the component model without reconciliation overhead.

## Conventions

- All components extend `LitElement` and use `createRenderRoot() { return this; }` for light DOM (ADR-003)
- Component tag names use `<sf-*>` prefix: `<sf-transport-bar>`, `<sf-mixer>`
- Component files named `sf-component-name.ts` in `src/ui/`
- Use reactive properties (`@property`, `@state`) for component state
- Import store singletons directly (e.g., `import { transportStore } from '../stores/TransportStore'`)
