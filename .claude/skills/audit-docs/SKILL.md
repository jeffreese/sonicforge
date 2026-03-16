---
name: audit-docs
description: "Compare code state against planning docs and flag drift."
allowed-tools: Read, Glob, Grep
---

# /audit-docs — Documentation Drift Audit

Compare the current codebase against planning documents to identify where implementation has diverged from the plan.

## Steps

1. **Read planning docs:**
   - `docs/planning/phase-2/technical-spec.md` — architecture, components, data flow
   - `docs/planning/phase-3/task-breakdown.md` — implementation plan
   - `docs/planning/adrs/` — architectural decisions

2. **Scan the codebase:**
   - List all files in `src/ui/`, `src/stores/`, `src/engine/`, `src/styles/`
   - Check which planned components exist vs. are missing
   - Check which stores are implemented vs. planned

3. **Compare:**
   - Components in tech spec vs. components in code
   - Store interfaces in tech spec vs. store implementations
   - Data flow patterns in tech spec vs. actual code patterns
   - ADR decisions vs. actual implementation choices

4. **Report:**
   - **Aligned**: Things that match the plan
   - **Diverged**: Things implemented differently than planned (not necessarily wrong — capture why)
   - **Missing**: Planned items not yet implemented
   - **Unplanned**: Code that exists but wasn't in the plan

5. **Suggest updates** to planning docs if divergence is intentional and should be documented.
