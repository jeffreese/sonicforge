# Modulation Patterns

Reference for composition-level `automation`, `lfos`, `modulation`, and `sidechain` — the signature EDM production moves. Use these as templates and adapt the target paths / values to the specific composition.

## Target path syntax

Automation and LFO modulation routes target parameters via dotted paths:

| Path | Resolves to |
|---|---|
| `"<instrumentId>.volume"` | Mix bus channel volume (dB) |
| `"<instrumentId>.pan"` | Mix bus channel pan (-1..1) |
| `"<instrumentId>.<effect>.<param>"` | Per-instrument effect param — `<effect>` is the effect's `id` if set, otherwise its `type` |
| `"master.<effect>.<param>"` | Master bus effect param |
| `"<instrumentId>.filter.frequency"` | Synth filter cutoff (mono synths only — Tone.PolySynth can't be modulated from outside) |
| `"<instrumentId>.filter.Q"` | Synth filter resonance |
| `"<instrumentId>.oscillator.detune"` | Synth oscillator detune |

Synth-internal modulation requires a **mono** synth type (`type: 'mono'` or `polyphony: false` on fm/am).

## Pattern 1 — Wobble bass (LFO on filter)

The defining dubstep move. An LFO sweeps the bass filter cutoff at a tempo-synced rate:

```json
"instruments": [
  {
    "id": "bass",
    "source": "synth",
    "synth": {
      "type": "mono",
      "oscillator": { "type": "sawtooth" },
      "filter": { "type": "lowpass", "frequency": 400, "Q": 8 }
    }
  }
],
"lfos": [
  { "id": "wobble", "frequency": "8n", "type": "sine", "min": 120, "max": 2000 }
],
"modulation": [
  { "source": "wobble", "target": "bass.filter.frequency" }
]
```

- `frequency` can be a number (Hz) or a note value string (`"4n"`, `"8n"`, `"16n"` = quarter/eighth/sixteenth rate).
- `min`/`max` define the LFO output range — pair with the synth's filter resonance for more character.
- For the classic dubstep growl, use `frequency: "16n"` or `"8n"`. For slower tremolo, use Hz values under 5.

## Pattern 2 — Sidechain pumping (kick ducks pad)

The classic house "pumping" effect. The pad gets briefly ducked every kick, creating the characteristic rhythmic breathing:

```json
"sidechain": [
  { "source": "kick", "target": "pad", "amount": 0.85, "release": 0.1 }
]
```

- `source` — the instrument whose envelope drives the ducking (usually the kick, but snares and other dense sources also work).
- `target` — the instrument being ducked. Multiple targets can share the same source.
- `amount` — 0 (no ducking) to 1 (full silence on hit). 0.7-0.9 is typical for audible pumping.
- `release` — how quickly the target recovers. Shorter = tighter pumping feel. 0.08-0.2 is typical.
- Multiple sidechain entries with the same source but different targets share the source tap.

## Pattern 3 — Filter sweep buildup (automation)

Automating a filter or effect wet level creates tension for buildups:

```json
"automation": [
  {
    "target": "bass.filter.frequency",
    "points": [
      { "time": "0:0:0", "value": 200, "curve": "exponential" },
      { "time": "7:3:0", "value": 4000, "curve": "exponential" }
    ]
  }
]
```

- For frequency-range params (always positive), `"exponential"` gives natural-sounding sweeps.
- For dB-range params (volume, EQ gains, compressor thresholds), use `"linear"` — exponential ramps require strictly positive values and the engine silently falls back to linear for dB params anyway.
- `time` is `"bar:beat:sixteenth"` from the start of the composition (not section-relative).

## Pattern 4 — Reverb bloom on a drop

Automate a reverb's wet level from dry to soaked to amplify the impact of a drop:

```json
"instruments": [
  {
    "id": "lead",
    "source": "synth",
    "synth": "supersaw_lead",
    "effects": [
      { "type": "reverb", "id": "drop", "params": { "decay": 5, "wet": 0 } }
    ]
  }
],
"automation": [
  {
    "target": "lead.drop.wet",
    "points": [
      { "time": "0:0:0", "value": 0, "curve": "linear" },
      { "time": "3:3:0", "value": 0.8, "curve": "linear" },
      { "time": "7:3:0", "value": 0.1, "curve": "linear" }
    ]
  }
]
```

The `id: "drop"` on the reverb lets automation target it specifically (`"lead.drop.wet"`), which is important if the instrument has multiple reverbs.

## Pattern 5 — Volume swell into a drop

Classic risers + bass drop combination:

```json
"automation": [
  {
    "target": "lead.volume",
    "points": [
      { "time": "0:0:0", "value": -40 },
      { "time": "7:3:0", "value": 0, "curve": "linear" }
    ]
  }
]
```

Volume is in dB, so `-40` is near-silent and `0` is full. Linear ramp is the right curve for dB.

## Pattern 6 — Combined drop (sidechain + sweep + swell)

Real EDM drops combine multiple modulation techniques. A house drop might:
- Sidechain pad + bass under the kick
- Automate filter cutoff from closed to open over the 8 bars leading up
- Automate master reverb wet from washy (intro) to dry (drop) to tight punch

Layer these patterns freely — each one is independent and they compose.

## Known limitations

- **PolySynth internals aren't modulatable from outside.** Wobble bass must use `type: 'mono'`. If you need a polyphonic filter-swept lead, use automation (which targets the MixBus channel volume or effect params, not synth internals) instead of LFO modulation.
- **Exponential curves only work for strictly positive values.** The engine falls back to linear for non-positive targets. Prefer `"linear"` curves on volume, pan, EQ bands, and limiter threshold.
- **Automation starts from the point's actual time.** If a seek lands mid-lane, the engine anchors to the interpolated value and continues from there — but this interpolated anchor uses linear interpolation regardless of the point curves.
- **Effect ids must be unique within a chain.** If an instrument has two reverbs and you want to target both, give each a unique `id`.
