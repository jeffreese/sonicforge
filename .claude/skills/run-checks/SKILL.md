---
name: run-checks
description: "Run the full project check suite: lint, type-check, and tests."
allowed-tools: Bash
---

# /run-checks — Run All Checks

## Steps

1. Run all three checks and report results:

```bash
pnpm lint && pnpm build && pnpm test
```

2. If any check fails, diagnose the issue and suggest a fix. Don't just report the error — read the relevant code and explain what's wrong.

3. If all checks pass, confirm with a one-liner.
