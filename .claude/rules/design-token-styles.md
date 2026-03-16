---
paths:
  - "src/ui/**"
---

# Design Token Styles — No Raw Tailwind in Components

Do not write raw Tailwind utility classes directly in Lit component templates. Import semantic style maps from `src/styles/components.ts` instead.

## Why

ADR-002: A design token abstraction layer sits between Tailwind and components. This ensures theme switching (dark/light) only changes CSS custom properties — no component code changes needed. It also enforces visual consistency across the app.

## Correct

```ts
import { btn, surface } from '../styles/components.js';

html`<button class=${btn.primary}>Play</button>`
html`<div class=${surface.elevated}>...</div>`
```

## Incorrect

```ts
// Raw Tailwind classes in template — don't do this
html`<button class="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-400">Play</button>`
```

## Where tokens live

- `src/styles/tokens.css` — CSS custom properties (values per theme)
- `src/styles/components.ts` — Exported style maps that components import
- `tailwind.config.ts` — Maps semantic token names to CSS custom properties
