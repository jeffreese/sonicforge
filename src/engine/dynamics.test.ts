import { describe, expect, it } from 'vitest'
import type { DynamicMark } from '../schema/composition'
import { buildDynamicEnvelope, levelToMultiplier } from './dynamics'

// ─── levelToMultiplier ────────────────────────────────────────────────────

describe('levelToMultiplier', () => {
  it('maps mf to exactly 1.0 (the baseline)', () => {
    expect(levelToMultiplier('mf')).toBe(1.0)
  })

  it('maps all 8 levels to the expected MIDI-standard-derived multipliers', () => {
    // MIDI Standard Level 2 velocities ÷ 80 (mf baseline)
    expect(levelToMultiplier('ppp')).toBeCloseTo(0.2, 2)
    expect(levelToMultiplier('pp')).toBeCloseTo(0.4125, 2)
    expect(levelToMultiplier('p')).toBeCloseTo(0.6125, 2)
    expect(levelToMultiplier('mp')).toBeCloseTo(0.8, 2)
    expect(levelToMultiplier('mf')).toBeCloseTo(1.0, 2)
    expect(levelToMultiplier('f')).toBeCloseTo(1.2, 2)
    expect(levelToMultiplier('ff')).toBeCloseTo(1.4, 2)
    expect(levelToMultiplier('fff')).toBeCloseTo(1.5875, 2)
  })

  it('produces monotonically increasing values from ppp to fff', () => {
    const levels: DynamicMark['level'][] = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff']
    for (let i = 1; i < levels.length; i++) {
      expect(levelToMultiplier(levels[i])).toBeGreaterThan(levelToMultiplier(levels[i - 1]))
    }
  })
})

// ─── buildDynamicEnvelope — no marks ──────────────────────────────────────

describe('buildDynamicEnvelope — no marks', () => {
  it('returns constant 1.0 when marks is undefined', () => {
    const env = buildDynamicEnvelope(undefined, 4)
    expect(env.multiplierAt(0)).toBe(1.0)
    expect(env.multiplierAt(100)).toBe(1.0)
  })

  it('returns constant 1.0 when marks is an empty array', () => {
    const env = buildDynamicEnvelope([], 4)
    expect(env.multiplierAt(0)).toBe(1.0)
    expect(env.multiplierAt(100)).toBe(1.0)
  })
})

// ─── buildDynamicEnvelope — sudden marks ──────────────────────────────────

describe('buildDynamicEnvelope — sudden marks', () => {
  it('applies a single sudden mark at time 0:0:0', () => {
    const marks: DynamicMark[] = [{ time: '0:0:0', level: 'pp', type: 'sudden' }]
    const env = buildDynamicEnvelope(marks, 4)
    expect(env.multiplierAt(0)).toBeCloseTo(levelToMultiplier('pp'), 4)
    expect(env.multiplierAt(10)).toBeCloseTo(levelToMultiplier('pp'), 4)
  })

  it('returns mf baseline (1.0) before the first mark takes effect', () => {
    const marks: DynamicMark[] = [{ time: '2:0:0', level: 'ff', type: 'sudden' }]
    const env = buildDynamicEnvelope(marks, 4) // beat 8
    expect(env.multiplierAt(0)).toBe(1.0)
    expect(env.multiplierAt(7.9)).toBe(1.0)
    expect(env.multiplierAt(8)).toBeCloseTo(levelToMultiplier('ff'), 4)
  })

  it('steps between two sudden marks', () => {
    const marks: DynamicMark[] = [
      { time: '0:0:0', level: 'pp', type: 'sudden' },
      { time: '4:0:0', level: 'ff', type: 'sudden' },
    ]
    const env = buildDynamicEnvelope(marks, 4) // second mark at beat 16
    expect(env.multiplierAt(0)).toBeCloseTo(levelToMultiplier('pp'), 4)
    expect(env.multiplierAt(15.9)).toBeCloseTo(levelToMultiplier('pp'), 4)
    expect(env.multiplierAt(16)).toBeCloseTo(levelToMultiplier('ff'), 4)
    expect(env.multiplierAt(100)).toBeCloseTo(levelToMultiplier('ff'), 4)
  })

  it('defaults to sudden when type is omitted', () => {
    const marks: DynamicMark[] = [{ time: '0:0:0', level: 'p' }]
    const env = buildDynamicEnvelope(marks, 4)
    // Should snap instantly, not interpolate
    expect(env.multiplierAt(0)).toBeCloseTo(levelToMultiplier('p'), 4)
    expect(env.multiplierAt(0.001)).toBeCloseTo(levelToMultiplier('p'), 4)
  })
})

// ─── buildDynamicEnvelope — gradual transitions ───────────────────────────

describe('buildDynamicEnvelope — gradual transitions', () => {
  it('linearly ramps a crescendo from the previous level to the target', () => {
    const marks: DynamicMark[] = [
      { time: '0:0:0', level: 'pp', type: 'sudden' },
      { time: '2:0:0', level: 'ff', type: 'crescendo', duration: '1n' }, // 4 beats
    ]
    const env = buildDynamicEnvelope(marks, 4)
    const ppMult = levelToMultiplier('pp')
    const ffMult = levelToMultiplier('ff')

    // Before crescendo starts (beat 0-7): steady at pp
    expect(env.multiplierAt(0)).toBeCloseTo(ppMult, 4)
    expect(env.multiplierAt(7.9)).toBeCloseTo(ppMult, 4)

    // At crescendo start (beat 8): still at pp
    expect(env.multiplierAt(8)).toBeCloseTo(ppMult, 4)

    // Midpoint of crescendo (beat 10 = 50% through 4-beat duration)
    const midpoint = ppMult + (ffMult - ppMult) * 0.5
    expect(env.multiplierAt(10)).toBeCloseTo(midpoint, 4)

    // End of crescendo (beat 12 = 8 + 4)
    expect(env.multiplierAt(12)).toBeCloseTo(ffMult, 4)

    // After crescendo: holds at ff
    expect(env.multiplierAt(20)).toBeCloseTo(ffMult, 4)
  })

  it('handles a decrescendo from an established level', () => {
    // Matches the twinkle-minor-melancholy pattern: pp sudden, then ppp decrescendo
    const marks: DynamicMark[] = [
      { time: '0:0:0', level: 'pp', type: 'sudden' },
      { time: '2:0:0', level: 'ppp', type: 'decrescendo', duration: '2n' }, // 2 beats
    ]
    const env = buildDynamicEnvelope(marks, 4)
    const ppMult = levelToMultiplier('pp')
    const pppMult = levelToMultiplier('ppp')

    // Before decrescendo: pp
    expect(env.multiplierAt(7)).toBeCloseTo(ppMult, 4)

    // Start of decrescendo: still pp
    expect(env.multiplierAt(8)).toBeCloseTo(ppMult, 4)

    // Midpoint: half way between pp and ppp
    const mid = ppMult + (pppMult - ppMult) * 0.5
    expect(env.multiplierAt(9)).toBeCloseTo(mid, 4)

    // End: ppp
    expect(env.multiplierAt(10)).toBeCloseTo(pppMult, 4)

    // After: holds ppp
    expect(env.multiplierAt(20)).toBeCloseTo(pppMult, 4)
  })

  it('defaults gradient duration to 4n (1 beat) when duration is omitted', () => {
    const marks: DynamicMark[] = [
      { time: '0:0:0', level: 'pp', type: 'sudden' },
      { time: '1:0:0', level: 'f', type: 'crescendo' }, // no duration → 1 beat
    ]
    const env = buildDynamicEnvelope(marks, 4) // second mark at beat 4
    const ppMult = levelToMultiplier('pp')
    const fMult = levelToMultiplier('f')

    // At beat 4 (start): pp
    expect(env.multiplierAt(4)).toBeCloseTo(ppMult, 4)
    // At beat 4.5 (midpoint of 1-beat duration): halfway
    expect(env.multiplierAt(4.5)).toBeCloseTo(ppMult + (fMult - ppMult) * 0.5, 4)
    // At beat 5 (end): f
    expect(env.multiplierAt(5)).toBeCloseTo(fMult, 4)
  })

  it('handles dotted duration in a gradient', () => {
    const marks: DynamicMark[] = [
      { time: '0:0:0', level: 'p', type: 'sudden' },
      { time: '0:0:0', level: 'f', type: 'crescendo', duration: '2n.' }, // 3 beats
    ]
    const env = buildDynamicEnvelope(marks, 4)
    const pMult = levelToMultiplier('p')
    const fMult = levelToMultiplier('f')

    // 1/3 of the way through (beat 1 of 3)
    expect(env.multiplierAt(1)).toBeCloseTo(pMult + (fMult - pMult) * (1 / 3), 3)
    // 2/3 of the way
    expect(env.multiplierAt(2)).toBeCloseTo(pMult + (fMult - pMult) * (2 / 3), 3)
    // End (beat 3)
    expect(env.multiplierAt(3)).toBeCloseTo(fMult, 4)
  })

  it('handles a crescendo from the mf baseline (no preceding mark)', () => {
    // No sudden mark before — baseline is 1.0 (mf)
    const marks: DynamicMark[] = [
      { time: '0:0:0', level: 'ff', type: 'crescendo', duration: '1n' }, // 4 beats
    ]
    const env = buildDynamicEnvelope(marks, 4)

    // Start: baseline (mf = 1.0)
    expect(env.multiplierAt(0)).toBeCloseTo(1.0, 4)
    // Midpoint
    const mid = 1.0 + (levelToMultiplier('ff') - 1.0) * 0.5
    expect(env.multiplierAt(2)).toBeCloseTo(mid, 4)
    // End
    expect(env.multiplierAt(4)).toBeCloseTo(levelToMultiplier('ff'), 4)
  })
})

// ─── buildDynamicEnvelope — edge cases ────────────────────────────────────

describe('buildDynamicEnvelope — edge cases', () => {
  it('handles multiple marks at the same time — last one wins', () => {
    const marks: DynamicMark[] = [
      { time: '0:0:0', level: 'pp', type: 'sudden' },
      { time: '0:0:0', level: 'ff', type: 'sudden' },
    ]
    const env = buildDynamicEnvelope(marks, 4)
    expect(env.multiplierAt(0)).toBeCloseTo(levelToMultiplier('ff'), 4)
  })

  it('handles non-4/4 time signatures (beatsPerBar=3 for 3/4)', () => {
    const marks: DynamicMark[] = [
      { time: '0:0:0', level: 'pp', type: 'sudden' },
      { time: '2:0:0', level: 'ff', type: 'sudden' }, // beat 6 in 3/4
    ]
    const env = buildDynamicEnvelope(marks, 3)
    expect(env.multiplierAt(5.9)).toBeCloseTo(levelToMultiplier('pp'), 4)
    expect(env.multiplierAt(6)).toBeCloseTo(levelToMultiplier('ff'), 4)
  })

  it('uses sixteenths in mark time correctly', () => {
    const marks: DynamicMark[] = [
      { time: '0:0:0', level: 'pp', type: 'sudden' },
      { time: '1:2:2', level: 'ff', type: 'sudden' }, // bar 1, beat 2, sixteenth 2
    ]
    const env = buildDynamicEnvelope(marks, 4) // 1*4 + 2 + 2/4 = 6.5
    expect(env.multiplierAt(6.4)).toBeCloseTo(levelToMultiplier('pp'), 4)
    expect(env.multiplierAt(6.5)).toBeCloseTo(levelToMultiplier('ff'), 4)
  })

  it('sorts unsorted marks correctly', () => {
    const marks: DynamicMark[] = [
      { time: '2:0:0', level: 'ff', type: 'sudden' },
      { time: '0:0:0', level: 'pp', type: 'sudden' }, // earlier but listed second
    ]
    const env = buildDynamicEnvelope(marks, 4)
    expect(env.multiplierAt(0)).toBeCloseTo(levelToMultiplier('pp'), 4)
    expect(env.multiplierAt(8)).toBeCloseTo(levelToMultiplier('ff'), 4)
  })

  it('handles compound duration strings', () => {
    const marks: DynamicMark[] = [
      { time: '0:0:0', level: 'p', type: 'sudden' },
      { time: '0:0:0', level: 'f', type: 'crescendo', duration: '2n+4n' }, // 3 beats
    ]
    const env = buildDynamicEnvelope(marks, 4)
    expect(env.multiplierAt(1.5)).toBeCloseTo(
      levelToMultiplier('p') + (levelToMultiplier('f') - levelToMultiplier('p')) * 0.5,
      3,
    )
    expect(env.multiplierAt(3)).toBeCloseTo(levelToMultiplier('f'), 4)
  })
})
