# Timeline Visualization — Tasks

## Foundation

- [x] Add timing utility: convert note `time` and `duration` strings to absolute beat positions (`src/util/timing.ts`)
- [x] Add pitch utility: convert note `pitch` strings to MIDI note numbers and back (already in `src/util/music.ts`)
- [x] Expand arrangement style tokens in `src/styles/components.ts` for track selector, pitch ruler area

## Canvas Rewrite

- [x] Refactor `<sf-arrangement>` internals — extract coordinate system (view transform: zoom, scroll, beat↔pixel, pitch↔pixel conversions)
- [x] Build note render list from composition data — flatten all section/track/note data into `{ midiNote, startBeat, durationBeats, instrumentIndex, velocity }` with caching
- [x] Render piano roll grid — pitch rows (alternating dark for accidentals), bar lines, beat lines, density adapts to zoom level
- [x] Render notes as rectangles — positioned by pitch/time, width = duration, color by instrument, opacity by velocity
- [x] Render pitch ruler on left edge — note labels at octave boundaries (C2, C3, C4...), scrolls with Y
- [x] Render bar numbers above grid — bar count labels at each bar line

## Navigation

- [x] Horizontal zoom — Ctrl+wheel scales time axis, clamped between full-composition and 16th-note resolution
- [x] Vertical zoom — Shift+wheel scales pitch axis, clamped between full-range and ~1-octave view
- [x] Scroll — vertical scroll pans pitch, horizontal scroll pans time
- [x] Beat-granular click-to-seek — clicking the grid area dispatches `arrangement-seek-beat` with beat position

## Track Focus

- [x] Track selector UI — row of instrument buttons below canvas, styled via design tokens
- [x] Focus mode — clicking a track button dims all other tracks to ~20% opacity; clicking again returns to "all" mode
- [x] Track selector subscribes to CompositionStore for instrument list updates

## Integration

- [x] Update `<sf-app>` to handle beat-level seek events from the new arrangement
- [x] Verify playhead rendering works with new coordinate system during playback
- [x] Update existing arrangement tests + add new tests for zoom, scroll, note rendering, track focus
