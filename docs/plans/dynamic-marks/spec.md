# Dynamic Marks Implementation

## Overview

Wire up the `DynamicMark` type that already exists in the composition schema to the engine. Currently, dynamic marks (pp, mf, ff, crescendo, decrescendo) are defined in the schema but completely ignored during playback.

## Why

Dynamic marks are how composers indicate expression — getting louder, getting softer, sudden accents. Without them, every section plays at the same intensity regardless of what the composition specifies. This is low-hanging fruit since the data model already exists.

## Requirements

- Parse `DynamicMark` entries from composition tracks during scheduling
- Apply dynamic level as a velocity multiplier to all notes within the mark's range
- Support gradual transitions (crescendo/decrescendo) — linearly interpolate velocity between start and end levels over the mark's duration
- Support sudden transitions — snap to the new level immediately
- Dynamic marks should stack with per-note velocity (mark sets the baseline, note velocity is relative to it)

## Architecture

- Engine reads dynamic marks during `TrackPlayer` scheduling
- Build a "dynamic envelope" per track — a function from beat position to velocity multiplier
- Apply the multiplier at note scheduling time, before humanization (if present)
- No UI needed for v1 — marks come from composition JSON

## Dependencies

- None. Schema already defines `DynamicMark`. Engine just needs to read it.

## Out of Scope

- UI for adding/editing dynamic marks (future piano-roll enhancement)
- Hairpin rendering in timeline visualization
- MIDI CC-style continuous expression (beyond what DynamicMark covers)
