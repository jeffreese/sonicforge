/**
 * Drum grid primitives for common rhythmic patterns.
 *
 * These helpers produce Note[] arrays for drum tracks. Pitches use SonicForge's
 * named drum hits ("kick", "snare", "hat", "hat-open", "clap") rather than
 * scientific pitch notation — the engine's drum source routes named hits to
 * the appropriate sample or synth voice.
 *
 * Each helper takes a number of bars and returns a pattern that fills them.
 * Callers are expected to concat and hand-edit the result (add fills, tweak
 * velocities, drop hits for variation).
 */

import type { Note } from '../../src/schema/composition'

// ─── Shared options ───

type Velocity = number // 0-127

export interface DrumPatternBase {
  /** Number of bars to fill. Must be positive. */
  bars: number
  /** Starting bar offset. Defaults to 0. */
  startBar?: number
}

// ─── Four-on-the-floor ───

export interface FourOnFloorOptions extends DrumPatternBase {
  /**
   * Velocities for the four kick hits per bar (beats 1, 2, 3, 4).
   * Defaults to [118, 95, 112, 93] — a slight weight on the downbeat and beat 3.
   */
  kickVelocities?: [Velocity, Velocity, Velocity, Velocity]
  /**
   * Zero-indexed beat positions for clap/snare hits. Defaults to [1, 3]
   * (beats 2 and 4 in musician count).
   */
  backbeatBeats?: number[]
  /** Which hit to use on the backbeat. Defaults to 'clap'. */
  backbeatHit?: 'clap' | 'snare'
  /** Subdivision for closed hi-hats. Defaults to '8n' (offbeats only). */
  hatSubdivision?: '8n' | '16n'
  /**
   * Open hi-hat cadence in bars. `2` = open hat on beat 4& every other bar.
   * `null` disables open hats entirely. Default: 2.
   */
  openHatEvery?: number | null
}

/**
 * Four-on-the-floor: kick on every beat, backbeat on 2 and 4, hats on offbeats.
 * The foundation of house, bass house, trance, and most club-oriented dance music.
 */
export function fourOnFloor(opts: FourOnFloorOptions): Note[] {
  const {
    bars,
    startBar = 0,
    kickVelocities = [118, 95, 112, 93],
    backbeatBeats = [1, 3],
    backbeatHit = 'clap',
    hatSubdivision = '8n',
    openHatEvery = 2,
  } = opts
  if (bars <= 0) return []

  const notes: Note[] = []
  for (let i = 0; i < bars; i++) {
    const bar = startBar + i
    // Kicks on every beat
    for (let beat = 0; beat < 4; beat++) {
      notes.push({
        pitch: 'kick',
        time: `${bar}:${beat}:0`,
        duration: '8n',
        velocity: kickVelocities[beat],
      })
    }
    // Backbeat (clap or snare) on specified beats
    for (const beat of backbeatBeats) {
      notes.push({
        pitch: backbeatHit,
        time: `${bar}:${beat}:0`,
        duration: '8n',
        velocity: 100 + (beat === 1 ? 5 : 0),
      })
    }
    // Closed hats on offbeats (8n) or all 16th positions (16n)
    if (hatSubdivision === '8n') {
      for (let beat = 0; beat < 4; beat++) {
        notes.push({
          pitch: 'hat',
          time: `${bar}:${beat}:2`,
          duration: '16n',
          velocity: beat % 2 === 0 ? 75 : 65,
        })
      }
    } else {
      // 16n: every sixteenth
      for (let beat = 0; beat < 4; beat++) {
        for (let sub = 0; sub < 4; sub++) {
          notes.push({
            pitch: 'hat',
            time: `${bar}:${beat}:${sub}`,
            duration: '16n',
            velocity: sub === 0 ? 78 : 58,
          })
        }
      }
    }
    // Open hat on beat 4& every N bars
    if (openHatEvery !== null && (i + 1) % openHatEvery === 0) {
      notes.push({
        pitch: 'hat-open',
        time: `${bar}:3:2`,
        duration: '8n',
        velocity: 88,
      })
    }
  }
  return notes
}

// ─── Half-time ───

export interface HalfTimeOptions extends DrumPatternBase {
  /** Velocity for the downbeat kick. Default 120. */
  kickVelocity?: Velocity
  /** Velocity for the beat-3 snare. Default 110. */
  snareVelocity?: Velocity
  /** Hi-hat subdivision between hits. Default '8n'. */
  hatSubdivision?: '8n' | '16n'
}

/**
 * Half-time: kick on beat 1, snare on beat 3 (not 2 and 4). The signature
 * dubstep / future-bass / trap feel — the kit plays at half the perceived
 * tempo against whatever else is driving the track.
 */
export function halfTime(opts: HalfTimeOptions): Note[] {
  const {
    bars,
    startBar = 0,
    kickVelocity = 120,
    snareVelocity = 110,
    hatSubdivision = '8n',
  } = opts
  if (bars <= 0) return []

  const notes: Note[] = []
  for (let i = 0; i < bars; i++) {
    const bar = startBar + i
    notes.push({ pitch: 'kick', time: `${bar}:0:0`, duration: '8n', velocity: kickVelocity })
    notes.push({ pitch: 'snare', time: `${bar}:2:0`, duration: '8n', velocity: snareVelocity })
    if (hatSubdivision === '8n') {
      for (let beat = 0; beat < 4; beat++) {
        notes.push({
          pitch: 'hat',
          time: `${bar}:${beat}:2`,
          duration: '16n',
          velocity: 65 + (beat % 2 === 0 ? 10 : 0),
        })
      }
    } else {
      for (let beat = 0; beat < 4; beat++) {
        for (let sub = 0; sub < 4; sub++) {
          notes.push({
            pitch: 'hat',
            time: `${bar}:${beat}:${sub}`,
            duration: '16n',
            velocity: sub === 0 ? 75 : 55,
          })
        }
      }
    }
  }
  return notes
}

// ─── Breakbeat ───

export interface BreakbeatOptions extends DrumPatternBase {
  /** Add ghost notes between the main hits for drum-&-bass rolling feel. Default true. */
  includeGhosts?: boolean
}

/**
 * Amen-break-style syncopated breakbeat: kick on 1 and the "and of 3", snare on
 * 2 and 4, optional ghost-note snares between. The foundation of drum & bass,
 * jungle, and amen-sample-era hip-hop.
 */
export function breakbeat(opts: BreakbeatOptions): Note[] {
  const { bars, startBar = 0, includeGhosts = true } = opts
  if (bars <= 0) return []

  const notes: Note[] = []
  for (let i = 0; i < bars; i++) {
    const bar = startBar + i
    // Kick pattern: 1, and-of-3 (2:2)
    notes.push({ pitch: 'kick', time: `${bar}:0:0`, duration: '8n', velocity: 115 })
    notes.push({ pitch: 'kick', time: `${bar}:2:2`, duration: '8n', velocity: 105 })
    // Snare on 2 and 4
    notes.push({ pitch: 'snare', time: `${bar}:1:0`, duration: '8n', velocity: 112 })
    notes.push({ pitch: 'snare', time: `${bar}:3:0`, duration: '8n', velocity: 108 })
    // Ghost snares between main hits
    if (includeGhosts) {
      notes.push({
        pitch: 'snare',
        time: `${bar}:0:2`,
        duration: '16n',
        velocity: 35,
        articulation: 'ghost',
      })
      notes.push({
        pitch: 'snare',
        time: `${bar}:3:2`,
        duration: '16n',
        velocity: 38,
        articulation: 'ghost',
      })
    }
    // Hats on every 8th
    for (let beat = 0; beat < 4; beat++) {
      notes.push({ pitch: 'hat', time: `${bar}:${beat}:0`, duration: '16n', velocity: 70 })
      notes.push({ pitch: 'hat', time: `${bar}:${beat}:2`, duration: '16n', velocity: 58 })
    }
  }
  return notes
}

// ─── Trap ───

export interface TrapOptions extends DrumPatternBase {
  /** Add 16th-note hi-hat rolls. Default true. */
  hatRolls?: boolean
}

/**
 * Trap: kick on beat 1 and the "and of 2", snare on beat 3, dense 16th hi-hats
 * with velocity variation. The foundation of modern trap, future bass drops,
 * and half-time hip-hop.
 */
export function trap(opts: TrapOptions): Note[] {
  const { bars, startBar = 0, hatRolls = true } = opts
  if (bars <= 0) return []

  const notes: Note[] = []
  for (let i = 0; i < bars; i++) {
    const bar = startBar + i
    // Kick on 1 and and-of-2 (1:2)
    notes.push({ pitch: 'kick', time: `${bar}:0:0`, duration: '8n', velocity: 118 })
    notes.push({ pitch: 'kick', time: `${bar}:1:2`, duration: '8n', velocity: 100 })
    // Snare on 3 (half-time feel)
    notes.push({ pitch: 'snare', time: `${bar}:2:0`, duration: '8n', velocity: 112 })
    // Hi-hats: 16ths with velocity roll
    for (let beat = 0; beat < 4; beat++) {
      for (let sub = 0; sub < 4; sub++) {
        const isRollBeat = hatRolls && beat === 3 && sub >= 2
        notes.push({
          pitch: 'hat',
          time: `${bar}:${beat}:${sub}`,
          duration: '16n',
          velocity: isRollBeat ? 55 + sub * 8 : sub === 0 ? 78 : 55,
        })
      }
    }
  }
  return notes
}
