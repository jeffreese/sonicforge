---
paths:
  - "src/**"
---

# Tests Written With Implementation

All new code includes co-located test files. A component, store, or engine module is not complete without its tests.

## Convention

- Test files live next to source: `sf-transport-bar.test.ts` beside `sf-transport-bar.ts`
- Store tests: `composition-store.test.ts` beside `composition-store.ts`
- Engine tests: `engine.test.ts` beside `engine.ts`
- Use Vitest (`import { describe, it, expect } from 'vitest'`)

## When writing new code

1. Write the implementation
2. Write tests in the same commit
3. Run `pnpm test` to verify

Don't defer tests to a separate task or "testing phase." Tests are part of the implementation.
