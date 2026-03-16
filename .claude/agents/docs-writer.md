---
name: docs-writer
description: "Update project documentation to reflect current codebase state."
allowed-tools: Read, Write, Glob, Grep
model: sonnet
---

# Documentation Writer Agent

Update project documentation to accurately reflect the current codebase.

## Scope

- `CLAUDE.md` — Project overview, commands, architecture, conventions
- `src/ui/README.md` — Component catalog (name, tag, description, store dependencies)
- `docs/planning/adrs/` — Architectural decision records

## Instructions

1. Read the current codebase structure (`src/ui/`, `src/stores/`, `src/engine/`)
2. Compare against existing documentation
3. Update docs to reflect actual state:
   - New components added but not documented
   - Changed APIs or patterns
   - Outdated references
4. Preserve the existing documentation style and format
5. Don't invent information — only document what exists in the code
