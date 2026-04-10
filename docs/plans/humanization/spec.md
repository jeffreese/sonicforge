# Humanization

## Overview

Add natural-sounding timing and velocity variation to note playback. Currently every note fires at exactly the scheduled time with uniform velocity, producing a mechanical, robotic feel. Humanization introduces subtle randomization that mimics the imprecision of a real player.

## Why

This is the highest-impact, lowest-effort improvement to audio quality. No new samples needed — it's pure engine code. Even with perfect samples, perfectly quantized playback sounds artificial.

## Requirements

- **Timing jitter**: Each note's start time is offset by a random amount within a configurable range (default ±15ms). The range should be per-track so some instruments can be tighter than others.
- **Velocity variation**: Each note's velocity is randomized within a configurable range (default ±10% of the note's written velocity), clamped to 1–127.
- **Humanization amount**: A single 0–100 knob per track that scales both timing and velocity variation. 0 = perfectly quantized (current behavior), 100 = full humanization.
- **Deterministic seeding**: Given the same composition and humanization settings, playback should produce the same timing/velocity offsets. Use a seed derived from note position so repeated plays are consistent but still human-sounding.
- **Respect articulations**: Ghost notes should have more velocity variance. Accented notes should have less timing variance.

## Architecture

- Lives in `src/engine/TrackPlayer.ts` — applied at note scheduling time, not stored in composition JSON.
- Humanization settings stored in `MixerStore` per channel (alongside volume, pan, mute, solo).
- No schema changes needed — this is a playback-time effect, not a composition property.

## Dependencies

- None. Can be implemented independently of all other audio quality features.

## Out of Scope

- Swing/groove templates (future enhancement that could build on this)
- Per-note humanization overrides in the composition JSON
- UI controls (can be exposed later in the mixer; engine-first)
