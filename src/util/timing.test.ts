import { describe, expect, it } from 'vitest'
import { durationToBeats, timeToBeats } from './timing'

describe('timeToBeats', () => {
  it('converts 0:0:0 to 0', () => {
    expect(timeToBeats('0:0:0', 4)).toBe(0)
  })

  it('converts bar:beat:sixteenth in 4/4', () => {
    expect(timeToBeats('1:0:0', 4)).toBe(4)
    expect(timeToBeats('0:2:0', 4)).toBe(2)
    expect(timeToBeats('0:0:2', 4)).toBe(0.5)
    expect(timeToBeats('2:1:0', 4)).toBe(9)
  })

  it('handles 3/4 time', () => {
    expect(timeToBeats('1:0:0', 3)).toBe(3)
    expect(timeToBeats('2:0:0', 3)).toBe(6)
    expect(timeToBeats('0:2:0', 3)).toBe(2)
  })

  it('applies barOffset', () => {
    expect(timeToBeats('0:0:0', 4, 4)).toBe(16)
    expect(timeToBeats('1:0:0', 4, 2)).toBe(12)
  })

  it('handles partial time strings', () => {
    expect(timeToBeats('1:2', 4)).toBe(6)
    expect(timeToBeats('3', 4)).toBe(12)
  })
})

describe('durationToBeats', () => {
  it('converts note durations', () => {
    expect(durationToBeats('1n', 4)).toBe(4)
    expect(durationToBeats('2n', 4)).toBe(2)
    expect(durationToBeats('4n', 4)).toBe(1)
    expect(durationToBeats('8n', 4)).toBe(0.5)
    expect(durationToBeats('16n', 4)).toBe(0.25)
    expect(durationToBeats('32n', 4)).toBe(0.125)
  })

  it('handles dotted durations', () => {
    expect(durationToBeats('4n.', 4)).toBe(1.5)
    expect(durationToBeats('2n.', 4)).toBe(3)
    expect(durationToBeats('8n.', 4)).toBe(0.75)
  })

  it('handles bar:beat:sixteenth duration format', () => {
    expect(durationToBeats('0:1:0', 4)).toBe(1)
    expect(durationToBeats('1:0:0', 4)).toBe(4)
    expect(durationToBeats('0:0:2', 4)).toBe(0.5)
  })

  it('falls back to quarter note for unknown durations', () => {
    expect(durationToBeats('unknown', 4)).toBe(1)
  })
})
