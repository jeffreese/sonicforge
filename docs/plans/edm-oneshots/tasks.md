# EDM One-Shot Samples — Tasks

## Sample Processing (already-sourced files)

- [x] Crop `809832__cvltiv8r__...brass-ludwig.wav` multi-hit snare to first transient (ffmpeg silencedetect → crop 0-0.6s → Opus/OGG, 5.2 MB → 8 KB)
- [x] Crop `371860__cryanrautha__ganon-snare-drum.wav` multi-hit snare to first transient (crop 0.25-0.65s → Opus/OGG, 4.3 MB → 5 KB)
- [x] Transcode all FX files (risers, impacts, sweeps) from WAV/AIFF/MP3 to Opus/OGG @ 128 kbps (31 MB → 1.8 MB, ~15× shrinkage)
- [x] Verify final sample footprint (~4.4 MB total committed)
- [x] Update `.gitignore` to add `!public/samples/oneshots/**` exception

## Attribution + License

- [x] Write `public/samples/oneshots/LICENSE.md` with every file's author and Freesound source URL
- [x] Update `docs/plans/edm-oneshots/attribution.md` to point at LICENSE.md as canonical source (planning archive retained for sub-epic paper trail)
- [x] Verify every file in `public/samples/oneshots/` is accounted for in LICENSE.md

## Engine

- [x] Create `src/engine/OneShotInstrument.ts` implementing `InstrumentSource` interface
- [x] Load each sample URL into a `Tone.Player` via `load(oneshots)` (same async pattern as MultiLayerSampler)
- [x] `triggerAttackRelease(hitName, ...)` looks up the matching player and triggers it
- [x] Velocity scales player volume via `velocityToDb(velocity)` helper (0..1 → dB)
- [x] All players share an output `Tone.Gain` (the instrument extends Tone.Gain as its node)
- [x] Unknown hit names are silent no-ops (not throws) so compositions don't crash on missing hits
- [x] Update `InstrumentLoader` to dispatch `'oneshot'` source → `OneShotInstrument`; `source` precedence over `category` so drum-category instruments can opt into oneshot
- [x] Unit tests for `OneShotInstrument` loading, triggering, velocity scaling, numeric pitch coercion, empty load, disposal
- [x] Unit tests for `velocityToDb` helper

## Demo composition

- [x] `compositions/oneshot-house.json` — 8-bar 124 BPM house groove in A minor:
  - `source: 'oneshot'` drum instrument with 5 hit names (kick, snare, hat, hat-open, clap) referencing 5 committed samples
  - Mix with `source: 'synth'` sub bass and warm pad (proves different instrument sources coexist)
  - Kick-to-pad sidechain from sub-epic #4 (proves sidechain works with oneshot sources)
- [x] Validates cleanly against the schema

## Checks

- [x] `pnpm test` passes (347 tests, 15 new for OneShotInstrument)
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] Manual: `compositions/oneshot-house.json` plays correctly in the browser — drum samples trigger cleanly, synth bass and pad play alongside, pad pumps under the kick via sub-epic #4 sidechain. Confirmed production-quality output.
- [x] Bonus: initial browser test revealed a TrackPlayer dispatch bug (oneshots were silently skipped because the old `isDrum` flag couldn't express "hit names pass through verbatim"); fixed in-branch by refactoring `LoadedInstrument.isDrum` → `mode: 'pitched' | 'drum' | 'oneshot'`

## Notes

- **Encoder choice:** Opus (in Ogg container) via `libopus`. `libvorbis` wasn't in this ffmpeg build; Opus is higher quality at lower bitrates anyway. Browsers decode Opus natively.
- **Transcoding approach:** small samples (kicks/hats/claps and 3 single-hit snares) are committed as-is; only the 2 multi-hit snares and all 14 FX files were transcoded. Mixed format directory is fine — Tone.Player delegates to WebAudio decoding which handles every format.
- **Unknown hit names no-op:** makes compositions resilient. If a composition references a hit that's missing from the oneshots map, playback continues rather than crashing. Cost: typos in hit names are silent. Tradeoff documented.
