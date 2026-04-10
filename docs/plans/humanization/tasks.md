# Humanization — Tasks

## Engine

- [x] Add humanization utility: seeded random offset generator for timing and velocity
- [x] Integrate into `TrackPlayer.scheduleNote()` — apply timing jitter and velocity variation before scheduling with Tone.js
- [x] Respect articulation modifiers (ghost = more velocity variance, accent = less timing variance)
- [x] Add unit tests for offset generation (determinism, range clamping, articulation sensitivity)

## Store

- [x] Add `humanization` field (0–100) to `MixerStore` channel state
- [x] Default to a sensible value (e.g., 50) for new compositions
- [x] Wire store value to TrackPlayer at playback time

## Integration

- [x] Verify playback with existing compositions — should sound noticeably more natural
- [x] Verify determinism — same composition + settings = same offsets across plays
