# EDM Macro UI — Phase C

## Overview

Add a human-facing UI for tweaking synth patches, effects, and presets on top of the Phase A schema foundation. This is Phase C of the EDM enhancement roadmap — it lets the user audition and adjust Claude-generated sounds without editing JSON, while keeping the editing surface small via macro knobs (not full parameter editors).

**This phase depends on `edm-sound-design-schema` (Phase A) shipping first.**

## Why

Phase A lets Claude generate EDM tracks with rich sound design, but the user has no way to adjust them short of editing the JSON by hand. A producer's workflow involves auditioning a patch, twisting a few knobs, and listening — the kind of tight feedback loop that shapes a track from "generated" to "yours." Phase C provides that loop without building a full DAW editor (that's Phase B).

The macro knob approach borrows from Ableton Live's Device Racks and NI Maschine: 8 visible knobs per instrument that each control multiple underlying parameters in musically meaningful ways ("brightness" = filter cutoff + resonance; "space" = reverb wet + decay; "drive" = distortion + saturation).

## Goals

1. **Per-instrument inspector panel** showing patch, effects, macros, and automation summary
2. **8–12 macro knobs per instrument** mapped to musically meaningful parameter combinations
3. **Preset save/load** — save current patch as JSON, load from a preset library
4. **Real-time editing** — knob twists update playback immediately for auditioning
5. **Preserve Phase A compatibility** — all edits write back to composition JSON; nothing lives only in UI state

## Non-Goals

- Full parameter editing (all knobs for every synth — that's Phase B)
- Automation lane drawing (Phase B)
- Effect chain reordering UI (Phase B)
- Routing matrix UI (Phase B)
- Sample browser / one-shot library UI (Phase B)

## Requirements

### 1. Instrument Inspector Panel

- New `<sf-instrument-inspector>` Lit component
- Appears when a track is selected in the arrangement view or mixer
- Shows: instrument name, source type, current patch/preset name, macro knob row, effects summary, automation summary (read-only in this phase)

### 2. Macro Knob System

- Each synth preset defines 8 named macros and their parameter mappings
- Macro definitions stored alongside presets in `src/engine/synth-presets.ts` (or a new `macros.ts`)
- Example macro: `"brightness"` → `{ filter.cutoff: 0..10000, filter.Q: 0..4 }` with curves
- Macro values persist in the composition JSON (new `macros: Record<string, number>` field on InstrumentDef)
- Macro value range is 0–1; the macro definition scales to underlying params

### 3. Knob Component

- New `<sf-knob>` Lit component (rotary control)
- Drag to adjust value, scroll wheel for fine-tune
- Double-click to reset to default
- Accessible keyboard control (arrow keys)
- Styled via design tokens (no raw Tailwind)

### 4. Preset Save/Load

- "Save Preset" button in inspector — prompts for preset name, saves current patch + macros as JSON
- "Load Preset" dropdown — browse bundled and user-saved presets
- User presets stored in browser localStorage (no backend)
- Bundled presets stored in `src/engine/synth-presets.ts`

### 5. Real-Time Parameter Updates

- Knob changes dispatch updates through `CompositionStore.dispatch()` (existing pattern)
- Engine listens for patch updates and applies them to live Tone.js nodes without re-loading
- New `Engine.updateInstrumentPatch(id, patch)` method

### 6. Effects Summary (Read-Only)

- List of active effects on the instrument
- Shows type + key params
- No editing in this phase — click-through to Phase B's full editor (placeholder)

### 7. Automation Summary (Read-Only)

- List of automation lanes targeting this instrument's parameters
- Shows parameter name + point count
- No editing in this phase

## Architecture

- New UI components under `src/ui/`: `<sf-instrument-inspector>`, `<sf-knob>`, `<sf-macro-row>`
- New store action: `updateInstrumentMacros(id, macros)`
- New engine method: `Engine.updateInstrumentPatch(id, patch)` that patches live Tone.js nodes
- Presets saved/loaded through a new `src/engine/preset-store.ts` module (localStorage + bundled)

## Dependencies

- **Phase A (edm-sound-design-schema)** must ship first
- **undo-redo** infrastructure would be nice but not blocking (can land first if prioritized)

## Success Criteria

1. User can click a track, see its synth patch, twist macro knobs, and hear changes in real-time.
2. User can save the current patch as a preset and load it back into any instrument.
3. Macro edits persist with the composition (round-trip save/load).
4. Bundled preset library covers common EDM roles (leads, basses, pads, plucks) and each preset has meaningful macro mappings.
