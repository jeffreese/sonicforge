# EDM Sound Design — Phase A: Schema + Engine

## Overview

Extend SonicForge's composition schema and engine to support the building blocks of EDM production: synthesized instruments, effects, parameter automation, sidechain compression, LFO modulation, and one-shot samples. **No UI changes in this phase** — all new capabilities are driven by composition JSON and the `/compose` skill.

This is Phase A of a three-phase EDM enhancement (A → C → B). Phase A proves Claude can generate production-style EDM tracks that sound right. Phases C and B add human-facing editing tools on top of this foundation.

## Why

SonicForge currently sounds like a notation playback tool, not a production tool. The fundamental limitation is that every instrument is a sampled acoustic instrument played note-for-note — there's no synthesis, no modulation, no automation, no sidechain. These are the defining characteristics of electronic music production, and without them the engine can play "a melody on a synth lead" but not "a supersaw lead with a filter sweep and sidechain ducking during the drop."

Tone.js already provides 90% of what's needed — synth types, effects, LFOs, signal routing, automation APIs. The missing piece is exposing those capabilities through the composition schema so Claude can drive them, and wiring the engine to interpret the new schema fields.

## Goals

1. **Hybrid compositions** — A single composition can mix sampled acoustic instruments, synthesized instruments, and one-shot samples on different tracks. No modes.
2. **Schema-driven sound design** — Synth patches, effects, automation, modulation all live in the composition JSON. No mutable UI state required.
3. **Backwards compatibility** — Existing compositions continue to load and play without changes. New fields are optional and default to the current behavior.
4. **Claude-composable** — The `/compose` skill can generate EDM tracks from a natural-language description without human tweaking.

## Non-Goals

- UI for editing synth parameters, effects, or automation (Phase C)
- Drawing automation curves in the piano roll (Phase B)
- User-uploaded one-shot samples via UI (Phase B — bundled samples only in A)
- Wavetable synthesis or Serum-style morphing (beyond Tone.js built-ins)
- MIDI input / live performance
- Custom DSP via AudioWorklet

## Requirements

### 1. Instrument Source Discriminator

Extend `InstrumentDef` with an optional `source` field:

```typescript
type InstrumentSource = 'sampled' | 'synth' | 'oneshot' | 'drums'

interface InstrumentDef {
  id: string
  category: InstrumentCategory
  sample?: string     // for source: 'sampled'
  synth?: SynthPatch  // for source: 'synth'
  oneshots?: Record<string, string>  // for source: 'oneshot'
  source?: InstrumentSource  // defaults to 'sampled' (or 'drums' if category === 'drums')
  // ... existing fields
}
```

The engine's `InstrumentLoader` dispatches to the right loading path based on `source`. The `TrackPlayer` is unchanged — it calls `triggerAttackRelease` on whatever instrument source is loaded.

### 2. Synthesizer Instruments

New `SynthInstrument` class wrapping Tone.js synth types, implementing the same `InstrumentSource` interface as `MultiLayerSampler`.

**Supported Tone.js synth types** (v1):
- `PolySynth` (wraps any monosynth for polyphony)
- `MonoSynth` (bass, leads)
- `FMSynth` (bells, electric pianos, harsh leads)
- `AMSynth` (tremolo textures)
- `DuoSynth` (supersaw-like, detuned pairs)
- `PluckSynth` (plucked strings, Karplus-Strong)

**Synth patch schema:**

```typescript
interface SynthPatch {
  type: 'mono' | 'poly' | 'fm' | 'am' | 'duo' | 'pluck'
  oscillator?: {
    type: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'fatsawtooth' | 'pulse' | ...
    detune?: number
    count?: number  // unison voices for 'fat*' types
    spread?: number
  }
  envelope?: {
    attack: number
    decay: number
    sustain: number
    release: number
  }
  filter?: {
    type: 'lowpass' | 'highpass' | 'bandpass'
    frequency: number
    Q: number
    rolloff?: -12 | -24 | -48
  }
  filterEnvelope?: {
    attack: number
    decay: number
    sustain: number
    release: number
    baseFrequency: number
    octaves: number
  }
  // FM-specific
  modulationIndex?: number
  harmonicity?: number
}
```

**Preset templates** — a library of named synth patches Claude can reference by name:

```typescript
const SYNTH_PRESETS: Record<string, SynthPatch> = {
  'supersaw_lead': { type: 'poly', oscillator: { type: 'fatsawtooth', count: 7, spread: 40 }, ... },
  'reese_bass': { type: 'mono', oscillator: { type: 'sawtooth' }, filter: { ... }, ... },
  'wobble_bass': { type: 'mono', ... }, // LFO attached separately
  'pluck_lead': { type: 'pluck', ... },
  'warm_pad': { type: 'poly', oscillator: { type: 'sine' }, envelope: { attack: 1.5, ... }, ... },
  'fm_bell': { type: 'fm', modulationIndex: 10, harmonicity: 3.01, ... },
  // ... 10–15 starter presets covering common EDM roles
}
```

Stored in `src/engine/synth-presets.ts`. Claude's `/compose` skill learns to reference these.

### 3. Effects Vocabulary

Extend the existing `EffectsChain` to support a broader set of Tone.js effects with schema-driven parameter maps.

**Supported effects (v1):**
- `reverb` — `Tone.Reverb` (decay, preDelay, wet)
- `delay` — `Tone.FeedbackDelay` (delayTime, feedback, wet)
- `pingpong` — `Tone.PingPongDelay` (delayTime, feedback, wet)
- `chorus` — `Tone.Chorus` (frequency, delayTime, depth, wet)
- `phaser` — `Tone.Phaser` (frequency, octaves, wet)
- `distortion` — `Tone.Distortion` (distortion amount, wet)
- `bitcrusher` — `Tone.BitCrusher` (bits, wet)
- `autofilter` — `Tone.AutoFilter` (frequency, baseFrequency, octaves, wet)
- `compressor` — `Tone.Compressor` (threshold, ratio, attack, release)
- `limiter` — `Tone.Limiter` (threshold)
- `eq3` — `Tone.EQ3` (low, mid, high, lowFrequency, highFrequency)
- `stereowidener` — `Tone.StereoWidener` (width)

**Schema:**

```typescript
interface EffectConfig {
  type: string  // 'reverb' | 'delay' | ...
  params: Record<string, number | string>
  bypass?: boolean
}

interface InstrumentDef {
  // ... existing fields
  effects?: EffectConfig[]  // already exists, now broader
}

interface SonicForgeComposition {
  // ... existing fields
  masterEffects?: EffectConfig[]  // new — master bus processing
}
```

The existing `EffectsChain` class is extended with a factory function `createEffect(config: EffectConfig): Tone.ToneAudioNode` that maps schema to Tone.js nodes.

### 4. Parameter Automation

New `automation` array at the composition level that schedules parameter changes over time.

**Schema:**

```typescript
interface AutomationPoint {
  time: string | number  // "bar:beat:sixteenth" or absolute beat
  value: number
  curve?: 'step' | 'linear' | 'exponential'  // default: linear
}

interface AutomationLane {
  target: string  // dotted path: "bass.filter.cutoff", "lead.volume", "master.reverb.wet"
  points: AutomationPoint[]
}

interface SonicForgeComposition {
  // ... existing fields
  automation?: AutomationLane[]
}
```

**Target path resolution:**
- `"<instrumentId>.<param>"` — track-level parameters (volume, pan)
- `"<instrumentId>.<effectType>.<param>"` — per-instrument effect parameters
- `"<instrumentId>.filter.cutoff"` — synth-specific parameters (for synth instruments)
- `"master.<effectType>.<param>"` — master bus effect parameters

**Engine implementation:**
- New `AutomationEngine` class that resolves target paths to `Tone.Signal` / `Tone.Param` instances
- On play, schedules `setValueAtTime` / `linearRampToValueAtTime` / `exponentialRampToValueAtTime` for each point
- Clears scheduled values on stop/seek

### 5. Sidechain Compression

Schema declares a kick→target ducking relationship. Engine implements it via `Tone.Follower` (envelope follower on the source) modulating a `Tone.Gain` on the target signal path.

**Schema:**

```typescript
interface SidechainConfig {
  source: string  // instrumentId of the trigger (usually "kick")
  target: string  // instrumentId to duck
  amount: number  // 0–1, how much to duck (1 = full silence on hit)
  attack?: number  // follower attack in seconds
  release?: number  // follower release in seconds
}

interface SonicForgeComposition {
  // ... existing fields
  sidechain?: SidechainConfig[]
}
```

**Engine implementation:**
- New `SidechainRouter` class
- On load, for each sidechain entry: tap the source track post-fader, route through `Tone.Follower`, subtract from target's gain
- ~50 lines of code, no new dependencies

### 6. LFO Modulation

Schema declares LFO sources and routes them to parameters.

**Schema:**

```typescript
interface LFOConfig {
  id: string
  frequency: number | string  // Hz or note value like "4n"
  type?: 'sine' | 'square' | 'sawtooth' | 'triangle'
  min: number
  max: number
}

interface ModulationRoute {
  source: string  // LFO id
  target: string  // parameter path (same format as automation)
  amount?: number  // 0–1 scaling
}

interface SonicForgeComposition {
  // ... existing fields
  lfos?: LFOConfig[]
  modulation?: ModulationRoute[]
}
```

**Engine implementation:**
- Create `Tone.LFO` for each entry on composition load
- Connect LFO output to target signal (via Gain scaler for `amount`)
- Start LFOs on play, stop on stop
- Dispose on composition unload

### 7. One-Shot Sample Instruments

New `OneShotInstrument` source type using `Tone.Player` for fixed-pitch samples (kicks, snares, vocal chops, risers, FX hits).

**Schema:**

```typescript
interface InstrumentDef {
  // ... existing fields
  oneshots?: Record<string, string>  // mapping of hit name → sample URL
  // e.g., { "kick": "oneshots/kicks/808_kick_01.wav", "clap": "oneshots/claps/trap_clap.wav" }
}
```

**Track usage:**
Notes reference the hit name instead of a pitch:
```json
{ "time": "0:0:0", "pitch": "kick", "duration": "16n", "velocity": 100 }
```

**Engine:**
- `OneShotInstrument` loads each sample into a `Tone.Player`
- `triggerAttackRelease(hitName, ...)` plays the matching player
- Velocity scales the player's volume
- All players connect to a shared output Gain (the instrument's channel strip)

**Bundled samples (v1):**
- `public/samples/oneshots/kicks/` — 3–5 kicks (808, acoustic, trap, house, techno)
- `public/samples/oneshots/snares/` — 3–5 snares
- `public/samples/oneshots/hats/` — 3–5 hi-hats (closed, open, shaker)
- `public/samples/oneshots/claps/` — 2–3 claps
- `public/samples/oneshots/fx/` — 3–5 risers, impacts, sweeps
- Free CC0 samples from Freesound.org or similar — committed to the repo (small files, ~1MB total)

### 8. Compose Skill Update

Extend the `/compose` skill to understand the new capabilities.

**Changes:**
- Add a "genre" hint (house, techno, dubstep, trap, future bass, ambient, etc.)
- Teach Claude the available synth presets, effects, and one-shot samples
- Document the automation schema and common EDM patterns (buildup filter sweep, drop sidechain, risers)
- Add 2–3 example EDM compositions in `compositions/examples/edm/`

The skill file and rules updates are part of this phase.

## Architecture

### Instrument Loading Flow

```
InstrumentDef
  ├── source: 'sampled'  → MultiLayerSampler (current)
  ├── source: 'synth'    → SynthInstrument (new, wraps Tone.*Synth)
  ├── source: 'oneshot'  → OneShotInstrument (new, wraps Tone.Player)
  └── source: 'drums'    → DrumKit (current, synthesized)
```

All four implement the same `InstrumentSource` interface:
```typescript
interface InstrumentSource extends Tone.ToneAudioNode {
  triggerAttackRelease(pitch: string, duration: number, time?: number, velocity?: number): void
  dispose(): void
}
```

### Signal Flow

```
InstrumentSource
  → EffectsChain (per-track effects)
  → MixBus channel (volume, pan, solo, mute)
  → [Sidechain ducking layer, if target]
  → Master bus
  → Master EffectsChain
  → Tone.Destination
```

Automation targets can point to any `Tone.Param` / `Tone.Signal` in this chain.

### New Engine Modules

- `src/engine/SynthInstrument.ts` — synth wrapper
- `src/engine/OneShotInstrument.ts` — one-shot wrapper
- `src/engine/AutomationEngine.ts` — automation scheduler + target resolver
- `src/engine/SidechainRouter.ts` — sidechain compression routing
- `src/engine/ModulationEngine.ts` — LFO creation + routing
- `src/engine/effect-factory.ts` — schema → Tone.js effect node factory
- `src/engine/synth-presets.ts` — named synth patch library

### Schema File Changes

- `src/schema/composition.ts` — add new types (SynthPatch, EffectConfig, AutomationLane, LFOConfig, etc.)
- `src/schema/validate.ts` — validation for new fields (ensure target paths exist, LFO ids are unique, etc.)

## Dependencies

- **Tone.js** — already a dependency; no new packages
- **Sample overhaul** — must ship first (Phase A builds on the new `InstrumentLoader` dispatch)
- **Free CC0 one-shot samples** — source from Freesound.org under CC0 license; commit ~1MB to repo

## Out of Scope

- UI for any of this (Phases C and B)
- Wavetable morphing (beyond Tone.js built-ins)
- User-recorded / user-uploaded samples
- MIDI input / live performance
- Export to stems (covered by audio-export backlog item)
- Parameter smoothing / de-clicking beyond what Tone.js provides natively

## Success Criteria

1. A composition JSON with a synth lead, sidechain-ducked pad, automated filter sweep, and one-shot kick/snare plays correctly in the browser.
2. Existing compositions load and play without any changes (backwards compat).
3. The `/compose` skill can generate a 32-bar EDM track (house, techno, or dubstep) from a natural-language prompt that sounds coherent and genre-appropriate.
4. All new code has unit tests for schema parsing, effect factory, automation scheduling, and sidechain routing.
5. At least one bundled EDM example composition in `compositions/examples/edm/` demonstrates all new capabilities.
