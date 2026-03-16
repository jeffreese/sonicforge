---
name: new-feature
description: "Capture a new feature request through structured interview, produce a spec and task breakdown, add to backlog."
allowed-tools: Read, Write, Glob, Grep
---

# /new-feature — Capture a New Feature

Structured interview to fully define a new feature so it's ready for development.

## Steps

1. **Gather context.** Before asking questions, read:
   - `docs/plans/backlog.md` — current priorities and queued work
   - `docs/planning/adrs/` — existing architectural decisions
   - `docs/planning/phase-2/technical-spec.md` — current architecture
   - `CLAUDE.md` — conventions and boundaries

2. **Start the interview.** Ask 2-3 questions at a time. Cover these areas in order:

   **What & Why** (1-2 rounds):
   - What does this feature do? What problem does it solve?
   - Who uses it? What's the user workflow?
   - What's explicitly out of scope for the first version?

   **Architecture** (1-2 rounds):
   - Which layers does it touch? (UI, stores, engine, schema, Claude skills)
   - Does it change the composition JSON schema? _(flag as high-risk if yes — schema changes affect Claude skills, validation, and existing compositions)_
   - Does it require new dependencies?
   - Does it conflict with or build on any existing ADRs?

   **Requirements** (1-2 rounds):
   - What are the acceptance criteria?
   - What should be tested?
   - Any performance or UX constraints?

   **Dependencies** (1 round):
   - Does this depend on other queued features?
   - Does anything in the backlog depend on this?

3. **Scope check.** After gathering requirements, assess complexity:
   - If the feature is well-defined and implementation is clear → proceed to spec
   - If the feature involves significant unknowns (new technology, unclear UX, needs user research) → suggest taking it to Forge for deeper planning: "This feels like it needs product-level planning. Want to seed a Forge project for this?"
   - Threshold: if the interview exceeds ~8 questions without converging, it's probably Forge-sized

4. **Generate the spec.** Create `docs/plans/<feature-name>/spec.md`:
   ```markdown
   ---
   title: "<Feature Name>"
   priority: <TBD — set in step 6>
   status: queued
   created: <date>
   ---

   # <Feature Name>

   ## Overview
   <What and why>

   ## Requirements
   <Acceptance criteria as checklist>

   ## Architectural Notes
   <Which layers, ADR references, new decisions needed>

   ## Risk Flags
   <Schema changes, new dependencies, cross-feature dependencies>

   ## Dependencies
   <Other plans this depends on>

   ## Out of Scope
   <Explicitly excluded from first version>
   ```

5. **Generate the task breakdown.** Create `docs/plans/<feature-name>/tasks.md`:
   - Break into logical sections (setup, core implementation, integration, testing/cleanup)
   - Each task is a `- [ ]` checklist item
   - Tasks include their test expectations inline
   - Order tasks by dependency — `/next` reads top-to-bottom
   - Reference existing patterns or skills where applicable

6. **Set priority.** Show the current backlog and ask the user where this feature should be prioritized:
   > "Current backlog: 1. Migration, 2. [other]. Where should [feature] go?"

   Update `docs/plans/backlog.md` with the new feature at the chosen position.

7. **Check for ADR-worthy decisions.** If the interview surfaced architectural decisions, offer to capture them with `/adr`.

## Feature plan review

Present the spec and task breakdown for user review before finalizing. The user may adjust scope, reorder tasks, or add/remove requirements. Iterate until they confirm.
