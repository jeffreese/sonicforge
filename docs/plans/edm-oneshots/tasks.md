# EDM One-Shot Samples — Tasks

## Sample Processing (already-sourced files)

- [ ] Crop `809832__cvltiv8r__...brass-ludwig.wav` multi-hit snare to first transient (ffmpeg)
- [ ] Crop `371860__cryanrautha__ganon-snare-drum.wav` multi-hit snare to first transient (ffmpeg)
- [ ] Transcode all FX files (risers, impacts, sweeps) from WAV/AIFF to OGG @ 128 kbps
- [ ] Verify final sample footprint is reasonable
- [ ] Update `.gitignore` to add `!public/samples/oneshots/**` exception

## Attribution + License

- [ ] Copy contents of `attribution.md` into `public/samples/oneshots/LICENSE.md`
- [ ] Verify every file in `public/samples/oneshots/` is accounted for in the license file

## Engine

- [ ] Create `src/engine/OneShotInstrument.ts` implementing `InstrumentSource` interface
- [ ] Load each sample URL into a `Tone.Player`
- [ ] `triggerAttackRelease(hitName, ...)` looks up the matching player and triggers it
- [ ] Velocity scales player volume (dB conversion)
- [ ] All players share an output `Tone.Gain` that serves as the instrument's node
- [ ] Update `InstrumentLoader` to dispatch `'oneshot'` source → `OneShotInstrument`
- [ ] Unit tests for `OneShotInstrument` loading, triggering, velocity scaling, disposal

## Checks

- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] Manual: create a drum pattern using one-shot kicks/snares/hats/claps, verify playback
