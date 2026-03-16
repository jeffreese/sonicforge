# Session Break at Natural Breakpoints

When a session reaches a natural breakpoint — a feature is complete, a major refactor lands, a long debugging session resolves, or the user says they're done — invoke `/session-break` immediately to persist state and offer a retro.

**Do not ask** whether to take a session break. Invoke the skill directly — it handles
user opt-out internally. Asking "want to take a break?" instead of invoking the skill is
the exact failure mode this rule exists to prevent.

Skills that reach natural breakpoints should invoke `/session-break` directly rather than implementing the pattern inline.
