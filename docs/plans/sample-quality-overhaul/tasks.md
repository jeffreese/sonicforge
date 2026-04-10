# Sample Quality Overhaul — Tasks

## Extraction Script

- [x] Modify `extract-samples.py` to render at 4 velocity levels (30, 60, 90, 120)
- [x] Change note spacing from every 3 semitones to every semitone (C2–C7)
- [x] Increase Opus bitrate from 96kbps to 192kbps
- [x] Update file naming convention to `{note}_v{velocity}.ogg`
- [x] Update manifest.json generation to include `velocityLayers` array
- [ ] Re-extract all instruments with new settings
- [ ] Verify output quality (spot-check a few instruments across velocity range)

## Engine — Sample Loading

- [x] Update `SampleLoader` to parse new manifest format with velocity layers
- [x] Load all velocity layers into separate Tone.Sampler instances (or a multi-layer sampler)
- [x] Update `InstrumentLoader` to handle the new multi-layer sample structure
- [x] Consider lazy-loading: only load instruments present in the current composition

## Engine — Playback

- [x] Update `TrackPlayer.scheduleNote()` to select velocity layer based on note velocity
- [x] Implement nearest-layer selection logic (map 0–127 velocity to closest extracted layer)
- [x] Verify volume scaling is correct after layer switching (layer provides timbre, velocity still scales amplitude)

## Testing

- [x] Unit tests for velocity layer selection logic
- [ ] Integration test: load a multi-layer instrument, play notes at different velocities, verify correct layer is selected
- [ ] Playback verification with existing compositions
