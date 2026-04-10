import * as Tone from 'tone'
import type { AutomationLane, AutomationPoint, Metadata } from '../schema/composition'
import { timeToSeconds } from '../util/timing'
import {
  type AutomationTargetRegistry,
  type TonePrimitiveParam,
  resolveTarget,
} from './automation-targets'

/**
 * A single automation lane with its target resolved and points pre-sorted
 * by time-in-seconds from the start of the composition.
 */
interface CompiledLane {
  target: TonePrimitiveParam
  targetPath: string
  points: CompiledPoint[]
}

interface CompiledPoint {
  /** Seconds from the start of the composition (bar 0 beat 0). */
  seconds: number
  value: number
  curve: 'step' | 'linear' | 'exponential'
}

/**
 * Schedules parameter automation over transport time.
 *
 * Design:
 *   1. On load(): resolve each lane's target path to a Tone.Param reference
 *      and pre-compute each point's absolute time in seconds. Invalid paths
 *      log a warning and are skipped (never throw — don't let one bad lane
 *      break playback).
 *   2. On scheduleFromCurrentPosition(): called by the Engine on play and
 *      after a seek. Cancels any previously-scheduled values, then for each
 *      lane:
 *        - anchors the param to the correct interpolated value for the
 *          current transport position (so values don't jump on seek)
 *        - schedules remaining points as absolute AudioContext times relative
 *          to `Tone.now()`, skipping any point in the past
 *   3. On stop(): cancels all scheduled values.
 *
 * Exponential ramps to non-positive values are clamped to 1e-5 — the Web
 * Audio API rejects `exponentialRampToValueAtTime(0, ...)` outright.
 *
 * The resolver supports track volume/pan, per-instrument effect params
 * (by id or type), and master effect params. Synth-internal filter and
 * envelope params ship in sub-epic #4 alongside the LFO modulation engine
 * that needs the same plumbing.
 */
export class AutomationEngine {
  private lanes: CompiledLane[] = []
  private metadata: Metadata | null = null

  /**
   * Resolve target paths and compile automation lanes against the current
   * composition. Call this once per load, after all instruments and effects
   * chains have been built but before playback starts.
   */
  compile(
    lanes: AutomationLane[] | undefined,
    metadata: Metadata,
    registry: AutomationTargetRegistry,
  ): void {
    this.metadata = metadata
    this.lanes = []

    if (!lanes || lanes.length === 0) return

    for (const lane of lanes) {
      const target = resolveTarget(lane.target, registry)
      if (!target) {
        console.warn(
          `AutomationEngine: could not resolve target path "${lane.target}"; skipping lane`,
        )
        continue
      }

      const compiledPoints = compilePoints(lane.points, metadata)
      if (compiledPoints.length === 0) continue

      this.lanes.push({ target, targetPath: lane.target, points: compiledPoints })
    }
  }

  /**
   * Cancel any previously scheduled automation and reschedule every lane
   * from the transport's current position. Called by the Engine on play()
   * and after a seek.
   */
  scheduleFromCurrentPosition(): void {
    const transport = Tone.getTransport()
    const transportSeconds = transport.seconds
    const now = Tone.now()

    for (const lane of this.lanes) {
      lane.target.cancelScheduledValues(now)

      // Anchor the param to its interpolated value at the current transport
      // position. Without this, the param would hold whatever value it had
      // before cancelScheduledValues ran, causing a jump when automation
      // resumes from a mid-lane seek.
      const anchorValue = interpolateAt(lane.points, transportSeconds)
      if (anchorValue !== null) {
        lane.target.setValueAtTime(anchorValue, now)
      }

      for (const point of lane.points) {
        if (point.seconds <= transportSeconds) continue
        const audioTime = now + (point.seconds - transportSeconds)
        applyPoint(lane.target, point, audioTime)
      }
    }
  }

  /**
   * Cancel all scheduled values. Called by the Engine on stop().
   */
  stop(): void {
    const now = Tone.now()
    for (const lane of this.lanes) {
      lane.target.cancelScheduledValues(now)
    }
  }

  /** Release internal references. Called by Engine.dispose(). */
  dispose(): void {
    this.stop()
    this.lanes = []
    this.metadata = null
  }

  /** Test/debug accessor for the compiled lane count. */
  get laneCount(): number {
    return this.lanes.length
  }
}

function compilePoints(points: AutomationPoint[] | undefined, metadata: Metadata): CompiledPoint[] {
  if (!points || points.length === 0) return []

  const compiled: CompiledPoint[] = []
  for (const point of points) {
    const seconds = pointTimeToSeconds(point.time, metadata)
    if (seconds === null) continue
    compiled.push({
      seconds,
      value: point.value,
      curve: point.curve ?? 'linear',
    })
  }

  // Sort by time so binary operations on the compiled list are safe.
  compiled.sort((a, b) => a.seconds - b.seconds)
  return compiled
}

function pointTimeToSeconds(time: string | number, metadata: Metadata): number | null {
  if (typeof time === 'number') {
    // Numeric time = absolute beats (per the schema doc comment).
    const beatDuration = 60 / metadata.bpm
    const baseBeatDuration = beatDuration * (4 / metadata.timeSignature[1])
    return time * baseBeatDuration
  }
  if (typeof time === 'string') {
    return timeToSeconds(time, metadata.bpm, metadata.timeSignature)
  }
  return null
}

function applyPoint(target: TonePrimitiveParam, point: CompiledPoint, audioTime: number): void {
  switch (point.curve) {
    case 'step':
      target.setValueAtTime(point.value, audioTime)
      break
    case 'exponential':
      // Exponential ramps are mathematically undefined for non-positive values
      // and the Web Audio API rejects them outright. For dB-ranged params (which
      // are always ≤ 0) and any other signed-range param, silently fall back to
      // linear so the automation still fires.
      //
      // Known limitation: if the STARTING value (last scheduled value on the
      // param) is ≤ 0 but this point's target is > 0, Tone.js will still reject
      // the exponentialRampToValueAtTime call. That edge case (transitioning
      // from a negative anchor to a positive target) is rare and deliberately
      // not addressed here — compositions that hit it should use linear curves.
      if (point.value > 0) {
        target.exponentialRampToValueAtTime(point.value, audioTime)
      } else {
        target.linearRampToValueAtTime(point.value, audioTime)
      }
      break
    default:
      target.linearRampToValueAtTime(point.value, audioTime)
  }
}

/**
 * Linearly interpolate the value of a lane at a given transport time in
 * seconds. Returns null for empty lanes, the first value for positions
 * before the first point, and the last value for positions after the last
 * point. Between points, interpolates based on each point's curve type.
 *
 * Exported for testing.
 */
export function interpolateAt(points: CompiledPoint[], seconds: number): number | null {
  if (points.length === 0) return null
  if (seconds <= points[0].seconds) return points[0].value
  if (seconds >= points[points.length - 1].seconds) {
    return points[points.length - 1].value
  }

  // Find the segment containing `seconds`.
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    if (seconds >= a.seconds && seconds <= b.seconds) {
      const t = (seconds - a.seconds) / (b.seconds - a.seconds)
      switch (b.curve) {
        case 'step':
          return a.value
        case 'exponential': {
          // Mirror the Web Audio API: exponential interpolation from a.value
          // to b.value over [a.seconds, b.seconds]. Exponential is undefined
          // for non-positive values, so fall back to linear when either
          // endpoint is ≤ 0 (same fallback policy as applyPoint).
          if (a.value > 0 && b.value > 0) {
            return a.value * (b.value / a.value) ** t
          }
          return a.value + (b.value - a.value) * t
        }
        default:
          return a.value + (b.value - a.value) * t
      }
    }
  }
  return points[points.length - 1].value
}
