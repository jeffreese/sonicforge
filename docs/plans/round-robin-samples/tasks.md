# Round-Robin Samples — Tasks

## Extraction

- [ ] Modify `extract-samples.py` to render 2–3 variants per note/velocity with micro-varied parameters
- [ ] Update file naming to include round-robin index (`_rr1`, `_rr2`, `_rr3`)
- [ ] Update manifest to include `roundRobinCount` field
- [ ] Re-extract instruments with round-robin variants

## Engine — Loading

- [ ] Update `SampleLoader` to load all round-robin variants per note/velocity
- [ ] Organize loaded samples for efficient lookup: `[note][velocity][rrIndex]`

## Engine — Playback

- [ ] Add round-robin counter per note in `TrackPlayer` (or in sampler wrapper)
- [ ] Cycle through variants sequentially on repeated notes
- [ ] Reset all counters on transport stop
- [ ] Integrate with velocity layer selection (select layer first, then RR within that layer)

## Testing

- [ ] Unit test for round-robin cycling logic (sequential, wraps around, resets)
- [ ] Playback test with repeated notes — verify audible variation
