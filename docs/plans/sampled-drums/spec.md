# Sampled Drums

## Overview

Replace the current synthesized drum kit (`DrumKit.ts` uses Tone.js oscillators/noise) with samples extracted from the GM soundfont. The synth drums sound thin and artificial compared to even basic sample-based drums.

## Why

Drums are the rhythmic foundation of most compositions. Synthetic oscillator drums are immediately recognizable as "computer music." Even a basic soundfont drum kit sounds significantly more realistic than synthesized hits because it captures the complex transients and harmonics of real percussion.

## Requirements

- Extract GM drum map samples from the soundfont (kick, snare, hi-hat open/closed, toms, crash, ride, etc.)
- Extract at 2–3 velocity layers per hit (drums are especially velocity-sensitive)
- Update `DrumKit.ts` to use `Tone.Sampler` (or `Tone.Players`) instead of synth voices
- Maintain the same API surface so `TrackPlayer` doesn't need changes
- Map GM drum note numbers to sample files

## Architecture

- New sample directory: `public/samples/drum_kit/`
- Manifest includes GM note numbers mapped to sample files
- `DrumKit.ts` loads samples on init, routes notes to the correct sample
- Velocity layer selection follows the same logic as the sample quality overhaul (if implemented first, reuse the pattern)

## Dependencies

- Benefits from the sample quality overhaul (shared extraction patterns), but can be done independently
- Extraction script needs a drum-specific mode (GM drums use channel 10, note numbers map to specific percussion sounds)

## Out of Scope

- Multiple drum kits (e.g., electronic, jazz, orchestral) — just the standard GM kit for now
- Per-hit effects (individual EQ/compression per drum sound)
- Drum pattern editor UI
