# Improvements Log

Changes made to rules, skills, and config based on retro findings.

## 2026-03-15 — Post Foundation + Reactive Stores session

- **`.claude/rules/store-mutations.md`** — Fixed Command interface: `do()` → `execute(comp)`, added `comp` parameter to match actual implementation
- **`.claude/rules/lit-components.md`** — Changed store access pattern from "Lit context" to "direct singleton imports" to match actual architecture
- **`.claude/rules/session-break.md`** — Strengthened to explicitly block "ask instead of invoke" failure mode (done by user mid-session)
- **`.claude/skill-watch.md`** — Added "Biome Auto-Fix on Write" pattern (1 observation, watching)
