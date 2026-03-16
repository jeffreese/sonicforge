---
name: friction-log
description: "Quick friction capture mid-session — log what's harder than it should be."
allowed-tools: Read, Write
---

# /friction-log — Log Friction

## Steps

1. **Parse the friction** from the argument (e.g., `/friction-log tone.js sampler cleanup is confusing`).

2. **Append to friction log.** Add to `.claude/friction.md`:
   ```markdown
   - <timestamp> <description of friction>
   ```

3. **Acknowledge briefly.** One line: "Logged. `/retro` will pick this up."

Keep it fast — this is meant to be a 2-second capture, not an analysis.
