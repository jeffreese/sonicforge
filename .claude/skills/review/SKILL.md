---
name: review
description: "Self-review staged changes against project ADRs, conventions, and rules."
allowed-tools: Read, Bash, Glob, Grep
---

# /review — Self-Review

Review staged or recent changes against the project's architectural decisions and conventions.

## Steps

1. **Get the diff.** Run `git diff --cached` (staged) or `git diff HEAD~1` (last commit) depending on context.

2. **Check against ADRs.** Read `docs/planning/adrs/` and verify:
   - No React/Preact imports (ADR-001)
   - No raw Tailwind classes in component templates (ADR-002)
   - No shadow DOM usage (ADR-003)
   - Composition mutations go through dispatch() (ADR-004/006)
   - UI components don't import from `tone` (architecture boundary)

3. **Check conventions** from CLAUDE.md:
   - `<sf-*>` naming for components
   - Style maps imported, not inline classes
   - Tests co-located with implementation
   - Store subscriber lifecycle (subscribe on connect, unsubscribe on disconnect)

4. **Check for common issues:**
   - Audio context operations without user gesture guard
   - Direct Tone.js object manipulation from UI code
   - Missing error handling on sample loading
   - Hardcoded values that should be design tokens

5. **Report findings.** For each issue:
   - File and line
   - What's wrong
   - What the fix is
   - Which ADR or convention it violates

If everything looks clean, say so in one line.
