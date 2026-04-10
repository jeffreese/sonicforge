# EDM Full Editor — Phase B

## Overview

Build out the full DAW-style editing surface on top of Phase C: detailed parameter editors for every synth type, automation lane drawing in the piano roll, effect chain editor with drag-and-drop reordering, routing matrix for sidechain and sends, and a sample browser for bundled and user-uploaded one-shots. This phase turns SonicForge into a production-ready EDM workbench.

**This phase depends on `edm-macro-ui` (Phase C) shipping first.**

## Why

Phase C lets users tweak Claude-generated sounds through macro knobs, but producing EDM at a professional level means needing deeper control — adjusting individual envelope points, drawing complex automation curves, designing custom effect chains, and organizing sample libraries. Phase B provides that depth for users who want it, while preserving the simpler macro-level workflow for those who don't.

## Goals

1. **Full synth parameter editors** — every knob/parameter exposed per synth type
2. **Automation lane drawing** — draw curves directly in the piano roll timeline
3. **Effect chain editor** — add/remove/reorder effects with drag-and-drop
4. **Routing matrix** — visual sidechain and send routing
5. **Sample browser** — browse bundled and user-uploaded one-shots by category, BPM, key
6. **User sample upload** — drag-and-drop audio files into the library

## Non-Goals

- MIDI input / live performance recording
- Wavetable morphing synth (beyond Tone.js built-ins)
- Stem export beyond what audio-export ships
- Collaborative editing / multiplayer

## Requirements

### 1. Full Synth Editor

- Per-synth-type parameter editor panel (MonoSynth, FMSynth, etc. each get their own UI)
- All parameters exposed (oscillator, envelope, filter, filter envelope, modulation, FM params, etc.)
- Visual feedback: oscilloscope, spectrum analyzer, envelope shape preview
- A/B compare slots for auditioning changes

### 2. Automation Lane Drawing

- Add automation lanes to the piano roll timeline
- Draw curves with mouse: click to add points, drag to adjust value/time
- Snap-to-grid, copy/paste, quantize
- Multi-lane view per track (show multiple automated parameters simultaneously)
- Lane target picker: dropdown of all automatable parameters for the track

### 3. Effect Chain Editor

- Drag-and-drop reordering of effects in a track's chain
- Per-effect parameter panels (full set, not just macros)
- Bypass toggles
- Add effect from a categorized picker (reverb, delay, modulation, distortion, EQ, dynamics)
- Preset save/load per effect (not just whole patches)

### 4. Routing Matrix

- Visual graph of sidechain routing (kick → bass/pad with amount)
- Add/remove sidechain connections
- Send effect routing (track → shared reverb bus, etc.)
- Visual feedback of signal flow

### 5. Sample Browser

- Categorized view of bundled + user-uploaded one-shots
- Filter by category (kick, snare, hat, clap, fx, loop), BPM, key
- Preview on hover / click
- Drag into a track to add as an instrument
- Search by name

### 6. User Sample Upload

- Drag-and-drop audio files (WAV, MP3, OGG, FLAC)
- Automatic categorization hint (filename parsing) + user override
- BPM / key detection (stretch goal)
- Stored in IndexedDB (no backend)

## Architecture

- Major UI additions under `src/ui/`: `<sf-synth-editor>`, `<sf-automation-lane>`, `<sf-effect-chain-editor>`, `<sf-routing-matrix>`, `<sf-sample-browser>`
- New store: `SampleLibraryStore` for user-uploaded samples (IndexedDB persistence)
- Engine: extend `AutomationEngine` with drawing-friendly APIs (add/remove/update points)
- Piano roll extension: automation lanes rendered below the note area

## Dependencies

- **Phase C (edm-macro-ui)** must ship first
- **undo-redo** infrastructure strongly recommended before Phase B (complex edits without undo would be painful)
- **note-editing** and **timeline-visualization** are prerequisites for automation lane drawing

## Success Criteria

1. User can design a synth patch from scratch without editing JSON.
2. User can draw a filter sweep automation curve in the piano roll during a buildup.
3. User can build a custom effect chain and reorder effects live.
4. User can route sidechain compression via the matrix UI.
5. User can upload their own samples and use them in a composition.
6. A user can produce a complete EDM track from scratch using only SonicForge's UI.
