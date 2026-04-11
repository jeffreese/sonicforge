# Compose Helpers

TypeScript helper library for long-form SonicForge composition authoring. Imported from throwaway scratch scripts during `/compose` and `/remix` to handle the mechanical stenography of repetitive patterns — drum grids, bass lines, pad sustains, arpeggios, humanization passes — so musical decisions stay hand-written.

See [`docs/plans/compose-helpers/spec.md`](../../docs/plans/compose-helpers/spec.md) for the full design rationale and creativity safeguards.

## When to reach for helpers

**Use helpers when:** the composition is over ~32 bars or expected to exceed ~200 notes, and a track is mechanically repetitive (drum grids, rhythmic bass patterns, held pad voicings).

**Don't use helpers for:** short compositions, melodic leads, fills, transitions, or any creative decision. Those stay hand-written.

## How to use them

Helpers are plain TypeScript functions that take a parameter object and return `Note[]`. Write a throwaway scratch script (typically in `/tmp/`), import what you need, build up note arrays, merge with hand-written tracks, and emit the final composition JSON.

```typescript
import { fourOnFloor } from '../../tools/compose-helpers/drums'
import { rootOctaveBounce } from '../../tools/compose-helpers/bass'
import { padSustain } from '../../tools/compose-helpers/harmony'
import { velocityCurve } from '../../tools/compose-helpers/humanize'

const progression = [['Am'], ['F', 'E'], ['Dm', 'C'], ['E', 'Am']]

const drums = fourOnFloor({ bars: 16, openHatEvery: 2 })
const bass = rootOctaveBounce({ progression, bars: 16 })
const pad = padSustain({ progression, bars: 16, voicing: 'close' })

// Hand-edit as needed — helper output is a starting point
drums.push({ pitch: 'crash', time: '15:0:0', duration: '1n', velocity: 115 })

// Humanize the drum velocities before emitting
const humanizedDrums = velocityCurve(drums, { style: 'natural' })
```

## Conventions for adding new helpers

Follow these rules when extending the library. New helpers are **explicitly encouraged** — if you find yourself writing a pattern inline in a scratch script, extract it. Don't reinvent ad-hoc generators session-to-session.

1. **One concept per helper.** If a function does two things, split it.
2. **Single parameter object.** No positional arguments. Clarity over brevity.
3. **~5 params max.** If a helper grows past five parameters, its scope is too wide — split it.
4. **Return `Note[]`.** Nothing else. Helpers produce note data for tracks, not whole tracks, sections, or compositions. Composition assembly stays in the scratch script.
5. **Pure functions.** No file I/O, no mutation of input, no side effects. Deterministic given the same input.
6. **No genre logic.** `trapBeat()` is out; `drumGrid({ kickBeats, snareBeats, hatSubdivision })` is in. Genre knowledge lives in `.claude/skills/compose/genre-templates.md`, not in helper code.
7. **Co-located vitest tests.** Every new helper gets a `<name>.test.ts` file alongside the source. Cover the happy path, one edge case (0 bars / empty input), and the output shape.
8. **Import types from the schema directly.** `import type { Note } from '../../src/schema/composition'`. Do not duplicate or re-export types.

## Function inventory

### `time.ts`

- `beatTime(bar, beat, sixteenth?)` — build a `"bar:beat:sixteenth"` time string
- `beatsToTime(totalBeats)` — convert a flat beat offset to a time string
- `offsetBars(time, barDelta)` — shift a time string by a number of bars

### `chords.ts`

- `CHORD_TONES` — lookup table from chord name (e.g., `"Am"`) to `{ root, third, fifth, seventh? }` MIDI note names
- `voicing(chord, opts)` — build a chord voicing at a target octave with a choice of close/open/drop2
- `parseProgression(str)` — parse a string like `"Am | F-E | Dm-C | E-Am"` into a bar-by-bar chord array

### `drums.ts`

- `fourOnFloor(opts)` — four-on-the-floor pattern (house, bass house, trance)
- `halfTime(opts)` — half-time pattern (dubstep, future bass, trap)
- `breakbeat(opts)` — amen-break-style syncopated pattern (drum & bass)
- `trap(opts)` — trap hi-hat roll pattern with kick/snare

### `bass.ts`

- `subSustain(opts)` — whole or half-note root sustains per chord (dubstep sub, deep house foundation)
- `rootOctaveBounce(opts)` — root on beats, octave on offbeats (bass house, tech house)
- `offbeatPump(opts)` — bass on all offbeats (trance driving bass)

### `harmony.ts`

- `padSustain(opts)` — hold chord tones over N bars at a given velocity
- `stabOnBeats(opts)` — rhythmic chord stabs on specified beats
- `arpeggio(opts)` — rotate chord tones up / down / up-down at a subdivision

### `humanize.ts`

- `velocityCurve(notes, opts)` — apply a velocity shape to existing notes (natural, crescendo, decrescendo, accented-downbeats)
- `timingJitter(notes, opts)` — micro-offset notes by a random amount for non-mechanical feel
