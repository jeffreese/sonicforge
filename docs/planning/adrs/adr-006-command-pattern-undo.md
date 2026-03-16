---
title: "ADR-006: Command Pattern for Undo/Redo"
phase: 2
project: sonicforge
date: 2026-03-15
status: accepted
---

# ADR-006: Command Pattern for Undo/Redo

## Status

Accepted

## Context

The visual editor allows users to modify compositions — add, move, resize, delete notes. These edits need to be reversible. The undo/redo system also needs to support grouped operations (e.g., moving a multi-note selection = one undo step) and should scale to future DAW features like arrangement editing and automation.

## Decision

We will use the **command pattern** for undo/redo. Each edit is a command object with `do()`, `undo()`, and `description`. Commands are pushed onto an undo stack via `CompositionStore.dispatch(command)`. All composition mutations go through this dispatch method.

## Alternatives Considered

### State snapshots (memento pattern)
- **Pros:** Simpler to implement — snapshot entire CompositionStore state before each edit, restore on undo
- **Cons:** Memory grows linearly with edit count. Large compositions (hundreds of notes across many tracks) make snapshots expensive. No self-describing history — can't show "Undo: move note C4."

### Diff-based (store deltas)
- **Pros:** Memory efficient, captures exact changes
- **Cons:** More complex to implement correctly than command pattern. Doesn't naturally support grouped operations or macro recording.

## Consequences

### Positive
- Minimal memory usage — stores operations, not full state copies
- Self-describing history enables undo panel: "Undo: delete 3 notes"
- Natural support for grouped operations (compound commands)
- Opens the door to macro recording (replay a sequence of commands)
- Standard pattern for DAW applications — well understood

### Negative
- Every mutation needs a corresponding command class (more code than snapshot approach)
- Bugs in command `undo()` logic can corrupt state — need careful testing
- Commands must be pure with respect to the composition state — no hidden side effects

## Related Decisions

- ADR-004: Reactive stores (commands dispatch through CompositionStore)
- ADR-005: Integrated timeline/editor (produces the edit commands)
