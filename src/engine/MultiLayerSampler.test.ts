import { describe, expect, it } from 'vitest'
import { selectVelocityLayer } from './MultiLayerSampler'

describe('selectVelocityLayer', () => {
  const layers = [30, 60, 90, 120]

  it('selects exact match', () => {
    expect(selectVelocityLayer(30 / 127, layers)).toBe(30)
    expect(selectVelocityLayer(60 / 127, layers)).toBe(60)
    expect(selectVelocityLayer(90 / 127, layers)).toBe(90)
    expect(selectVelocityLayer(120 / 127, layers)).toBe(120)
  })

  it('selects nearest layer for in-between values', () => {
    // 45/127 ≈ 0.354 → MIDI 45, equidistant between 30 and 60, picks 30 (first found)
    expect(selectVelocityLayer(45 / 127, layers)).toBe(30)
    // 46/127 → MIDI 46, closer to 60
    expect(selectVelocityLayer(46 / 127, layers)).toBe(60)
    // 75/127 → MIDI 75, equidistant, picks 60
    expect(selectVelocityLayer(75 / 127, layers)).toBe(60)
    // 76/127 → closer to 90
    expect(selectVelocityLayer(76 / 127, layers)).toBe(90)
  })

  it('selects pp layer for very low velocity', () => {
    expect(selectVelocityLayer(0, layers)).toBe(30)
    expect(selectVelocityLayer(10 / 127, layers)).toBe(30)
  })

  it('selects ff layer for very high velocity', () => {
    expect(selectVelocityLayer(1, layers)).toBe(120)
    expect(selectVelocityLayer(127 / 127, layers)).toBe(120)
  })

  it('works with a single layer', () => {
    expect(selectVelocityLayer(0.5, [0])).toBe(0)
    expect(selectVelocityLayer(1, [0])).toBe(0)
  })
})
