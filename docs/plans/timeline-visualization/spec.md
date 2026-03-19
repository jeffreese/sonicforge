# Timeline Visualization — Piano Roll View

## Overview

Evolve `<sf-arrangement>` from a section-level block display into a beat-granular piano roll that renders individual notes. This is a **read-only visualization upgrade** — editing tools come in a later feature (after undo/redo infrastructure).

## Why

The current arrangement canvas shows colored blocks per instrument per section — useful for navigation but gives no insight into what the music actually contains. A piano roll shows every note's pitch, timing, and duration, making the composition legible at a glance. This is also the visual foundation that note editing will build on.

## Requirements

### Core Canvas

- **Pitch axis (Y)**: Notes rendered vertically by MIDI pitch. Y-axis spans the pitch range present in the loaded composition (with some padding). Each semitone gets a row; black-key rows have a subtly darker background (standard piano roll convention).
- **Time axis (X)**: Beats/bars rendered horizontally. Bar lines are prominent, beat lines are subtle. Grid density adapts to zoom level (at low zoom, show only bar lines; at high zoom, show sub-beat divisions).
- **Notes**: Rectangles positioned by pitch (Y) and time (X), width = duration. Color-coded by instrument using the existing `COLORS` palette. Velocity mapped to opacity (louder = more opaque).
- **Playhead**: Vertical line at current playback position, beat-granular (already exists, just needs to work in the new coordinate system).

### Navigation & Zoom

- **Horizontal zoom**: Ctrl+scroll (or pinch) changes time scale. Minimum = full composition fits in view. Maximum = ~16th-note resolution visible.
- **Vertical zoom**: Shift+scroll changes pitch scale. Minimum = full pitch range fits in view.
- **Scroll**: Standard scroll for vertical panning. Horizontal scroll (shift+scroll without Ctrl, or trackpad horizontal) for time panning.
- **Click-to-seek**: Clicking the canvas seeks to that beat position (upgrade from section-level seeking). Dispatches `arrangement-seek` with beat-level precision.

### Track Focus

- **Track selector**: Row of instrument buttons below the canvas. Clicking one focuses that track — its notes render at full opacity, all others dim to ~20% opacity.
- **"All" mode**: Default state, all tracks at full opacity. Click the active track button again to deselect.

### Structural Elements

- **Arrangement bar** (top): Preserved as-is — section-level minimap with click-to-jump and double-click-to-loop. This stays section-granular.
- **Pitch ruler** (left edge): Note labels (C4, D4, etc.) on the Y-axis. Octave boundaries highlighted. Scrolls with the main canvas.
- **Bar numbers** (top of grid, below arrangement bar): Bar numbers at each bar line.

### Responsive Sizing

- Canvas height expands to fit the pitch range (with scroll if it exceeds viewport).
- Canvas width is 100% of container; horizontal content scrolls when zoomed in.
- ResizeObserver already in use — extend it for the new layout.

## Architecture

### Component Structure

The current single `<sf-arrangement>` component stays as the outer shell but delegates to internal rendering modules:

```
<sf-arrangement>
  ├── Arrangement bar (section minimap) — existing, kept as-is
  ├── Bar number ruler (new)
  ├── Pitch ruler (new, left edge)
  ├── Main canvas (rewritten — piano roll grid + notes)
  └── Track selector (new, bottom)
```

All rendering stays canvas-based. The pitch ruler and bar numbers are drawn on the same canvas (or a linked canvas) — not separate DOM elements — to keep scroll synchronized.

### Data Flow

1. Composition loads → `CompositionStore` notifies → arrangement receives notes per track
2. Component parses all notes into a flat render list: `{ pitch, startBeat, durationBeats, instrumentIndex, velocity }`
3. Pitch strings ("C4") converted to MIDI numbers for Y positioning
4. Time strings ("0:2:0") converted to absolute beat positions for X positioning
5. On zoom/scroll/playhead change → re-render visible region only

### Coordinate System

- **Beat position**: Absolute beat from composition start (float). Sections contribute their `bars * beatsPerBar` in sequence.
- **MIDI pitch**: Integer 0–127. Y-axis inverted (higher pitch = higher on screen, lower MIDI number = lower Y).
- **View transform**: `viewX(beat)` and `viewY(midiNote)` functions apply zoom + scroll offset. All hit-testing and rendering goes through these.

### Performance

- Only render notes visible in the current viewport (spatial culling by beat range and pitch range).
- Cache the parsed note list — only rebuild when composition changes.
- Use `requestAnimationFrame` for playhead animation during playback (already the pattern in TransportStore subscriptions).
- Canvas clearing limited to dirty regions where possible.

## Dependencies

- Existing `CompositionStore`, `TransportStore` subscriptions (already wired)
- `src/schema/composition.ts` — Note type with `pitch`, `time`, `duration`
- `src/util/timing.ts` — may need helpers for time-string-to-beat conversion
- `src/styles/components.ts` — arrangement tokens will need expansion for new sub-elements

## Out of Scope

- Note editing (draw, select, erase, move, resize) — separate feature, requires undo/redo
- Automation lanes
- Section-level editing (add/remove/reorder sections)
- MIDI input
- Snap-to-grid controls (needed for editing, not visualization)
