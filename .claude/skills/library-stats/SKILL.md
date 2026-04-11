---
name: library-stats
description: "Print a report of the SonicForge composition library — key/BPM distributions, top tags and instruments, and unexplored dimensions."
allowed-tools: Read
---

# /library-stats — Report the Library Snapshot

Pure reporting skill. No composition generation, no file writes, no judgment calls — just surface the current shape of `compositions/` so the user can see what's already covered and what's unexplored.

## Steps

1. **Read the pre-rendered snapshot.** Read `tools/composition-index/snapshot.txt`. This file is maintained automatically by the PostToolUse hook (`tools/composition-index/dist/update.js`) on every composition write, so it's always current with the library state. Demo-tagged verification fixtures are already filtered out.

2. **Print the snapshot verbatim to the user.** Output the file contents inside a fenced code block so distributions and gap lists render as monospace. No commentary or interpretation — let the report speak for itself.

3. **If the file is missing**, tell the user to run `pnpm build:index && pnpm rebuild:index` to generate it. This can happen on a fresh clone before the indexer has been built.

## What the report contains

- **Track count** (excluding demo fixtures)
- **Key distribution**, sorted by frequency
- **BPM stats:** min, max, median, interquartile range
- **Time signatures** represented
- **Primary genre distribution** (first tag of each composition)
- **Drum pattern distribution** (4-on-floor / trap / half-time / breakbeat / other / none)
- **Top tags** across all modifiers, not just primary genres
- **Top 10 instruments** by frequency across compositions
- **EDM feature usage counts** (sidechain, LFOs, automation, synths, oneshots)
- **Library gaps** — dimensions the library hasn't explored yet, framed as opportunities
- **Excluded-demos footer** when verification fixtures were filtered

## Scope

This skill reports; it does not recommend, generate, or modify. For diversification cueing based on the same snapshot, use `/compose` — it consults the snapshot silently during underspecified composition requests.
