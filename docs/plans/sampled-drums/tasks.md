# Sampled Drums — Tasks

## Extraction

- [ ] Add drum extraction mode to `extract-samples.py` (GM channel 10, note-number-to-name mapping)
- [ ] Extract standard GM drum sounds: kick, snare, hi-hat closed/open, toms (high/mid/low), crash, ride, rimshot, clap
- [ ] Extract at 2–3 velocity layers per hit
- [ ] Generate drum kit manifest with note-number-to-file mapping
- [ ] Output to `public/samples/drum_kit/`

## Engine

- [ ] Refactor `DrumKit.ts` to load samples instead of creating synth voices
- [ ] Use `Tone.Players` or `Tone.Sampler` for sample playback
- [ ] Map GM note numbers to loaded samples
- [ ] Support velocity layer selection (reuse pattern from sample quality overhaul if available)
- [ ] Maintain existing API surface (`trigger(note, velocity, time, duration)`)

## Testing

- [ ] Verify all GM drum sounds load and trigger correctly
- [ ] Compare output quality with current synth drums
- [ ] Test with existing compositions that use drums
