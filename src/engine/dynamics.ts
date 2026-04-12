/**
 * Dynamic marks envelope — converts `DynamicMark[]` from the composition
 * schema into a queryable per-track velocity multiplier function.
 *
 * The multiplier scales note velocities so that a `pp` section sounds
 * proportionally softer than an `f` section without erasing per-note
 * micro-dynamics (accent/ghost/phrasing variations the composer wrote
 * into the velocity field). An `mf` multiplier of 1.0 means existing
 * compositions without dynamics play byte-identically to before.
 *
 * Uses the MIDI Standard Level 2 velocity mapping (ppp=16 through fff=127)
 * divided by `mf=80` so the multiplier is centered at 1.0. Matches how
 * DAWs and notation software interpret dynamic marks.
 */

import type { DynamicMark } from '../schema/composition'

// ─── Level → velocity mapping ─────────────────────────────────────────────

/** MIDI Standard Level 2 velocities for each dynamic level. */
const LEVEL_VELOCITIES: Record<DynamicMark['level'], number> = {
  ppp: 16,
  pp: 33,
  p: 49,
  mp: 64,
  mf: 80,
  f: 96,
  ff: 112,
  fff: 127,
}

/** The baseline velocity that maps to multiplier 1.0. */
const BASELINE_VELOCITY = LEVEL_VELOCITIES.mf // 80

/**
 * Convert a dynamic level string to a velocity multiplier.
 *
 * `mf` → 1.0 (unchanged from current behavior).
 * Levels below `mf` produce multipliers < 1 (quieter).
 * Levels above `mf` produce multipliers > 1 (louder; may clip at 127
 * after the final clamp in TrackPlayer).
 */
export function levelToMultiplier(level: DynamicMark['level']): number {
  return LEVEL_VELOCITIES[level] / BASELINE_VELOCITY
}

// ─── Envelope construction ────────────────────────────────────────────────

/**
 * A compiled dynamic envelope for a single track. Query with a section-
 * relative beat position to get the velocity multiplier at that point.
 */
export interface DynamicEnvelope {
  multiplierAt(timeInBeats: number): number
}

/** Parsed, time-resolved mark used internally by the envelope. */
interface ResolvedMark {
  timeInBeats: number
  multiplier: number
  type: 'sudden' | 'crescendo' | 'decrescendo'
  durationInBeats: number // 0 for sudden marks
}

/**
 * Parse a `"bar:beat:sixteenth"` time string into a total beat count.
 * The coordinate system matches the note time strings — section-relative,
 * zero-indexed.
 */
function timeToBeats(time: string, beatsPerBar: number): number {
  const parts = time.split(':').map(Number)
  const bar = parts[0] ?? 0
  const beat = parts[1] ?? 0
  const sixteenth = parts[2] ?? 0
  return bar * beatsPerBar + beat + sixteenth / 4
}

/**
 * Parse a duration string ("1n", "2n", "4n", etc.) into beats.
 * Supports basic note values and dotted variants.
 */
function durationToBeats(duration: string): number {
  // Handle compound durations: "2n+4n"
  if (duration.includes('+')) {
    return duration.split('+').reduce((sum, part) => sum + durationToBeats(part.trim()), 0)
  }
  // Dotted: "4n." = 1.5 × "4n"
  const dotted = duration.endsWith('.')
  const base = dotted ? duration.slice(0, -1) : duration
  // Map note value to beats (in quarter-note beats): 1n=4, 2n=2, 4n=1, 8n=0.5, ...
  const match = base.match(/^(\d+)n$/)
  if (!match) return 1 // fallback: treat unknown as quarter note
  const divisor = Number(match[1])
  const beats = 4 / divisor
  return dotted ? beats * 1.5 : beats
}

/**
 * Build a queryable dynamic envelope from a track's `DynamicMark[]`.
 *
 * - Marks are sorted by time and resolved to beat positions.
 * - `sudden` marks (or missing `type`) produce an instant step.
 * - `crescendo` / `decrescendo` marks linearly interpolate from the
 *   previous level to the mark's level over `duration` beats.
 * - Queries before the first mark return 1.0 (mf baseline).
 * - Queries after the last mark (or after the last gradient's end)
 *   hold the final established level.
 * - Tracks without dynamics (undefined or empty array) return a
 *   constant-1.0 envelope.
 */
export function buildDynamicEnvelope(
  marks: DynamicMark[] | undefined,
  beatsPerBar: number,
): DynamicEnvelope {
  if (!marks || marks.length === 0) {
    return { multiplierAt: () => 1.0 }
  }

  // Resolve and sort marks by time
  const resolved: ResolvedMark[] = marks
    .map((m) => ({
      timeInBeats: timeToBeats(m.time, beatsPerBar),
      multiplier: levelToMultiplier(m.level),
      type: m.type ?? ('sudden' as const),
      durationInBeats:
        m.type === 'crescendo' || m.type === 'decrescendo'
          ? durationToBeats(m.duration ?? '4n')
          : 0,
    }))
    .sort((a, b) => a.timeInBeats - b.timeInBeats)

  return {
    multiplierAt(timeInBeats: number): number {
      // Walk through marks to find the active level at this time.
      // Start at mf baseline (1.0) before any mark takes effect.
      let currentLevel = 1.0

      for (let i = 0; i < resolved.length; i++) {
        const mark = resolved[i]

        if (timeInBeats < mark.timeInBeats) {
          // We haven't reached this mark yet — return the current level
          return currentLevel
        }

        if (mark.type === 'sudden') {
          currentLevel = mark.multiplier
          continue
        }

        // Gradual transition (crescendo / decrescendo)
        const endTime = mark.timeInBeats + mark.durationInBeats
        if (timeInBeats >= endTime) {
          // Past the gradient — level is fully established
          currentLevel = mark.multiplier
          continue
        }

        // Inside the gradient — linearly interpolate
        const progress = (timeInBeats - mark.timeInBeats) / mark.durationInBeats
        return currentLevel + (mark.multiplier - currentLevel) * progress
      }

      // Past all marks — hold the final level
      return currentLevel
    },
  }
}
