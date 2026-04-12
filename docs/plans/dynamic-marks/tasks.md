# Dynamic Marks — Tasks

## Engine

- [x] Read `DynamicMark` entries from track data during scheduling — `buildDynamicEnvelope()` in new `src/engine/dynamics.ts` module, called once per track at the top of `TrackPlayer.scheduleTrack()`
- [x] Build a dynamic envelope: beat position → velocity multiplier for each track — `DynamicEnvelope.multiplierAt(timeInBeats)` interface, section-relative coordinate system matching note times
- [x] Handle gradual transitions (linear interpolation over mark duration) — crescendo/decrescendo marks interpolate from the previous level to the target over `duration` beats
- [x] Handle sudden transitions (immediate level change) — `type: 'sudden'` (also the default when `type` is omitted) produces an instant step
- [x] Apply dynamic multiplier in `TrackPlayer.scheduleNote()` before humanization — inserted between articulation and humanization in the velocity pipeline: `note.velocity/127 → articulation → **dynamic marks** → humanization → clamp`
- [x] Clamp final velocity to 1–127 after all multipliers — existing clamp `Math.max(1/127, Math.min(1, ...))` in TrackPlayer already handles this; no additional clamp needed

## Testing

- [x] Unit tests for dynamic envelope construction (gradual, sudden, overlapping marks) — 19 tests in `src/engine/dynamics.test.ts` covering: all 8 levels → multiplier mapping, monotonicity, no-marks baseline, sudden marks (single/mid-section/two-step/default-type), gradual transitions (crescendo/decrescendo/omitted-duration/dotted-duration/from-baseline), edge cases (same-time marks, non-4/4 time sig, sixteenths in time, unsorted marks, compound durations)
- [x] Unit tests for velocity multiplier application — `levelToMultiplier` tests verify the MIDI Standard Level 2 mapping ÷ 80 (mf baseline = 1.0)
- [ ] Playback verification with a composition that uses dynamic marks — 5 existing compositions already use dynamics (twinkle-minor-melancholy, twinkle-breakbeat, twinkle-liquid-dnb, eclipse-protocol, nachtmusik-machine). User verification after merge.

## Integration

- [ ] Update `/compose` and `/iterate` skills to generate dynamic marks in compositions (they may already — verify)
- [ ] Verify existing compositions with dynamic marks play correctly

## Future considerations

- **Perceptual loudness mapping.** The current `levelToMultiplier()` uses linear MIDI Standard Level 2 velocities ÷ 80. This produces perceptual loudness steps that vary ~±20% between adjacent levels (quiet steps feel bigger than loud steps) because human loudness perception follows Stevens' power law (~intensity^0.3). A perceptual correction curve would equalize the perceived step sizes, but the improvement is subtle (~10% refinement), it would break consistency with DAWs and MIDI tools that use the same linear mapping, and per-instrument velocity response curves (not yet implemented) dominate the perceptual mapping more than the global dynamic marks do. Revisit if SonicForge adds per-instrument velocity curves — at that point a small post-processing correction on the multiplier output would compose naturally with the linear mapping shipped here.
