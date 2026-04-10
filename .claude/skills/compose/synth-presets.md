# Synth Presets

Starter preset library for `source: 'synth'` instruments. Reference by name in the composition's `synth` field: `{ "synth": "reese_bass" }`. Or pass an inline `SynthPatch` object for full control (see `.claude/rules/composition-format.md`).

## Bass

- **`reese_bass`** — classic D&B/dubstep reese. 3-voice fatsawtooth through a resonant lowpass filter (cutoff 800 Hz, Q=2). Mono. Use for aggressive bass lines.
- **`wobble_bass`** — dubstep bass designed for LFO modulation on `filter.frequency`. Sawtooth, heavy lowpass (cutoff 400 Hz, Q=8). Mono. Pair with an LFO route for the wobble.
- **`sub_bass`** — clean sine sub. Deep, no filter. Mono. Use for hip-hop, trap, deep house, ambient.
- **`acid_bass`** — TB-303-style squelch. Square wave with aggressive filter envelope. Mono. Use for acid house, techno.
- **`fm_bass`** — harsh metallic FM bass. Mono by default (polyphony: false). Use for neurofunk, industrial, aggressive dubstep.

## Lead

- **`supersaw_lead`** — 7-voice fatsawtooth with 40-cent spread. Polyphonic. The defining EDM lead sound. Use for trance, future bass, big-room drops.
- **`detuned_lead`** — lighter 3-voice detuned saw. Polyphonic. More restrained than supersaw. Use for any melodic lead work.
- **`pluck_lead`** — Karplus-Strong pluck. Mono (PluckSynth doesn't polysynth). Use for tropical house, future bass, melodic dubstep.
- **`fm_bell`** — glassy FM bell (Yamaha DX7 territory). Polyphonic. Use for creepy lullabies, melodic fills, chimes.

## Pad

- **`warm_pad`** — slow attack, long release, sine-based. Polyphonic. Default ambient/pad choice. Sidechain target of choice.
- **`stab_pad`** — short sawtooth stab rather than sustained wash. Polyphonic. Use for rhythmic chord hits in house/techno.
- **`organ_pad`** — square wave with slower release. Polyphonic. Use for organ-style pads in trance, progressive house.

## Pluck / Arp

- **`pluck_bass`** — Karplus-Strong pluck in bass register. Mono.
- **`arp_pluck`** — triangle wave with short envelope for arpeggiator patterns. Polyphonic. Use for tranced arpeggios.

## Polyphony notes

- Wobble bass requires `type: 'mono'` (or `polyphony: false` on fm/am) — LFO modulation targets the underlying synth's `filter.frequency`, which doesn't exist as a shared signal on `Tone.PolySynth`.
- To get a "polyphonic wobble," use multiple mono wobble instruments playing different notes. Rare in practice.

## Quick reference — choose a preset

| Role | Genre hint | Preset |
|---|---|---|
| Deep sub | trap, hip-hop, ambient | `sub_bass` |
| Driving bass | house, techno | `reese_bass`, `acid_bass` |
| Wobble | dubstep, drum & bass | `wobble_bass` + LFO on filter |
| Aggressive bass | neurofunk, industrial | `fm_bass` |
| Soaring lead | trance, future bass | `supersaw_lead` |
| Plucky lead | tropical house, future bass | `pluck_lead` |
| Creepy bell | horror, cinematic | `fm_bell` |
| Atmosphere pad | ambient, breakdown | `warm_pad` |
| Rhythmic stab | house, techno | `stab_pad` |
| Pulsing organ | trance | `organ_pad` |
| Arpeggiator | trance, future bass | `arp_pluck` |
