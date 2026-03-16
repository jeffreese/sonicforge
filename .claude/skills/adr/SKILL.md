---
name: adr
description: "Capture an architectural decision as an ADR during development."
allowed-tools: Read, Write, Glob
---

# /adr — Capture Architectural Decision

## Steps

1. **Parse the title** from the argument (e.g., `/adr offline-first caching`).

2. **Determine the next ADR number.** Read `docs/planning/adrs/` to find the highest existing number and increment.

3. **Gather context.** From the current conversation, identify:
   - What was decided
   - What alternatives were considered
   - Why this option was chosen
   - What the consequences are (positive and negative)

4. **Cross-reference existing ADRs.** Check `docs/planning/adrs/` for related or potentially conflicting decisions. Note any relationships.

5. **Write the ADR** to `docs/planning/adrs/adr-NNN-<kebab-case-title>.md`:

```markdown
---
status: accepted
date: YYYY-MM-DD
---

# ADR-NNN: <Title>

## Status
Accepted

## Context
<What prompted this decision>

## Decision
<What we decided>

## Alternatives Considered
<What else was evaluated and why it was rejected>

## Consequences
<Positive and negative impacts>

## Related Decisions
<Links to related ADRs>
```

6. **Update CLAUDE.md** if the decision affects the ADR summary list.

7. **Suggest a rule** if the decision should be enforced during development (e.g., "Want me to add a rule to enforce this?").
