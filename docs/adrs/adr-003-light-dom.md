---
title: "ADR-003: Light DOM for All Components"
phase: 2
project: sonicforge
date: 2026-03-15
status: accepted
---

# ADR-003: Light DOM for All Components

## Status

Accepted

## Context

Lit supports both shadow DOM (default, with style encapsulation) and light DOM (renders into the regular document tree). The choice affects how styles are applied, how components interact with global CSS, and how Tailwind integration works.

## Decision

All Lit components will use **light DOM** — no shadow DOM anywhere in the application.

## Alternatives Considered

### Shadow DOM everywhere (Lit default)
- **Pros:** Style encapsulation, no CSS leaks between components
- **Cons:** Tailwind's global stylesheet can't reach inside shadow roots. Would need to inject Tailwind styles into every shadow root — wasteful and complex. Breaks the design token architecture.

### Mixed — light DOM for most, shadow DOM for Canvas-heavy components
- **Pros:** Encapsulates complex pointer event handling in the editor
- **Cons:** Unnecessary — pointer events can be managed with standard CSS (`pointer-events`) and event handling. Mixed mode adds cognitive overhead about which components use which mode.

## Consequences

### Positive
- Tailwind classes work naturally across all components
- Design token CSS custom properties apply everywhere without injection
- Simpler mental model — one DOM, one stylesheet, one set of rules
- Easier debugging (all elements visible in the regular DOM tree)

### Negative
- No style encapsulation — components must be disciplined about class naming
- Global styles can unintentionally affect component internals (mitigated by Tailwind's utility approach and BEM-like naming where needed)

## Related Decisions

- ADR-001: Lit over React (Lit supports light DOM natively)
- ADR-002: Tailwind with design tokens (requires light DOM for global stylesheet access)
