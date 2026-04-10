# Effects & Mix Polish — Tasks

## Schema

- [ ] Add optional `mix` section to composition schema (`src/schema/composition.ts`)
- [ ] Define types for master settings, send bus config, per-track send levels
- [ ] Ensure backward compatibility — compositions without `mix` use sensible defaults
- [ ] Add validation for mix section

## Engine — Master Bus

- [ ] Add master effects chain to `MixBus.ts`: EQ → compressor → limiter
- [ ] Set sensible defaults (gentle compression, brick-wall limiter at 0dB)
- [ ] Add master volume control

## Engine — Send Effects

- [ ] Create `SendBus` class: a shared effect (reverb or delay) with its own output
- [ ] Route each channel's send output to the appropriate SendBus at configurable levels
- [ ] Implement shared reverb send (convolution or algorithmic via Tone.Reverb)
- [ ] Implement shared delay send (Tone.FeedbackDelay)

## Engine — Per-Track

- [ ] Add per-channel send levels (reverb, delay) to channel routing
- [ ] Add per-channel high-pass filter (default off, configurable cutoff)
- [ ] Read send levels from composition JSON `mix.tracks` section

## Store

- [ ] Extend `MixerStore` with send levels per channel
- [ ] Add master settings to store (volume, compressor threshold/ratio)
- [ ] Load mix settings from composition JSON on composition load

## Presets

- [ ] Define "dry", "studio", "lush" preset objects
- [ ] Apply "studio" as default when no mix section is present
- [ ] Update `/compose` skill to generate appropriate mix settings per genre

## Testing

- [ ] Unit tests for send routing (correct levels, no signal when send = 0)
- [ ] Verify master chain doesn't clip or distort with loud compositions
- [ ] Playback comparison: dry vs. studio preset on existing compositions
