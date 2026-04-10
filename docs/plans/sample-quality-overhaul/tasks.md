# Sample Quality Overhaul — Tasks

## Extraction Script

- [ ] Modify `extract-samples.py` to render at 4 velocity levels (30, 60, 90, 120)
- [ ] Change note spacing from every 3 semitones to every semitone (C2–C7)
- [ ] Increase Opus bitrate from 96kbps to 192kbps
- [ ] Update file naming convention to `{note}_v{velocity}.ogg`
- [ ] Update manifest.json generation to include `velocityLayers` array
- [ ] Re-extract all instruments with new settings
- [ ] Verify output quality (spot-check a few instruments across velocity range)

## Engine — Sample Loading

- [ ] Update `SampleLoader` to parse new manifest format with velocity layers
- [ ] Load all velocity layers into separate Tone.Sampler instances (or a multi-layer sampler)
- [ ] Update `InstrumentLoader` to handle the new multi-layer sample structure
- [ ] Consider lazy-loading: only load instruments present in the current composition

## Engine — Playback

- [ ] Update `TrackPlayer.scheduleNote()` to select velocity layer based on note velocity
- [ ] Implement nearest-layer selection logic (map 0–127 velocity to closest extracted layer)
- [ ] Verify volume scaling is correct after layer switching (layer provides timbre, velocity still scales amplitude)

## Testing

- [ ] Unit tests for velocity layer selection logic
- [ ] Integration test: load a multi-layer instrument, play notes at different velocities, verify correct layer is selected
- [ ] Playback verification with existing compositions
