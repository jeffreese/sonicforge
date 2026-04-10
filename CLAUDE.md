# SonicForge

SonicForge is a browser-based music composition workbench. Claude generates compositions as structured JSON via skills (`/compose`, `/iterate`); a TypeScript engine renders them with GM-standard instrument samples via Tone.js; and a Lit web component UI provides DAW-style visualization, mixing, and editing. The composition JSON schema is the central data format — both Claude and the user read and write to it.

Entirely client-side: no server, no database, no auth. Audio processing, UI, and state all live in the browser.

## Key Commands

```
pnpm dev              # Start Vite dev server
pnpm build            # TypeScript check + Vite production build
pnpm preview          # Preview production build locally
pnpm lint             # biome check src/
pnpm format           # biome format --write src/
pnpm test             # vitest run
```

**Sample extraction** (one-time setup, not part of daily workflow):
```
python scripts/extract-samples.py    # Requires Python, FluidSynth, FFmpeg
```

Samples live in `public/samples/{instrument}/` with a `manifest.json` per instrument. Once extracted, they're committed and don't need re-extraction unless adding new instruments.

**Restart `pnpm dev` after extraction.** Vite's dev server caches the `public/` listing at startup and won't serve files added while it's running — the browser will get the SPA fallback HTML instead of the `.ogg` files and decode will fail with `EncodingError: Unable to decode audio data`.

## Git Workflow

All work happens on feature branches, never directly on `main`. The standard flow:

1. `/forge:next` (or manually) — create a branch from `main` (`feat/`, `fix/`, `chore/`, `refactor/`, `docs/`)
2. Implement the change with commits on the branch
3. `/forge:ship` — run checks, commit, push, create a PR
4. User reviews the PR on GitHub and merges to `main`

Do not commit directly to `main`. Do not push to `main`. If you're on `main` and the user asks to start work, create a feature branch first.

## Architecture

### Layers

```
Lit Components → Reactive Stores → Engine Layer → Tone.js / WebAudio
```

- **Lit Components** (`src/ui/`): Web components using light DOM. All styling via design token maps — no raw Tailwind classes in templates.
- **Reactive Stores** (`src/stores/`): Four observable stores (Composition, Transport, Mixer, UI) that bridge engine state and UI. CompositionStore is the central document — all mutations go through `dispatch(command)`.
- **Engine Layer** (`src/engine/`): Wraps all Tone.js interactions. UI components never import Tone.js directly.
- **Schema / Validation** (`src/schema/`): Composition JSON types, validation, chord expansion. Framework-agnostic — shared by engine, stores, and Claude skills.

### Key Boundaries

- UI → Engine: only through stores. Components subscribe to store state, dispatch actions.
- Engine → Tone.js: Engine wraps all Tone.js objects. Nothing else touches Tone.js.
- Claude → App: Claude writes composition JSON to disk. User loads it via the composition loader. The app works independently of Claude.

## Conventions

### Naming
- Lit components: `<sf-*>` prefix, kebab-case (`<sf-transport-bar>`)
- Component files: `sf-component-name.ts` in `src/ui/`
- Stores: PascalCase class, camelCase instance (`CompositionStore` / `compositionStore`)

### Styling
- **No raw Tailwind classes in Lit templates.** Import semantic style maps from `src/styles/components.ts` (e.g., `btn.primary`, `surface.elevated`).
- Design tokens defined as CSS custom properties in `src/styles/tokens.css`
- Dark theme is default. Light theme changes custom property values only — no component changes.

### Schema
- Composition JSON schema is defined in `src/schema/composition.ts` — this is the single source of truth. Claude skills, validation, and the engine all reference this file. When generating or modifying composition JSON, read this file for the current structure.
- **Instrument sources** dispatch via `InstrumentDef.source`: `'sampled'` (default, GM samples), `'synth'` (Tone.js synth via preset name or inline `SynthPatch`), `'oneshot'` (fixed-pitch percussion/FX via hit name → URL map), `'drums'` (synthesized `DrumKit`). Engine routes each type through its own `InstrumentSource` class. See ADR-009 for the design rationale.
- **Composition-level EDM fields** (all optional, backwards-compatible): `masterEffects[]`, `automation[]`, `lfos[]` + `modulation[]`, `sidechain[]`. Reference docs for Claude generation live at `.claude/skills/compose/{synth-presets,effects-reference,modulation-patterns,oneshot-hits}.md`.

### State
- All composition mutations go through `CompositionStore.dispatch(command)` — never modify state directly
- UI components never import from `tone` — all audio interaction goes through the engine layer
- Stores use observable subscriber pattern with lifecycle management (subscribe on connect, unsubscribe on disconnect)

### Testing
- Co-located test files: `sf-transport-bar.test.ts` next to `sf-transport-bar.ts`
- Same pattern for stores and engine: `composition-store.test.ts` next to `composition-store.ts`
- Tests written alongside implementation, not deferred

### File Organization
```
src/ui/         — Lit components
src/stores/     — Reactive stores
src/engine/     — Tone.js wrappers
src/schema/     — Composition types, validation, chord expansion
src/styles/     — Design tokens and component style maps
src/util/       — Timing and music theory helpers
src/data/       — GM instrument definitions
compositions/   — Example and generated JSON compositions
scripts/        — Sample extraction tooling (Python + FluidSynth + FFmpeg)
public/samples/ — Self-hosted instrument samples (gitignored, extracted locally)
docs/spec/      — Planning documents from Forge (feature spec, tech spec, task breakdown)
docs/adrs/      — Architectural decision records (from planning and development)
docs/plans/     — Development plans, backlog, and task breakdowns
```

## Behavioral Notes

- **Don't auto-test in the browser.** After making changes, tell the user what to verify and offer to test in the browser if they'd like — don't launch the browser automatically.
- **Audio context requires user gesture.** `Engine.init()` must be called from a user interaction (click, keypress). Don't try to auto-play or initialize audio on page load — browsers will block it.
- **Tone.js manages its own state.** Don't manage Tone.js object lifecycle from Lit component lifecycle. The engine layer owns creation/destruction of Tone.js objects.
- **Composition JSON is the source of truth.** When modifying music, update CompositionStore — don't manipulate Tone.js objects directly. The engine re-schedules from the store.
- **Existing skills are working and valuable.** The `/compose`, `/iterate`, `/explain`, and `/play` skills plus `composition-format` and `music-theory` rules predate the Lit migration. They work with the engine/schema layers which aren't changing.
- **This is a migration, not a greenfield.** The engine, schema, and utility layers are stable. Only `src/ui/` is being rewritten. Don't refactor working engine code unless there's a specific reason.

## ADRs

Architectural decisions are documented in `docs/adrs/`. Read them when making related architectural choices. Capture new decisions with `/forge:adr`.

## Forge Plugin

Development workflow skills are provided by the forge plugin (`/forge:*` namespace). Key commands:
- `/forge:next` — find next task, create branch, implement
- `/forge:ship` — test, review, commit, push, PR
- `/forge:new-feature` — structured feature request interview
- `/forge:retro` — end-of-session retrospective
- `/forge:friction-log` — quick friction capture
- `/forge:adr` — capture architectural decisions

Runtime state lives in `.forge/` (dev-state.json, config.json, friction.md).
