---
name: play
description: "Open the SonicForge browser player and load a composition for playback."
allowed-tools: Read, Glob, Bash
---

# /play — Open the Browser Player

## Steps

1. **Identify the composition.** If a name is given, find the matching file in `compositions/`. Otherwise use the most recently modified `.json` in `compositions/`.

2. **Ensure the dev server is running.** Check if Vite is already running. If not, start it with `pnpm dev` in the background.

3. **Open the browser.** Navigate to the local dev server URL (typically `http://localhost:5173`).

4. **Load the composition.** Read the composition JSON and use the browser's paste/load mechanism to load it.

5. **Confirm** the player is open and the composition is loaded.
