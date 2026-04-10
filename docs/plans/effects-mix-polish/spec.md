# Effects & Mix Polish

## Overview

Expose the existing effects chain for per-track control and add master bus processing. The `EffectsChain` and `MixBus` already exist in the engine but aren't surfaced for user control or composition-level configuration. Adding master reverb, per-track send levels, and a master compressor/limiter would give compositions the "glue" and space that separates a demo from a produced track.

## Why

Even with perfect samples and humanization, dry instrument playback sounds like instruments in separate rooms. Shared reverb places them in the same acoustic space. A master compressor evens out dynamics and adds punch. These are standard mixing techniques that every DAW applies.

## Requirements

### Master Bus

- Add a master effects chain: EQ → compressor → limiter (always-on, sensible defaults)
- Master reverb as a send effect (instruments send varying amounts to a shared reverb)
- Master volume control

### Per-Track Effects

- Expose send levels per channel: reverb send (0–100), delay send (0–100)
- Per-track EQ (at minimum a high-pass filter to clean up low-end mud)
- Effect parameters configurable in composition JSON (optional — sensible defaults if omitted)

### Composition Schema

- Add optional `mix` section to composition JSON:
  ```json
  {
    "mix": {
      "master": { "volume": 0, "compressor": { "threshold": -12, "ratio": 4 } },
      "sends": { "reverb": { "type": "hall", "decay": 2.5 } },
      "tracks": {
        "piano": { "reverbSend": 40, "delaySend": 0 },
        "strings": { "reverbSend": 70, "delaySend": 20 }
      }
    }
  }
  ```

### Presets

- Include 2–3 mix presets: "dry" (minimal processing), "studio" (balanced), "lush" (heavy reverb/effects)
- Default to "studio" when no mix section is specified

## Architecture

- `MixBus.ts` already routes channels to destination — extend with master effects chain
- Add a `SendBus` concept: shared effect (reverb, delay) that channels send to at configurable levels
- `MixerStore` gains send level state per channel and master settings
- Composition JSON `mix` section is optional and backward-compatible

## Dependencies

- None technically, but benefits from the full audio quality stack being in place
- Schema addition needs to be backward-compatible (compositions without `mix` use defaults)

## Out of Scope

- Real-time knob automation (effects are set per-composition, not automated over time)
- Per-track insert effects beyond EQ (distortion, chorus, etc. on individual tracks)
- Visual mixer UI (engine and store first, UI later)
