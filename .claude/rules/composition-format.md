---
paths:
  - "compositions/**"
  - ".claude/skills/compose/**"
  - ".claude/skills/iterate/**"
---

# Composition JSON Format

When generating or modifying SonicForge composition JSON:

## Structure

`version` must be `"1.0"`. Top-level keys: `metadata`, `instruments[]`, `sections[]`.

## Notation

- **Pitch:** scientific notation — `"C4"`, `"F#5"`, `"Bb3"`. Drums use named hits: `"kick"`, `"snare"`, `"hihat"`, `"hihat-open"`, `"ride"`, `"crash"`, `"tom-high"`, `"tom-mid"`, `"tom-low"`.
- **Time:** `"bar:beat:sixteenth"` zero-indexed within each section. `"0:0:0"` = bar 1 beat 1, `"1:2:0"` = bar 2 beat 3.
- **Duration:** `"1n"` whole, `"2n"` half, `"4n"` quarter, `"8n"` eighth, `"16n"`, `"32n"`. Dotted: `"4n."`. Tied: `"2n+4n"`.
- **Velocity:** 0–127. Default 80. Never write all notes at the same velocity.
- **Articulation:** `"legato"`, `"staccato"`, `"accent"`, `"tenuto"`, `"ghost"` (optional).

## Instruments

- `category`: `"melodic"`, `"bass"`, `"pad"`, `"drums"`, `"fx"`
- `source` (optional): `"sampled"` (default), `"synth"`, `"oneshot"`, `"drums"`
- `defaultVolume`: 0–100 scale (NOT dB). Default 80. Bass-heavy instruments ~85–90, pads/accents ~50–65.

### Source dispatch

**`source: 'sampled'`** (default for non-drums): pitched GM samples
- `sample`: exact GM program name — see `compose/gm-samples.md` for full list

**`source: 'synth'`**: synthesized via Tone.js
- `synth`: preset name string (e.g. `"reese_bass"`) or inline `SynthPatch` object — see `compose/synth-presets.md`
- Wobble-bass / LFO-driven synths must use `type: 'mono'` or `polyphony: false`

**`source: 'oneshot'`**: fixed-pitch percussion/FX samples triggered by hit name
- `oneshots`: `Record<string, string>` mapping hit names (e.g. `"kick"`) to sample URLs (e.g. `"samples/oneshots/kicks/..."`)
- Track notes reference hit names as `pitch` — see `compose/oneshot-hits.md` for bundled samples
- `category: 'drums'` with this source bypasses the synthesized DrumKit

**`source: 'drums'`** (default for `category: 'drums'` without explicit source): synthesized DrumKit
- Drum tracks use named hits: `"kick"`, `"snare"`, `"hihat"`, `"hihat-open"`, `"ride"`, `"crash"`, `"tom-high"`, `"tom-mid"`, `"tom-low"`

### Effects

Optional `effects[]`: 12 types — `reverb`, `delay`, `pingpong`, `chorus`, `phaser`, `distortion`, `bitcrusher`, `autofilter`, `compressor`, `limiter`, `eq3`, `stereowidener`. Each effect has `type`, `params` object, optional `id` (for automation targeting), optional `bypass`. See `compose/effects-reference.md` for full params and usage patterns.

## Composition-level fields (EDM sound design)

- **`masterEffects[]`** — master bus effects chain between the mix bus output and Tone.Destination. Same `EffectConfig` shape as per-instrument `effects[]`. Typical: `eq3` → `limiter`.
- **`automation[]`** — parameter automation over transport time. Each lane has a `target` (dotted path) and `points[]` with `{ time, value, curve }` where `curve` is `step | linear | exponential`. Use `"linear"` for dB params (volume, thresholds). See `compose/modulation-patterns.md`.
- **`lfos[]` + `modulation[]`** — LFO instances and routes. LFOs have `{ id, frequency, type, min, max }`. Routes have `{ source: lfoId, target: path, amount }`. Synth-internal targets (`bass.filter.frequency`) require mono synths.
- **`sidechain[]`** — envelope-follower ducking. Each entry: `{ source: instrumentId, target: instrumentId, amount, release }`. `amount` is 0–1 where 1 is full silence on hit. Typical: kick → pad with `amount: 0.7–0.9`, `release: 0.1`.

## Validation

1. Every `instrumentId` in a track must match an instrument `id`
2. No duplicate instrument IDs
3. Note times must not exceed section bar count
4. Bass notes in C1–G3 range. Melody in C4–C6. Pads in C3–G5.
5. Write to `compositions/<kebab-case-name>.json`
6. Effect ids must be unique within a single chain (per-instrument or master)
7. LFO ids must be unique across the composition
8. Modulation route `source` must reference an existing LFO id
9. Sidechain `source`/`target` must reference existing instrument ids

See `src/schema/composition.ts` for full TypeScript interfaces.
