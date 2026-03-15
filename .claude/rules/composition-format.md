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
- `sample`: exact GM program name (see `compose/gm-samples.md` for full list)
- Drum tracks: engine auto-maps `"percussion"` soundfont via `category: "drums"`
- `defaultVolume`: 0–100 scale (NOT dB). Default 80. Bass-heavy instruments ~85–90, pads/accents ~50–65.
- Optional `effects[]`: `"reverb"`, `"delay"`, `"chorus"`, `"distortion"`, `"eq"`, `"compressor"` with `params` object

## Validation

1. Every `instrumentId` in a track must match an instrument `id`
2. No duplicate instrument IDs
3. Note times must not exceed section bar count
4. Bass notes in C1–G3 range. Melody in C4–C6. Pads in C3–G5.
5. Write to `compositions/<kebab-case-name>.json`

See `src/schema/composition.ts` for full TypeScript interfaces.
