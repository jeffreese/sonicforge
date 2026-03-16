---
paths:
  - "src/stores/**"
  - "src/ui/**"
---

# All Composition Mutations Through dispatch()

Never modify CompositionStore state directly. All mutations must go through `CompositionStore.dispatch(command)` where `command` is a reversible command object with `do()`, `undo()`, and `description`.

## Why

ADR-004 + ADR-006: The reactive store pattern with command dispatch enables undo/redo, grouped operations, and multiple subscribers (UI, engine, export) all staying in sync. Direct mutation bypasses the undo stack and breaks subscriber notifications.

## Correct

```ts
compositionStore.dispatch({
  description: 'Add note C4 at 0:0:0',
  do: () => { /* add note */ },
  undo: () => { /* remove note */ },
});
```

## Incorrect

```ts
// Direct mutation — don't do this
compositionStore.state.sections[0].tracks[0].notes.push(newNote);
```

## Store subscriber lifecycle

Components must subscribe to stores on `connectedCallback` and unsubscribe on `disconnectedCallback`. For high-frequency updates (transport position), use `requestAnimationFrame` to throttle re-renders.
