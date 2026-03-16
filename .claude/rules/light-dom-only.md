---
paths:
  - "src/ui/**"
---

# Light DOM Only — No Shadow DOM

All Lit components must use light DOM. Override `createRenderRoot` to return `this`:

```ts
createRenderRoot() { return this; }
```

Do not use Lit's default shadow DOM. Do not use `adoptedStyleSheets`, `::slotted`, or shadow-DOM-specific CSS selectors.

## Why

ADR-003: Tailwind's global stylesheet must reach component internals. Shadow DOM blocks this and would require duplicating styles into every shadow root. SonicForge is a single-page app, not a distributed component library — encapsulation adds complexity without benefit.
