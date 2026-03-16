---
title: "Migration: Vanilla DOM → Lit Web Components"
priority: 1
status: queued
created: 2026-03-15
---

# Migration: Vanilla DOM → Lit Web Components

## Overview

Rewrite SonicForge's UI layer from vanilla TypeScript DOM manipulation to Lit web components with Tailwind CSS styling via design tokens and reactive stores for state management. The engine, schema, and utility layers are untouched — only `src/ui/` is rewritten.

## Why

The current vanilla DOM code (~7 files) works but lacks structure, reusability, and reactive state management. The planned visual editor (piano roll) and DAW-direction features will increase UI complexity significantly. Lit provides a component model with reactive properties without the overhead of a virtual DOM that would fight Tone.js's audio state management.

## Requirements

- All existing UI functionality preserved exactly (load, play, mix, seek, loop, sample browse, keyboard)
- Lit web components with `<sf-*>` prefix, light DOM only
- Tailwind CSS via design token abstraction (semantic style maps, no raw classes)
- Four reactive stores bridging engine and UI (Composition, Transport, Mixer, UI)
- CompositionStore uses command pattern dispatch for future undo/redo
- Co-located Vitest tests for all new code
- Biome linting + formatting
- husky + lint-staged pre-commit hooks

## Architectural Decisions

- ADR-001: Lit over React
- ADR-002: Tailwind with design token abstraction
- ADR-003: Light DOM for all components
- ADR-004: Reactive stores
- ADR-005: Integrated timeline/editor (post-MVP)
- ADR-006: Command pattern for undo/redo
- ADR-007: WAV + OGG export (post-MVP)

## Dependencies

None — this is the first plan.

## Risk Flags

- **Tone.js lifecycle**: Audio context and samplers are managed by the engine. Lit component lifecycle (connectedCallback/disconnectedCallback) must not interfere with audio object lifetime.
- **Canvas rewrite**: The arrangement/timeline component uses HTML5 Canvas. This is the most complex migration — pointer events, zoom, scroll, playhead animation all need careful handling.

## Out of Scope

- Integrated editor (piano roll editing) — separate plan
- Audio export — separate plan
- Undo/redo — separate plan (depends on editor)
