# ADR Capture During Development

Watch for significant architectural decisions being made during development. A decision is ADR-worthy when it meets **at least two** of:

- Hard to reverse — changing it later requires substantial rework
- Affects multiple components — shapes how different parts interact
- Had real alternatives — other viable options were deliberately rejected
- Driven by non-obvious reasoning — the "why" isn't self-evident
- A future developer would question it — someone new would ask "why not X?"

After the decision is reached (not during deliberation), briefly suggest:

> "That's an ADR-worthy decision — want me to capture it? `/adr [short title]`"

Cross-reference existing ADRs in `docs/planning/adrs/` to avoid duplicating or contradicting established decisions.

Don't over-trigger. Skip implementation details that are easily changed, choices with no real alternative, or decisions already captured.
