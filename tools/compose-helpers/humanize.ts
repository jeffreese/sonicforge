/**
 * Humanization passes applied to existing note arrays.
 *
 * Unlike the grid-generating helpers, these functions take an array of notes
 * and return a transformed copy. They're intended to run after pattern
 * generation as a finishing step — tighten velocities, apply a curve shape,
 * add timing micro-jitter. Input arrays are not mutated.
 *
 * These are the primary counterweight to the mechanical output of the grid
 * generators. Use them before writing the final composition JSON.
 */

import type { Note } from '../../src/schema/composition'
import { beatTime, parseBeatTime } from './time'

// ─── Velocity curve ───

export type VelocityCurveStyle =
  | 'natural' // downbeats +10, offbeats -5, ghost notes preserved
  | 'crescendo' // linear ramp up from start to end velocity
  | 'decrescendo' // linear ramp down from start to end velocity
  | 'accented-downbeats' // beat 0 gets +15, beat 2 gets +8, others unchanged
  | 'subtle' // ±3 random jitter — non-mechanical but no musical shape

export interface VelocityCurveOptions {
  style: VelocityCurveStyle
  /** Start velocity for crescendo/decrescendo curves. Default 60. */
  startVelocity?: number
  /** End velocity for crescendo/decrescendo curves. Default 110. */
  endVelocity?: number
  /**
   * Optional random seed for deterministic testing. If omitted, uses Math.random
   * — which is fine for actual composition but breaks unit tests.
   */
  seed?: number
}

/**
 * Apply a velocity shape to an array of notes. Returns a new array — input is
 * not mutated.
 */
export function velocityCurve(notes: Note[], opts: VelocityCurveOptions): Note[] {
  if (notes.length === 0) return []

  const { style, startVelocity = 60, endVelocity = 110, seed } = opts
  const rng = seed !== undefined ? seededRandom(seed) : Math.random

  // For crescendo/decrescendo we need the range of start times
  let minTime = Number.POSITIVE_INFINITY
  let maxTime = Number.NEGATIVE_INFINITY
  if (style === 'crescendo' || style === 'decrescendo') {
    for (const n of notes) {
      const t = timeToBeats(n.time)
      if (t < minTime) minTime = t
      if (t > maxTime) maxTime = t
    }
  }
  const timeSpan = maxTime - minTime || 1

  return notes.map((note) => {
    if (note.articulation === 'ghost') {
      // Ghost notes are deliberately quiet; don't overwrite
      return { ...note }
    }
    const base = note.velocity ?? 80
    let next = base

    switch (style) {
      case 'natural': {
        const parsed = parseBeatTime(note.time)
        if (parsed.sixteenth !== 0) {
          // Any note on a sixteenth offbeat — soften
          next = base - 4
        } else if (parsed.beat === 0 || parsed.beat === 2) {
          // Downbeats (beats 1 and 3 in musician count) — emphasize
          next = base + 8
        }
        break
      }
      case 'crescendo': {
        const t = timeToBeats(note.time)
        const fraction = (t - minTime) / timeSpan
        next = Math.round(startVelocity + fraction * (endVelocity - startVelocity))
        break
      }
      case 'decrescendo': {
        const t = timeToBeats(note.time)
        const fraction = (t - minTime) / timeSpan
        next = Math.round(endVelocity - fraction * (endVelocity - startVelocity))
        break
      }
      case 'accented-downbeats': {
        const parsed = parseBeatTime(note.time)
        if (parsed.beat === 0 && parsed.sixteenth === 0) next = base + 15
        else if (parsed.beat === 2 && parsed.sixteenth === 0) next = base + 8
        break
      }
      case 'subtle': {
        next = base + Math.round((rng() - 0.5) * 6)
        break
      }
    }

    return { ...note, velocity: clampVelocity(next) }
  })
}

// ─── Timing jitter ───

export interface TimingJitterOptions {
  /**
   * Maximum jitter amount in sixteenths. Notes may shift ±amount sixteenths
   * from their original position. Default 0 (disabled).
   */
  amountSixteenths?: number
  /** Seed for deterministic testing. */
  seed?: number
}

/**
 * Apply micro-random timing offsets to notes. Useful for taking a mechanical
 * grid output and giving it a slightly human feel. Jitter is applied per-note
 * in sixteenth-note resolution.
 *
 * Notes shifted to negative time are clamped to the earliest valid time.
 * Notes are not reordered — the array order is preserved.
 */
export function timingJitter(notes: Note[], opts: TimingJitterOptions): Note[] {
  const { amountSixteenths = 0, seed } = opts
  if (amountSixteenths <= 0) return notes.map((n) => ({ ...n }))
  const rng = seed !== undefined ? seededRandom(seed) : Math.random

  return notes.map((note) => {
    const parsed = parseBeatTime(note.time)
    const totalSixteenths = parsed.bar * 16 + parsed.beat * 4 + parsed.sixteenth
    const offset = Math.round((rng() * 2 - 1) * amountSixteenths)
    const shifted = Math.max(0, totalSixteenths + offset)
    const newBar = Math.floor(shifted / 16)
    const rem = shifted % 16
    const newBeat = Math.floor(rem / 4)
    const newSixteenth = rem % 4
    return { ...note, time: beatTime(newBar, newBeat, newSixteenth) }
  })
}

// ─── Internals ───

function clampVelocity(v: number): number {
  if (v < 1) return 1
  if (v > 127) return 127
  return Math.round(v)
}

function timeToBeats(time: string): number {
  const parsed = parseBeatTime(time)
  return parsed.bar * 4 + parsed.beat + parsed.sixteenth * 0.25
}

/** Simple mulberry32 PRNG for deterministic test runs. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
