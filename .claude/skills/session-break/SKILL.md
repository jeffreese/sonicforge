---
name: session-break
description: "Persist state, offer retro, and suggest clearing context at natural breakpoints."
---

# /session-break — Session Break

## Steps

1. **Check friction log.** Read `.claude/friction.md` if it exists. Note how much material has accumulated.

2. **Summarize progress.** Briefly state what was accomplished this session — commits made, features completed, bugs fixed.

3. **Offer retro.** If the friction log has substantive entries:
   > "There's material worth reviewing. Want to run `/retro` before clearing context?"

   If the journal is sparse or empty, skip the retro offer.

4. **Suggest clearing context.**
   > "Good stopping point. `/clear` when you're ready for a fresh context."

Keep it brief — one short message, not a wall of text.
