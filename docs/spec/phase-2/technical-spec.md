---
title: "Technical Specification"
phase: 2
project: sonicforge
date: 2026-03-15
status: draft
---

# Technical Specification

## System Overview

SonicForge is a browser-based music composition workbench. Claude generates compositions as structured JSON; a TypeScript engine renders them with high-quality instrument samples; and a Lit-based UI provides DAW-style visualization, mixing, and editing. The composition JSON schema is the central data format — both Claude (via skills) and the user (via the visual editor) read and write to it.

The system is entirely client-side. No server, no database, no authentication. Audio processing, UI rendering, and composition state all live in the browser.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Lit Components                           │
│                                                                 │
│  ┌──────────┐ ┌──────────────┐ ┌───────┐ ┌──────────────────┐  │
│  │Transport │ │  Arrangement │ │ Mixer │ │ Sample Explorer  │  │
│  │  Bar     │ │  / Editor    │ │       │ │ + Keyboard       │  │
│  └────┬─────┘ └──────┬───────┘ └───┬───┘ └──────┬───────────┘  │
│       │              │             │             │               │
├───────┴──────────────┴─────────────┴─────────────┴───────────── │
│                     Reactive Stores                              │
│  ┌─────────────┐ ┌───────────┐ ┌──────────┐ ┌────────┐         │
│  │ Composition │ │ Transport │ │  Mixer   │ │   UI   │         │
│  │   Store     │ │  Store    │ │  Store   │ │  Store │         │
│  └──────┬──────┘ └─────┬─────┘ └────┬─────┘ └────────┘         │
│         │              │            │                            │
├─────────┴──────────────┴────────────┴────────────────────────── │
│                      Engine Layer                                │
│  ┌────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐            │
│  │ Engine │ │ Transport │ │TrackPlayer│ │ MixBus  │            │
│  └────────┘ └───────────┘ └───────────┘ └─────────┘            │
│  ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐    │
│  │InstrumentLoader  │ │EffectsChain  │ │SampleAuditioner  │    │
│  └──────────────────┘ └──────────────┘ └──────────────────┘    │
│                                                                 │
├─────────────────────────────────────────────────────────────── │
│                  Schema / Validation                             │
│  ┌──────────────┐ ┌────────────┐ ┌────────┐                    │
│  │composition.ts│ │validate.ts │ │chords.ts│                   │
│  └──────────────┘ └────────────┘ └────────┘                    │
│                                                                 │
├─────────────────────────────────────────────────────────────── │
│                   Tone.js + WebAudio                             │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Decisions

### Lit (UI Components)

Web component framework built on web standards. Components are native custom elements with reactive properties and efficient template rendering via tagged template literals.

**Why Lit over React:**
- No virtual DOM — avoids fighting Tone.js's own state management
- Native custom elements — web standards, not a framework abstraction
- Tiny footprint (~5KB) vs. React (~40KB+ with ReactDOM)
- Light DOM mode works naturally with Tailwind CSS
- Lifecycle maps cleanly to audio component needs (connect/disconnect = start/stop audio)
- No reconciliation overhead — important for audio latency sensitivity

**Why Lit over vanilla:**
- Reactive properties with automatic re-rendering
- Standardized component model (props, events, lifecycle)
- Template literals with efficient DOM updates
- Removes boilerplate while staying close to the platform

### Tailwind CSS (Styling)

Utility-first CSS framework, but **not used as raw utility classes in components**. SonicForge uses a design token abstraction layer between Tailwind and Lit components.

**Design Token Architecture:**

```
tailwind.config.ts          → Defines semantic tokens (--color-surface, --color-primary, etc.)
src/styles/tokens.css       → CSS custom properties for light/dark themes
src/styles/components.ts    → Exported style maps that Lit components import
```

Components reference semantic style maps, not raw Tailwind classes:

```ts
// src/styles/components.ts
export const surface = {
  base: 'bg-surface text-on-surface',
  elevated: 'bg-surface-elevated text-on-surface shadow-md',
  interactive: 'bg-surface hover:bg-surface-hover cursor-pointer',
};

export const btn = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover px-4 py-2 rounded-lg',
  ghost: 'text-muted hover:text-on-surface hover:bg-surface-hover px-3 py-1.5 rounded',
};

export const mixer = {
  channel: 'bg-surface-elevated border border-border rounded-lg p-3',
  slider: 'accent-primary',
};
```

**Theme switching:** CSS custom properties change values, Tailwind classes reference those properties. Dark mode is the default (current indigo/purple theme). Light mode and future themes change the custom properties only — no component changes needed.

### Reactive Stores (State Management)

Small observable state containers that bridge the engine layer and UI components. Not a framework — just typed classes with a subscriber pattern.

#### CompositionStore

**Owns:** The loaded composition JSON — metadata, instruments, sections, tracks, notes.

**Read by:** Arrangement/editor (note rendering), transport bar (title, BPM display), mixer (instrument list), export.

**Written by:**
- Composition loader (initial load from JSON)
- Visual editor (add/move/delete/resize notes)
- Inline sample picker (swap instrument samples)
- Claude via `/compose` and `/iterate` (generates/modifies JSON, loads into store)

**Key behavior:** Mutations are atomic and notify all subscribers. This is the central document that both Claude and the user edit. Future: undo/redo can be layered here via state snapshots.

#### TransportStore

**Owns:** Playback state mirrored from Tone.js — play/pause/stop, position (bar:beat:sixteenth), BPM, time signature, loop region.

**Read by:** Transport bar, arrangement/editor (playhead position), any component showing playback info.

**Written by:** Engine callbacks push updates. Transport controls dispatch play/pause/stop/seek actions.

**Key behavior:** High-frequency updates (position changes every beat). Components should debounce or use `requestAnimationFrame` for rendering position changes.

#### MixerStore

**Owns:** Per-channel audio state — volume (0-100), pan (-1 to 1), mute, solo.

**Bidirectional:** UI slider changes push to engine (MixBus). Engine state reflects back for consistency. Solo/mute logic computed on changes.

#### UIStore

**Owns:** Pure UI state — active panel, selected instrument in explorer, keyboard octave, editor tool selection, zoom level, snap setting.

**No engine involvement.** Purely for coordinating UI components.

### Migration Strategy

**All-at-once migration.** The engine, schema, and utility layers are untouched — only the 7 files in `src/ui/` are rewritten.

**Order:**

1. **Foundation**: Add Lit, Tailwind, PostCSS config. Create design token layer (`tokens.css`, `components.ts`). Create store infrastructure.
2. **Stores**: Implement all four stores. Wire to existing Engine callbacks — verify with console logging that state flows correctly before any UI work.
3. **Migrate components** (bottom-up by complexity):
   - `CompositionLoader` → `<sf-composition-loader>` (simplest — file input, paste, drag-drop)
   - `TransportBar` → `<sf-transport-bar>` (buttons + position display)
   - `Mixer` → `<sf-mixer>` with `<sf-channel-strip>` children (sliders, knobs, mute/solo)
   - `SampleExplorer` + `Keyboard` → `<sf-sample-explorer>` with `<sf-keyboard>` (browsing, preview, keyboard mode)
   - `SamplePicker` → `<sf-sample-picker>` (modal/dropdown for inline swap)
   - `Timeline` → `<sf-arrangement>` (Canvas rewrite — see Integrated Editor below)
4. **Verify**: Each migrated component should behave identically to the vanilla version.
5. **Remove old code**: Delete `src/ui/*.ts`, old `styles.css`, update `main.ts` entry point.

## Component Breakdown

### `<sf-app>` — Application Shell

Top-level component. Owns the page layout, coordinates panels. Provides stores to child components via Lit context.

### `<sf-transport-bar>` — Playback Controls

Play/pause/stop buttons, position display (bar:beat), BPM display, status label. Subscribes to TransportStore. Dispatches transport actions to Engine.

### `<sf-composition-loader>` — Input Methods

Paste JSON, upload file, drag-and-drop. Validates against schema, writes to CompositionStore, triggers Engine load.

### `<sf-mixer>` — Mix Console

Container for `<sf-channel-strip>` components. Subscribes to MixerStore. One channel strip per instrument in the loaded composition.

### `<sf-channel-strip>` — Single Track Controls

Volume slider, pan knob, mute/solo buttons, instrument name (clickable for sample swap). Bidirectional binding to MixerStore.

### `<sf-sample-picker>` — Instrument Swap Modal

Category-filtered instrument browser with preview. Hot-swaps samples in CompositionStore and Engine.

### `<sf-sample-explorer>` — Sample Browser Panel

Browse all 128 GM instruments + drum kit. Preview via SampleAuditioner. Contains `<sf-keyboard>` for interactive play.

### `<sf-keyboard>` — Computer Keyboard Instrument

On-screen keyboard with computer key mapping. Velocity slider, octave control. Plays through SampleAuditioner.

### `<sf-arrangement>` — Integrated Timeline / Editor

**This is the most significant component.** It replaces the current Timeline and adds visual editing. Canvas-based, three capabilities in one view:

**Arrangement bar** (top strip): Compact section overview. Click to jump, double-click to loop. This preserves the current Timeline's section-level navigation.

**Main view** (scrollable canvas): Beat-grid with all notes rendered per track, color-coded by instrument. Zoomable on both axes.

- **As timeline**: Playhead moves through the grid. Click anywhere for beat-granular seeking. Visual note display shows exactly what's playing.
- **As editor**: Select a tool (draw/select/erase) from the toolbar. Draw notes, select and drag to move/resize, delete. Edits write to CompositionStore, which notifies the Engine to re-schedule.

**Track selector** (bottom): Switch which track is in focus for editing. Other tracks remain visible but dimmed.

**Pitch ruler** (left): Y-axis note labels. Scrollable with the main view.

Sub-components:
- `<sf-arrangement-bar>` — Section-level minimap
- `<sf-editor-toolbar>` — Tool selection, snap-to-grid, zoom controls
- `<sf-pitch-ruler>` — Y-axis labels

### `<sf-export-panel>` — Audio Export [Planned]

Format selection (WAV, MP3), quality options, progress indicator, download trigger. See Audio Export section below.

## Data Flow

### Core Flow: Load and Play a Composition

1. User pastes/uploads/drops JSON into `<sf-composition-loader>`
2. Schema validation runs (`validate.ts`) → chord expansion (`chords.ts`)
3. Valid composition written to **CompositionStore**
4. Engine.load() called → InstrumentLoader fetches samples → MixBus + EffectsChain created → TrackPlayer schedules notes
5. **TransportStore** updates: state = 'ready', metadata populated
6. **MixerStore** updates: one channel per instrument with defaults
7. All subscribed components re-render with new data
8. User clicks play → Engine.play() → Tone.Transport starts → TransportStore position updates flow to playhead rendering

### Editing Flow: User Modifies a Note [Planned]

1. User selects draw tool in `<sf-editor-toolbar>`
2. User clicks on canvas grid in `<sf-arrangement>`
3. New note created at snapped position with selected instrument
4. **CompositionStore** mutation: note added to the active track
5. Engine re-schedules affected track (TrackPlayer)
6. All subscribers see the update: arrangement re-renders the note, timeline shows the change
7. Composition JSON in CompositionStore is the up-to-date source of truth — can be exported as JSON at any time

### Export Flow: Render to Audio [Planned]

1. User opens `<sf-export-panel>`, selects format and options
2. ExportEngine clones current CompositionStore + MixerStore state
3. `Tone.Offline()` renders the composition in non-real-time → AudioBuffer
4. Buffer encoded to selected format (WAV natively, MP3 via encoding library)
5. Download triggered via Blob URL
6. Stretch: per-track stem export (render each instrument solo)

## Integration Points

### Tone.js (v15.0.4)

**Provides:** WebAudio abstraction — Samplers, Transport, Effects, offline rendering.

**Integration pattern:** Engine layer wraps all Tone.js interactions. Stores subscribe to engine callbacks for state. UI components never import Tone.js directly.

**Lifecycle:** Audio context must be started on user gesture (browser requirement). Engine.init() called on first user interaction. Tone.js objects created/destroyed by the engine, not by component lifecycle.

### Self-Hosted Samples

**Provides:** OGG instrument samples extracted from SoundFont 2.

**Location:** `/public/samples/{instrument}/` with `manifest.json` per instrument.

**Loading:** InstrumentLoader reads manifest, fetches required notes, creates Tone.Sampler. No CDN fallback — samples must be available locally.

**Extraction:** `scripts/extract-samples.py` requires Python, FluidSynth, FFmpeg. One-time setup, not part of the build process.

### Claude (via Skills/Rules)

**Provides:** Natural-language composition generation and modification.

**Integration:** Claude writes composition JSON to the file system. User loads it into SonicForge via the composition loader. `/compose` and `/iterate` skills generate schema-valid JSON guided by rules in `.claude/rules/`.

**Independence:** The app works without Claude. Compositions can be hand-authored, imported, or built in the visual editor.

## Planned Features

### Audio Export

**Priority:** Near-term. Core architecture supports it — Tone.js's `Tone.Offline` handles non-real-time rendering.

**Scope:**
- WAV export (no external library needed — raw PCM encoding)
- MP3 export (requires encoding library, e.g., `lamejs` — evaluate at implementation time)
- Full mix export (all tracks as mixed)
- Stem export (individual tracks rendered separately) — stretch goal

**Component:** `<sf-export-panel>` with format selector, quality options, progress bar, download button.

**Engine addition:** `ExportEngine` or `Engine.exportOffline()` method that clones current state and renders via `Tone.Offline`.

### Visual Composition Editor

**Priority:** Near-term. Integrated into `<sf-arrangement>` as described above.

**Scope (initial):**
- Draw notes on the grid (click to place, drag for duration)
- Select and move notes (drag to reposition in time or pitch)
- Resize notes (drag edge to change duration)
- Delete notes (eraser tool or select + delete key)
- Snap-to-grid (quantize to beat subdivisions)
- Per-track editing with other tracks visible but dimmed

**Scope (future):**
- Copy/paste note selections
- Undo/redo (CompositionStore state snapshots)
- Automation lanes (volume, pan, effects over time)
- Section-level editing (move, copy, split, merge sections in arrangement bar)

### DAW Direction [Future Consideration]

SonicForge is evolving from a playback engine toward a browser-based composition workbench. The long-term vision is a tool where Claude generates music, the user refines it with DAW-like tools, and the result can be exported as audio.

Future capabilities that inform current architecture decisions:

- **Arrangement editing**: Move, copy, split, merge sections. Requires CompositionStore to support section-level mutations, not just note-level.
- **Automation lanes**: Volume/pan/effect parameter changes over time. Extends the composition schema with automation data alongside note data.
- **Plugin/effect extensibility**: Beyond the built-in six effects. May require a plugin interface for EffectsChain.
- **Recording from MIDI controllers**: Real-time note input quantized to the grid. Requires a MIDI input layer and real-time write path to CompositionStore.
- **Collaboration**: Furthest out. Would require a server component and conflict resolution for CompositionStore mutations.

**Current architectural choices that support this direction:**
- Reactive stores with subscription model scale to more complex state flows
- CompositionStore as single source of truth handles multiple writers (Claude, editor, MIDI input, arrangement tools)
- Engine layer is already decoupled from UI — new UI features don't require engine rewrites
- Lit components are composable — new panels and tools plug into the existing shell

## Resolved Decisions

### Light DOM for All Components

All Lit components use light DOM (no shadow DOM). Tailwind's global stylesheet needs to reach component internals — shadow DOM would block this and require duplicating styles into every shadow root. Style consistency comes from the design token layer, not DOM encapsulation. SonicForge is a single-page app, not a distributed component library — encapsulation adds complexity without benefit here.

### Audio Export Formats: WAV + OGG

WAV export first (no library needed — raw PCM encoding from AudioBuffer). OGG as the compressed format via browser-native `MediaRecorder` / `OggOpusEncoder` — no external library required, and samples are already OGG. MP3 deferred unless users specifically need it for compatibility (would require `lamejs` or similar).

### Undo/Redo: Command Pattern

Each edit dispatched to CompositionStore as a reversible command object: `{ do(), undo(), description }`. Commands pushed onto an undo stack; redo stack cleared on new edits.

Advantages over state snapshots:
- Minimal memory (stores deltas, not full state copies)
- Self-describing (enables undo history display: "Undo: move note C4")
- Supports grouped operations (multi-note selection move = one undo step)
- Standard pattern for DAW-direction apps
- Opens the door to macro recording (replay edit sequences)

Implementation lives on CompositionStore — all mutations go through `dispatch(command)` rather than direct state modification.

### Design Token Set

Carry forward the existing indigo/purple dark theme, mapped to semantic tokens:

**Surface colors:**
| Token | Dark Value | Purpose |
|-------|-----------|---------|
| `--color-surface` | `#1a1a2e` | Base background |
| `--color-surface-elevated` | `#25253e` | Cards, panels, channel strips |
| `--color-surface-hover` | `#2d2d4a` | Interactive hover state |
| `--color-border` | `#334155` | Subtle borders |

**Brand / accent:**
| Token | Dark Value | Purpose |
|-------|-----------|---------|
| `--color-primary` | `#6366f1` | Indigo — buttons, accents, selected states |
| `--color-primary-hover` | `#818cf8` | Lighter indigo for hover |
| `--color-secondary` | `#a855f7` | Purple — secondary accents |

**Text:**
| Token | Dark Value | Purpose |
|-------|-----------|---------|
| `--color-text` | `#e2e8f0` | Primary text |
| `--color-text-muted` | `#94a3b8` | Secondary text, labels |

**State:**
| Token | Dark Value | Purpose |
|-------|-----------|---------|
| `--color-success` | `#22c55e` | Play state, loaded indicators |
| `--color-warning` | `#f59e0b` | Caution states |
| `--color-error` | `#ef4444` | Errors, stop state |

**Editor note palette:** Distinct hue per track/instrument for visual separation on the grid. Defined as an array that cycles for compositions with many tracks.

Light theme swaps these values via a `.theme-light` class on the root — no component changes needed.
