# Dynamic Marks — Tasks

## Engine

- [ ] Read `DynamicMark` entries from track data during scheduling
- [ ] Build a dynamic envelope: beat position → velocity multiplier for each track
- [ ] Handle gradual transitions (linear interpolation over mark duration)
- [ ] Handle sudden transitions (immediate level change)
- [ ] Apply dynamic multiplier in `TrackPlayer.scheduleNote()` before humanization
- [ ] Clamp final velocity to 1–127 after all multipliers

## Testing

- [ ] Unit tests for dynamic envelope construction (gradual, sudden, overlapping marks)
- [ ] Unit tests for velocity multiplier application
- [ ] Playback verification with a composition that uses dynamic marks (create a test composition if none exist)

## Integration

- [ ] Update `/compose` and `/iterate` skills to generate dynamic marks in compositions (they may already — verify)
- [ ] Verify existing compositions with dynamic marks play correctly
