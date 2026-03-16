---
title: "ADR-002: Tailwind CSS with Design Token Abstraction"
phase: 2
project: sonicforge
date: 2026-03-15
status: accepted
---

# ADR-002: Tailwind CSS with Design Token Abstraction

## Status

Accepted

## Context

SonicForge needs a styling approach that supports theming (dark/light mode), consistency across components, and maintainability as the UI grows. The existing approach is a single `styles.css` with a dark indigo/purple theme. With the move to Lit components, we need a strategy that works with Lit's light DOM and scales to a growing component library.

## Decision

We will use **Tailwind CSS** for styling, but **not as raw utility classes in components**. An abstraction layer sits between Tailwind and Lit components:

1. `tailwind.config.ts` defines semantic design tokens as CSS custom properties
2. `src/styles/tokens.css` maps token values per theme (dark default, light via `.theme-light`)
3. `src/styles/components.ts` exports typed style maps that Lit components import

Components reference semantic names (`btn.primary`, `surface.elevated`), never raw Tailwind classes.

## Alternatives Considered

### Raw Tailwind in templates
- **Pros:** Fast to write, no abstraction layer to maintain
- **Cons:** Theme changes require touching every component. No centralized control. Inconsistency creeps in as components multiply. Dark/light mode becomes a nightmare of conditional classes.

### CSS Modules
- **Pros:** Scoped styles, familiar CSS authoring
- **Cons:** Doesn't pair well with Lit's template literals. No utility-first speed. Theming still requires custom property plumbing.

### Plain CSS custom properties (no Tailwind)
- **Pros:** Zero dependencies, full control
- **Cons:** Slower to author, no utility shortcuts, have to build responsive/spacing/typography systems from scratch

## Consequences

### Positive
- Theme switching changes CSS custom property values only — no component changes
- Consistent vocabulary across all components (semantic names, not color codes)
- One place to update when the design system evolves
- Tailwind's utility power available for rapid development
- Type-safe style maps catch typos at build time

### Negative
- Extra abstraction layer to maintain (`components.ts`)
- Developers must use the style maps, not raw classes — requires discipline
- Initial setup cost to define the token set

## Related Decisions

- ADR-001: Lit over React (light DOM enables Tailwind's global stylesheet to reach components)
- ADR-003: Light DOM for all components
