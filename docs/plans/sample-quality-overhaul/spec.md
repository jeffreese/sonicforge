# Sample Quality Overhaul

## Overview

Overhaul the sample extraction pipeline and sampler engine to produce dramatically better-sounding instruments. Three changes bundled together because they all touch the extraction script and benefit from being deployed as a unit:

1. **Multi-velocity layers** — extract 3–4 velocity layers per note so the sampler can switch timbres, not just scale volume.
2. **Per-semitone sampling** — extract every semitone (not every 3) to eliminate pitch-shifting artifacts.
3. **Higher bitrate** — increase from 96kbps to 192kbps Opus to preserve transient detail and harmonics.

## Why

Single-velocity, sparse, compressed samples are the #1 reason SonicForge sounds like a video game. A real instrument's timbre changes with dynamics — a soft piano note has different harmonics than a loud one, not just less volume. Pitch-shifting notes across 3 semitones introduces audible warbling. And 96kbps Opus strips the high-frequency detail that gives instruments presence.

## Requirements

### Extraction (`scripts/extract-samples.py`)

- Extract at 4 velocity levels: pp (30), mp (60), mf (90), ff (120)
- Extract every semitone from C2 to C7 (61 notes instead of 21)
- Encode at 192kbps Opus
- Update manifest format to include velocity layers:
  ```json
  {
    "instrument": "acoustic_grand_piano",
    "velocityLayers": [30, 60, 90, 120],
    "notes": ["C2", "Db2", "D2", ...]
  }
  ```
- File naming: `{note}_v{velocity}.ogg` (e.g., `C4_v30.ogg`, `C4_v120.ogg`)

### Engine (`src/engine/`)

- `SampleLoader` / `InstrumentLoader`: Load all velocity layers per instrument
- `TrackPlayer`: Select the appropriate velocity layer at note scheduling time based on the note's velocity value. Use nearest-layer selection (e.g., velocity 45 → pp layer, velocity 75 → mp layer).
- Cross-fade between layers is a nice-to-have but not required for v1.

### Size Budget

- Current: ~21 notes × 1 layer × ~29KB = ~600KB per instrument
- New: ~61 notes × 4 layers × ~50KB (higher bitrate) = ~12MB per instrument
- With ~10 instruments, total is ~120MB. Acceptable for a client-side app, but worth noting.
- Consider lazy-loading instruments not in the current composition.

## Dependencies

- Requires FluidSynth and FFmpeg (already required by current extraction script)
- No schema changes — velocity is already per-note in the composition format

## Out of Scope

- Lossless formats (WAV/FLAC) — Opus at 192kbps is sufficient quality for browser playback
- Sample streaming — load full samples into memory (Tone.Sampler already does this)
- New soundfonts — use the same source soundfont, just extract more from it
