# Round-Robin Samples

## Overview

Extract multiple takes of the same note at the same velocity and alternate between them during playback. This eliminates the "machine gun effect" where repeated notes sound identical because the same sample fires every time.

## Why

When a real pianist plays the same note twice, the two strikes are never identical — slightly different timing in the hammer mechanism, different resonance from the strings, micro-variations in the player's touch. Playing the exact same sample repeatedly is one of the most recognizable tells of sampled music.

## Requirements

- Extract 2–3 round-robin variants per note/velocity combination
- Variants are created by slightly varying the rendering parameters (timing offset, tiny gain differences) during extraction
- Engine alternates between variants sequentially (not randomly — sequential avoids accidentally repeating)
- Track the current round-robin index per note per instrument
- Reset round-robin index on transport stop

## Architecture

- Extraction: render each note multiple times with micro-varied parameters
- File naming: `{note}_v{velocity}_rr{index}.ogg` (e.g., `C4_v90_rr1.ogg`)
- Manifest includes round-robin count
- `SampleLoader` loads all variants
- `TrackPlayer` maintains a round-robin counter per note and cycles through variants

## Dependencies

- Should be implemented after the sample quality overhaul (builds on multi-velocity infrastructure)
- Increases sample count by 2–3x — combined with the quality overhaul, total per instrument could be 60+ notes × 4 velocities × 3 RR = ~720 files (~36MB per instrument)

## Size Considerations

- With round-robins, lazy loading becomes more important
- Consider extracting round-robins only for the most commonly repeated notes (mid-range) as a compromise
- Or start with 2 RR variants instead of 3

## Out of Scope

- True re-synthesis or physical modeling (different approach entirely)
- Random selection (sequential cycling is simpler and avoids repeats)
