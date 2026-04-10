import type { Note } from '../schema/composition'

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Produces deterministic sequences from a 32-bit seed.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Configuration for humanization per track.
 */
export interface HumanizeConfig {
  /** 0–100 humanization amount. 0 = perfectly quantized, 100 = full humanization. */
  amount: number
}

/** Default humanization amount for new channels. */
export const DEFAULT_HUMANIZATION = 50

/** Maximum timing jitter at amount=100, in seconds. */
const MAX_TIMING_JITTER = 0.015 // ±15ms

/** Maximum velocity variation at amount=100, as a fraction of written velocity. */
const MAX_VELOCITY_VARIATION = 0.1 // ±10%

/**
 * Articulation-specific multipliers for timing and velocity variation.
 * Ghost notes get more velocity variance; accented notes get less timing variance.
 */
const ARTICULATION_MULTIPLIERS: Record<string, { timing: number; velocity: number }> = {
  ghost: { timing: 1.0, velocity: 1.5 },
  accent: { timing: 0.3, velocity: 0.5 },
  staccato: { timing: 0.8, velocity: 1.0 },
  legato: { timing: 0.6, velocity: 0.8 },
  tenuto: { timing: 0.5, velocity: 0.7 },
}

const DEFAULT_MULTIPLIER = { timing: 1.0, velocity: 1.0 }

/**
 * Create a seed from a note's position in the composition.
 * Deterministic: same note position always produces the same offsets.
 */
function noteSeed(noteIndex: number, trackHash: number, repIndex: number): number {
  return ((trackHash * 31 + noteIndex) * 17 + repIndex) | 0
}

/**
 * Simple string hash for track IDs.
 */
export function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash
}

export interface HumanizeOffsets {
  /** Timing offset in seconds (can be negative). */
  timingOffset: number
  /** Velocity multiplier (centered around 1.0). */
  velocityMultiplier: number
}

/**
 * Compute humanization offsets for a single note.
 *
 * @param noteIndex - Index of the note within the track
 * @param trackId - Instrument/track ID (used for seeding)
 * @param repIndex - Repeat index (0 for first play, increments for repeats)
 * @param config - Humanization config (amount 0–100)
 * @param articulation - Optional articulation type from the note
 * @returns Timing and velocity offsets to apply
 */
export function humanizeNote(
  noteIndex: number,
  trackId: string,
  repIndex: number,
  config: HumanizeConfig,
  articulation?: Note['articulation'],
): HumanizeOffsets {
  if (config.amount <= 0) {
    return { timingOffset: 0, velocityMultiplier: 1.0 }
  }

  const amount = Math.min(config.amount, 100) / 100
  const trackHash = hashString(trackId)
  const seed = noteSeed(noteIndex, trackHash, repIndex)
  const rand = mulberry32(seed)

  const artMult = (articulation && ARTICULATION_MULTIPLIERS[articulation]) || DEFAULT_MULTIPLIER

  // Timing: uniform distribution centered at 0
  const timingRaw = (rand() * 2 - 1) * MAX_TIMING_JITTER
  const timingOffset = timingRaw * amount * artMult.timing

  // Velocity: uniform distribution centered at 1.0
  const velocityRaw = (rand() * 2 - 1) * MAX_VELOCITY_VARIATION
  const velocityMultiplier = 1.0 + velocityRaw * amount * artMult.velocity

  return { timingOffset, velocityMultiplier }
}
