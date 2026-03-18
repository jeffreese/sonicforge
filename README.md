# SonicForge

A browser-based music composition workbench where AI generates structured compositions and a client-side engine renders them in real time.

SonicForge pairs Claude's generative capabilities with a TypeScript audio engine to turn natural-language musical intent into playable, editable compositions — entirely in the browser. There's no server, no database, no auth. You describe what you want; the system produces a structured JSON score; and a DAW-style interface lets you visualize, mix, and refine the result.

The project was built using Forge, the author's AI meta-generator tool, as a practical demonstration of AI-assisted full-stack development — from architecture decisions through implementation.

<!-- TODO: Add screenshot/demo GIF -->

---

## Architecture

SonicForge is organized in four layers, each with a clear boundary of responsibility:

```
Lit Components  →  Reactive Stores  →  Engine Layer  →  Tone.js / WebAudio
    (UI)            (state)            (scheduling,       (synthesis,
                                        sequencing)        playback)
```

**Lit Components** handle all rendering and user interaction — track views, mixer controls, transport, and editing surfaces. They subscribe to reactive stores and dispatch intents downward.

**Reactive Stores** own application state: the current composition, playback position, mixer settings, selection. Components read from stores; the engine writes to them during playback.

**Engine Layer** translates the structured JSON composition format into scheduled audio events. It handles sequencing, timing, and coordination — the bridge between musical data and sound.

**Tone.js / WebAudio** sits at the bottom, responsible for actual synthesis and playback using GM-standard instrument samples.

Compositions are represented as plain JSON, which makes them easy to generate, serialize, diff, and version. Claude Code skills produce these structures directly — no intermediate format or compilation step.

## Tech Stack

- **TypeScript** — strict mode throughout
- **Lit** — web components for the UI layer
- **Tone.js** — audio engine and scheduling
- **Vite** — dev server and build tooling
- **Tailwind CSS** — utility-first styling
- **Biome** — linting and formatting
- **Vitest** — unit and integration tests

## Getting Started

```bash
git clone https://github.com/jeffreese/sonicforge.git
cd sonicforge
pnpm install
pnpm dev
```

The dev server starts at `http://localhost:5173`. Everything runs client-side — no backend services to configure.

### Build

```bash
pnpm build      # Production build to dist/
pnpm preview    # Preview the production build locally
```

### Test

```bash
pnpm test       # Run test suite
pnpm lint       # Lint and format check via Biome
```
