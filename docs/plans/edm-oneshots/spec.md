# EDM One-Shot Samples

**Sub-epic #5 of EDM Phase A.** See `../edm-sound-design-schema/spec.md` for architectural context.

## Scope

Fixed-pitch percussion and FX samples (kicks, snares, hats, claps, risers, impacts, sweeps) that can be triggered by hit name rather than pitch. Bundled with the app — committed to the repo so any user gets the same drum palette.

## In scope

- `src/engine/OneShotInstrument.ts` — wraps `Tone.Player` per hit, implements `InstrumentSource` runtime interface
- `triggerAttackRelease(hitName, duration, time, velocity)` looks up the matching player and triggers it
- Velocity scales player volume (dB conversion)
- All players share an output `Tone.Gain` that serves as the instrument's channel strip
- Process raw samples in `public/samples/oneshots/` (37 CC0 files already sourced from Freesound):
  - Crop the 2 multi-hit snares (CVLTIV8R brass Ludwig, Ganon) to first transient via ffmpeg
  - Transcode large FX WAV/AIFF files to OGG @ 128 kbps to shrink the committed footprint 5–10×
- Update `.gitignore` to un-ignore `public/samples/oneshots/**` while keeping `public/samples/*` gitignored for the multi-layer sampler instruments
- Create `public/samples/oneshots/LICENSE.md` from the attribution doc (`attribution.md` in this directory)
- Unit tests for loading, triggering, velocity scaling, disposal

## Depends on

- Sub-epic #1 (schema foundation) — `InstrumentDef.oneshots` field and `source: 'oneshot'` discriminator

## Out of scope

- User-uploaded one-shots via UI (Phase B)
- Drum kit editor (Phase C)

## Done when

- [ ] All 37 samples are in `public/samples/oneshots/`, cropped/transcoded as needed
- [ ] Committed footprint is reasonable (~6 MB or less after OGG transcode)
- [ ] `.gitignore` exception for `public/samples/oneshots/**` is in place
- [ ] `LICENSE.md` lists every sample's author and source URL
- [ ] A composition with a drum track using `oneshots` plays correctly
- [ ] `pnpm test` passes

See `../edm-sound-design-schema/tasks.md` section "One-Shot Samples" for the full runtime task list, and `attribution.md` in this directory for the sourced sample manifest.
