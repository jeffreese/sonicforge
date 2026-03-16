---
title: "Scope & Constraints"
phase: 1
project: sonicforge
date: 2026-03-15
status: draft
---

# Scope & Constraints

## Project Scope

SonicForge delivers a complete browser-based music playback engine with:

1. **Composition engine** — Validates, loads, and plays structured JSON compositions with high-quality GM samples
2. **Mixing & effects** — Per-track volume, pan, mute/solo, and effects chain (reverb, delay, chorus, distortion, EQ, compressor)
3. **Visualization** — Canvas timeline with playhead, section grid, click-to-seek, and section looping
4. **Sample tools** — Browse all 128 GM instruments, preview samples, play via computer keyboard, hot-swap in running compositions
5. **Claude integration** — Skills and rules that enable Claude to generate, modify, and explain compositions as JSON
6. **Responsive UI** — Works across desktop and narrower viewports

All features listed above are implemented and functional in the current codebase.

## Non-Goals

- **DAW replacement** — This is a composition and playback tool, not a full production suite
- **User accounts or cloud storage** — Compositions are local files or pasted JSON
- **Mobile app** — Browser-only, with responsive layout for smaller screens

## Planned Future Capabilities

These are explicitly **not** current scope but are confirmed as future direction:

- **Audio export** (WAV/MP3) — Export rendered compositions
- **Integrated timeline/editor** — Beat-granular navigation with visible notes and editing tools, replacing the section-level-only timeline
- **DAW-direction features** — Arrangement editing, automation lanes, effect extensibility, potentially MIDI controller input

## Non-Goals

- **MIDI import/export** — May revisit but not planning for now

## Technical Constraints

### Current Stack (subject to change in Phase 2)
- **TypeScript** (strict mode) — Core language
- **Tone.js** — WebAudio abstraction for playback, sampling, effects, transport
- **Vite** — Build tool and dev server
- **Vanilla DOM** — No UI framework [Open Decision: React is being considered but not a hard requirement; clean patterns + Tailwind may be an alternative]
- **HTML5 Canvas** — Timeline visualization
- **Self-hosted samples** — OGG files extracted from SoundFont 2 via Python scripts (no CDN fallback)

### Hard Constraints
- **Browser-only** — No server-side component; everything runs client-side
- **WebAudio API** — Playback quality and latency bounded by browser audio capabilities
- **GM sample set** — 128 melodic instruments + drum kit; not extensible without new sample extraction
- **Composition JSON schema** — Stable interface between Claude and the engine; changes here affect both sides

### Chosen Constraints
- **Claude-driven composition as primary workflow** — Claude generates compositions via skills/rules. However, manual editing and creation capabilities are planned as a complementary workflow.
- **Musical time units only** — All timing expressed as bar:beat:sixteenth, never raw seconds

## Timeline & Milestones

This is a personal project with no hard deadlines. The original 5-phase plan is complete:

| Phase | Status | What was delivered |
|-------|--------|--------------------|
| 1 — MVP Playback | Complete | Core engine, transport, composition loading |
| 2 — Visualization & Mixing | Complete | Timeline, mixer, effects chain |
| 3 — Claude Integration | Complete | Compose/iterate/explain skills, rules |
| 4 — Polish | Complete | URL loading, looping, chords, responsive layout |
| 5 — Sample Browser | Complete | Explorer, keyboard mode, inline picker |

**Current goal**: Retrofit the project with proper structure (CLAUDE.md, rules, skills, dev config) and reconsider technology choices — particularly the move from vanilla DOM to React.

## Dependencies

| Dependency | Provides | Stability | Fallback |
|------------|----------|-----------|----------|
| **Tone.js** (v15.0.4) | WebAudio playback, samplers, effects, transport | Stable, mature library | None — core dependency |
| **SoundFont 2 samples** | GM instrument audio (OGG) | Static asset, self-hosted | None — must be extracted locally |
| **Vite** (v6.0.0) | Build tooling, dev server, HMR | Stable | Standard bundler, replaceable |
| **Claude** | Composition generation via skills/rules | Dependent on Claude Code availability | Compositions can be hand-written JSON |

## Risk Factors

### Framework Migration Complexity
**Likelihood:** High (it's planned) | **Impact:** Medium
Migrating from vanilla DOM to React touches every file in `src/ui/`. The engine and schema layers are cleanly separated, so those should be unaffected. Risk is in the migration itself — making sure all UI behaviors (canvas rendering, keyboard handling, drag-drop, resize observers) work correctly in the new framework.
**Mitigation:** Engine/schema layers are already framework-agnostic. Migration can be done component-by-component.

### Tone.js Integration with React
**Likelihood:** Medium | **Impact:** Medium
Tone.js manages its own state (transport, samplers, effects) and doesn't use React patterns. Bridging the two requires careful lifecycle management (initialization, cleanup, avoiding duplicate audio contexts).
**Mitigation:** Keep a thin adapter layer between React components and the engine. Don't try to make Tone.js state reactive — use callbacks and refs.

### Sample Size & Loading Performance
**Likelihood:** Low | **Impact:** Low
Self-hosted samples are ~168MB total. Initial load for a composition can be slow depending on how many instruments need samples fetched.
**Mitigation:** Already implemented per-instrument loading progress. Could add lazy loading or sample streaming in the future.
