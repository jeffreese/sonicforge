---
title: "Feature Spec"
phase: 1
project: sonicforge
date: 2026-03-15
status: draft
---

# Feature Spec

## Overview

SonicForge is a browser-based music engine where Claude generates structured musical compositions as JSON, and a TypeScript playback engine renders them with high-quality instrument samples and real-time controls. The core design principle is **separation of concerns**: all music composition logic lives in Claude config (skills and rules); the application is purely a playback, mixing, and visualization engine.

The target user is someone working with Claude who wants to describe music in natural language and hear it played back immediately — no DAW expertise required.

## Features

### Composition Playback Engine

**Description:** Load a composition JSON file and play it back with accurate timing, dynamics, and articulations using Tone.js and GM-standard instrument samples.

**Acceptance Criteria:**
- [x] Parse and validate composition JSON against schema
- [x] Load instrument samples (self-hosted OGG, extracted from SoundFont 2)
- [x] Schedule notes with correct timing (bar:beat:sixteenth notation)
- [x] Support articulations: legato, staccato, accent, ghost, tenuto
- [x] Transport controls: play, pause, stop with position tracking (bar:beat format)
- [x] Spacebar keyboard shortcut for play/pause

---

### Composition Loading

**Description:** Multiple ways to get composition JSON into the engine.

**Acceptance Criteria:**
- [x] Paste JSON directly into a text input
- [x] Upload JSON file via file picker
- [x] Drag-and-drop JSON files onto the page
- [x] URL parameter loading (`?load=compositions/demo.json`)
- [x] Schema validation with user-friendly error messages

---

### Timeline Visualization

**Description:** Canvas-based visual representation of the composition structure showing sections, tracks, and playback position.

**Acceptance Criteria:**
- [x] Section x track grid with color-coded cells
- [x] Moving playhead tracking current position
- [x] Click-to-seek anywhere in the timeline
- [x] Section looping (double-click to loop, double-click again to clear)
- [x] Responsive to window resizing

---

### Mixer

**Description:** Per-track audio controls for balancing the mix.

**Acceptance Criteria:**
- [x] Per-track channel strips with volume sliders (0-100 scale)
- [x] Pan knobs per track
- [x] Mute/solo buttons per track (solo logic: if any soloed, mute all others)
- [x] Master output routing

---

### Effects Chain

**Description:** Per-instrument audio effects processing.

**Acceptance Criteria:**
- [x] Support for reverb, delay, chorus, distortion, EQ3, compressor
- [x] Effects defined per-instrument in composition JSON
- [x] Signal routing: Sampler -> Effects -> MixBus Channel -> Master

---

### Sample Explorer & Auditioner

**Description:** Browse, preview, and play all available instrument samples.

**Acceptance Criteria:**
- [x] Browse all 128 GM instruments grouped by category (Piano/Keys, Guitar, Bass, Strings, Brass, Woodwinds, Synth Lead/Pad, Chromatic Percussion, Organ, Ensemble)
- [x] Drum kit section with 9 named hits
- [x] Click any instrument to preview a demo note
- [x] Adjustable preview pitch and velocity
- [x] Search/filter by instrument name
- [x] Loading state feedback per instrument

---

### Keyboard Mode

**Description:** Play any loaded sample interactively using the computer keyboard.

**Acceptance Criteria:**
- [x] Computer keyboard mapping (Z-M white keys, W/E/T/Y/U/O/P black keys)
- [x] Configurable octave (shift up/down)
- [x] On-screen keyboard visualization with key highlights
- [x] Velocity control via slider
- [x] Works with currently selected sample from explorer
- [x] Doesn't interfere with existing shortcuts (spacebar play/pause)

---

### Inline Sample Picker

**Description:** Swap instrument samples in a running composition from within the mixer.

**Acceptance Criteria:**
- [x] Clickable instrument names in mixer channel strips
- [x] Category-filtered selection with preview
- [x] Hot-swap samples in running composition
- [x] Updates in-memory only (doesn't persist to file)

---

### Chord Expansion

**Description:** Automatic expansion of chord shorthand in composition JSON into individual notes.

**Acceptance Criteria:**
- [x] Support triads, 7ths, 9ths, 6ths, sus, aug, dim, power chords
- [x] Expansion happens at load time before scheduling
- [x] Original shorthand preserved in source JSON

---

### Claude Composition Skills

**Description:** Claude config (skills + rules) that enable natural-language music generation. The composition JSON schema is stable and independent of the rendering engine. Note: the "Claude-only composition" boundary is being reconsidered — future versions may add manual editing alongside Claude generation.

**Acceptance Criteria:**
- [x] `/compose` — Generate new composition from natural language description
- [x] `/iterate` — Modify existing composition with targeted changes
- [x] `/explain` — Music theory education
- [x] `/play` — Open browser and load composition
- [x] Rules encode full JSON schema, GM instrument names, music theory guidelines
- [x] Genre guide with style-specific conventions

---

### Responsive Layout

**Description:** UI adapts to different viewport sizes.

**Acceptance Criteria:**
- [x] Breakpoints at 640px and 480px
- [x] Stacked transport and vertical mixer strips on narrow viewports
- [x] Adapted explorer/keyboard layout

---

## User Stories

- As a musician, I want to describe a song idea to Claude and hear it played back so I can iterate on composition ideas without a DAW.
- As a music learner, I want to ask Claude to explain theory concepts and hear examples so I can learn by listening.
- As a composer, I want to tweak the mix (volume, pan, effects) of a generated composition so I can polish the output.
- As an explorer, I want to browse and play all available instrument samples so I can discover sounds for my next composition.

## Scope Boundaries

### In Scope
- Browser-based playback of Claude-generated composition JSON
- Real-time mixing, effects, and visualization
- Sample browsing and interactive keyboard
- Claude skills/rules for composition generation
- Self-hosted GM instrument samples

### Out of Scope (Current)
- Multi-user collaboration
- Cloud storage of compositions
- Mobile-native app

### Planned for Future Scope
- Audio export (WAV/MP3) — confirmed as a desired feature
- Visual composition editing integrated into the timeline — replaces section-level-only view with beat-granular navigation and note editing
- DAW-direction features (arrangement editing, automation, recording)

### Non-Goals
- MIDI import/export — may revisit later but not planning for it now

## Open Questions

- [Open Decision] **UI approach**: Currently vanilla TypeScript DOM. React is being considered but not a hard requirement — clean patterns and possibly Tailwind CSS may be sufficient. Phase 2 discussion.
- [Open Decision] **State management**: Currently callback-based. Whether React or vanilla, need to establish clean, standard patterns for state flow.
- [Open Decision] **Composition editing boundary**: Currently Claude-only. Planning to add manual editing/creation capabilities — need to define where that UI lives and how it interacts with the JSON schema.
- [TODO] **Audio export**: Confirmed as a desired feature. Needs scoping — formats, quality options, export of full mix vs. stems.
