# Effects Reference

Reference for the 12 effect types supported by SonicForge. Use in per-instrument `effects[]` arrays or the composition-level `masterEffects[]`. Each effect has a `type`, a `params` object, optional `id` (for automation targeting), and optional `bypass`.

## Schema shape

```json
{ "type": "reverb", "id": "mainReverb", "params": { "decay": 4, "wet": 0.4 }, "bypass": false }
```

- **`id`** — stable identifier for automation targeting (`"pad.mainReverb.wet"`). When unset, automation resolves by type (first match wins). Required when the chain has multiple effects of the same type and any of them needs to be automated.
- **`params`** — numeric values in Tone.js units, or time strings for time-like params. Sensible defaults apply if omitted.
- **`bypass`** — `true` removes the effect from the chain without deleting the config. Useful during iteration.

## Effect types

### Reverb / Delay

- **`reverb`** — `Tone.Reverb`. Params: `decay` (seconds, 2.5 default), `preDelay` (0.01), `wet` (0-1, 0.3). Long decay for pads and washes; short for tightness.
- **`delay`** — `Tone.FeedbackDelay`. Params: `delayTime` (number or note value like `"8n"`, default 0.25), `feedback` (0-1, 0.3), `wet` (0.2). Use for echoes.
- **`pingpong`** — `Tone.PingPongDelay`. Same params as delay. Stereo bouncing echoes — great for leads and atmospheric elements.

### Modulation

- **`chorus`** — `Tone.Chorus`. Params: `frequency` (1.5 Hz), `delayTime` (3.5 ms), `depth` (0.7), `wet` (0.3). Auto-started. Thickens pads and clean leads.
- **`phaser`** — `Tone.Phaser`. Params: `frequency` (0.5 Hz), `octaves` (3), `baseFrequency` (350), `wet` (0.3). Creates sweeping frequency notches. Use for psychedelic pads.
- **`autofilter`** — `Tone.AutoFilter`. Params: `frequency` (1 Hz or note value), `baseFrequency` (200), `octaves` (2.6), `wet` (0.5). Auto-started. LFO-driven filter sweep — simpler than a manual LFO route.

### Drive

- **`distortion`** — `Tone.Distortion`. Params: `distortion` (0-1, 0.4), `wet` (0.5). Saturates signal.
- **`bitcrusher`** — `Tone.BitCrusher`. Params: `bits` (1-16, 4), `wet` (0.5). Lo-fi digital artifact. Use on acid bass, glitch leads.

### Dynamics

- **`compressor`** — `Tone.Compressor`. Params: `threshold` (dB, -24), `ratio` (4), `attack` (0.003), `release` (0.25). Tames dynamics.
- **`limiter`** — `Tone.Limiter`. Params: `threshold` (dB, -0.3). Single-positional-arg wrapper around a hard limiter. Use on master bus.

### Tone shaping

- **`eq3`** — `Tone.EQ3`. Params: `low` (dB, 0), `mid` (dB, 0), `high` (dB, 0), `lowFrequency` (400 Hz), `highFrequency` (2500 Hz). 3-band EQ.
- **`stereowidener`** — `Tone.StereoWidener`. Params: `width` (0-1, 0.5). Widens the stereo field. Use on pads and FX.

## Usage patterns

### Pad wash
```json
"effects": [
  { "type": "reverb", "params": { "decay": 6, "wet": 0.55 } },
  { "type": "chorus", "params": { "frequency": 0.8, "depth": 0.5 } }
]
```

### Lead with ping-pong delay
```json
"effects": [
  { "type": "pingpong", "params": { "delayTime": "8n", "feedback": 0.4, "wet": 0.35 } },
  { "type": "reverb", "params": { "decay": 3, "wet": 0.25 } }
]
```

### Acid bass with bitcrushed grit
```json
"effects": [
  { "type": "bitcrusher", "params": { "bits": 6, "wet": 0.3 } },
  { "type": "compressor", "params": { "threshold": -18, "ratio": 5 } }
]
```

### Master bus chain
```json
"masterEffects": [
  { "type": "eq3", "params": { "low": 1, "mid": 0, "high": -1 } },
  { "type": "reverb", "params": { "decay": 3, "wet": 0.15 } },
  { "type": "limiter", "params": { "threshold": -1 } }
]
```

## Known limitations

- `exponentialRampToValueAtTime` in automation requires strictly positive values — use `"linear"` curves on dB-ranged params (`volume`, `threshold`, EQ bands) and on `pan`. Exponential is safe for frequency, wet, and other positive-range signals.
- Multiple effects of the same type in one chain: the first instance wins type-based lookups. Use explicit `id` to target later ones.
