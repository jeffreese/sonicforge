# SonicForge

Browser-based music engine. Claude generates music as structured JSON data; a JS playback engine renders it with high-quality instrument samples.

## Architecture

- **Composition JSON** — The interface between Claude and the engine. All music is expressed as structured data with notes, timing, dynamics, and arrangement.
- **Engine** (`src/engine/`) — TypeScript playback engine using Tone.js + self-hosted samples. Validates JSON, loads samples, schedules notes, manages transport.
- **UI** (`src/ui/`) — Vanilla TypeScript DOM. Transport controls, composition loader, info display.
- **Claude Config** (`.claude/`) — Skills and rules that guide Claude to generate valid, musical composition JSON.

## Commands

- `npm run dev` — Start Vite dev server
- `npm run build` — Type-check and build for production
- `npm run preview` — Preview production build

## Key Conventions

- All timing in musical units (bars:beats:sixteenths), never raw seconds
- Duration notation: `"1n"`, `"2n"`, `"4n"`, `"8n"`, `"16n"`, `"32n"`, dotted with `"."`
- Velocity: 0–127 (default 80)
- Drum tracks use named hits: `"kick"`, `"snare"`, `"hihat"`, etc.
- Samples self-hosted in `public/samples/` (extracted from SF2 via `scripts/extract-samples.py`)
- No UI framework — vanilla DOM manipulation
- No composition logic in application code — all music generation lives in Claude config (skills/rules)

## Composition JSON Schema

See `src/schema/composition.ts` for the full TypeScript interface. Key structure:
- `metadata` — title, bpm, timeSignature, key
- `instruments[]` — id, sample (GM program name), category
- `sections[]` — name, bars, tracks[]
- `tracks[]` — instrumentId, notes[]
- `notes[]` — pitch, time, duration, velocity, articulation

## File Layout

```
src/schema/     — TypeScript types and runtime validation
src/engine/     — Playback engine (Engine, Transport, TrackPlayer, InstrumentLoader, SampleLoader)
src/ui/         — Browser UI components
src/util/       — Timing and music theory helpers
compositions/   — Example and generated JSON compositions
scripts/        — Sample extraction tooling (Python + fluidsynth + ffmpeg)
public/samples/ — Self-hosted instrument samples (gitignored, generated locally)
```
