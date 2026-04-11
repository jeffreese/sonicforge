import { describe, expect, it } from 'vitest'
import type { Note } from '../../src/schema/composition'
import { timingJitter, velocityCurve } from './humanize'

function mkNote(time: string, velocity = 80): Note {
  return { pitch: 'C4', time, duration: '8n', velocity }
}

describe('velocityCurve', () => {
  it('returns empty array for empty input', () => {
    expect(velocityCurve([], { style: 'natural' })).toEqual([])
  })

  it('does not mutate the input array', () => {
    const input = [mkNote('0:0:0', 80), mkNote('0:1:0', 80)]
    const output = velocityCurve(input, { style: 'natural' })
    expect(input[0].velocity).toBe(80) // unchanged
    expect(output).not.toBe(input)
    expect(output[0]).not.toBe(input[0])
  })

  it('natural curve adds emphasis to beats 0 and 2', () => {
    const notes = [mkNote('0:0:0', 80), mkNote('0:1:0', 80), mkNote('0:2:0', 80)]
    const out = velocityCurve(notes, { style: 'natural' })
    expect(out[0].velocity).toBe(88) // beat 0 +8
    expect(out[1].velocity).toBe(80) // beat 1 unchanged
    expect(out[2].velocity).toBe(88) // beat 2 +8
  })

  it('natural curve softens offbeat notes', () => {
    const notes = [mkNote('0:0:2', 80)]
    const out = velocityCurve(notes, { style: 'natural' })
    expect(out[0].velocity).toBe(76) // offbeat -4
  })

  it('preserves ghost note velocities', () => {
    const ghost: Note = {
      pitch: 'snare',
      time: '0:0:0',
      duration: '16n',
      velocity: 35,
      articulation: 'ghost',
    }
    const out = velocityCurve([ghost], { style: 'accented-downbeats' })
    expect(out[0].velocity).toBe(35) // unchanged despite being on beat 0
  })

  it('crescendo ramps from start to end velocity across time span', () => {
    const notes = [mkNote('0:0:0'), mkNote('1:0:0'), mkNote('2:0:0')]
    const out = velocityCurve(notes, { style: 'crescendo', startVelocity: 50, endVelocity: 100 })
    expect(out[0].velocity).toBe(50)
    expect(out[2].velocity).toBe(100)
    // Middle note should be roughly halfway
    expect(out[1].velocity).toBeGreaterThan(70)
    expect(out[1].velocity).toBeLessThan(80)
  })

  it('decrescendo ramps from end to start across time span', () => {
    const notes = [mkNote('0:0:0'), mkNote('2:0:0')]
    const out = velocityCurve(notes, { style: 'decrescendo', startVelocity: 50, endVelocity: 100 })
    expect(out[0].velocity).toBe(100)
    expect(out[1].velocity).toBe(50)
  })

  it('accented-downbeats boosts only beats 0 and 2', () => {
    const notes = [
      mkNote('0:0:0', 80),
      mkNote('0:1:0', 80),
      mkNote('0:2:0', 80),
      mkNote('0:3:0', 80),
    ]
    const out = velocityCurve(notes, { style: 'accented-downbeats' })
    expect(out[0].velocity).toBe(95) // +15
    expect(out[1].velocity).toBe(80)
    expect(out[2].velocity).toBe(88) // +8
    expect(out[3].velocity).toBe(80)
  })

  it('subtle curve with fixed seed produces deterministic output', () => {
    const notes = [mkNote('0:0:0', 80), mkNote('0:1:0', 80), mkNote('0:2:0', 80)]
    const a = velocityCurve(notes, { style: 'subtle', seed: 42 })
    const b = velocityCurve(notes, { style: 'subtle', seed: 42 })
    expect(a.map((n) => n.velocity)).toEqual(b.map((n) => n.velocity))
  })

  it('clamps velocities to the 1-127 range', () => {
    const notes = [mkNote('0:0:0', 125)]
    const out = velocityCurve(notes, { style: 'accented-downbeats' })
    expect(out[0].velocity).toBeLessThanOrEqual(127)
  })
})

describe('timingJitter', () => {
  it('returns notes unchanged when amountSixteenths is 0', () => {
    const notes = [mkNote('0:0:0'), mkNote('1:2:0')]
    const out = timingJitter(notes, { amountSixteenths: 0 })
    expect(out.map((n) => n.time)).toEqual(['0:0:0', '1:2:0'])
  })

  it('does not mutate the input array', () => {
    const input = [mkNote('2:1:0')]
    timingJitter(input, { amountSixteenths: 1, seed: 1 })
    expect(input[0].time).toBe('2:1:0')
  })

  it('produces deterministic output with a fixed seed', () => {
    const notes = [mkNote('1:0:0'), mkNote('1:1:0'), mkNote('1:2:0')]
    const a = timingJitter(notes, { amountSixteenths: 2, seed: 7 })
    const b = timingJitter(notes, { amountSixteenths: 2, seed: 7 })
    expect(a.map((n) => n.time)).toEqual(b.map((n) => n.time))
  })

  it('clamps notes to non-negative time', () => {
    const notes = [mkNote('0:0:0')]
    const out = timingJitter(notes, { amountSixteenths: 4, seed: 1 })
    const parsed = out[0].time.split(':').map(Number)
    expect(parsed[0]).toBeGreaterThanOrEqual(0)
    expect(parsed[1]).toBeGreaterThanOrEqual(0)
    expect(parsed[2]).toBeGreaterThanOrEqual(0)
  })
})
