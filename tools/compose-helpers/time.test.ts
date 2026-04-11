import { describe, expect, it } from 'vitest'
import { beatTime, beatsToTime, offsetBars, parseBeatTime } from './time'

describe('beatTime', () => {
  it('builds a full time string with all components', () => {
    expect(beatTime(2, 1, 3)).toBe('2:1:3')
  })

  it('defaults beat and sixteenth to 0', () => {
    expect(beatTime(5)).toBe('5:0:0')
    expect(beatTime(5, 2)).toBe('5:2:0')
  })

  it('accepts bar 0 beat 0 sixteenth 0 as the start of the composition', () => {
    expect(beatTime(0)).toBe('0:0:0')
  })

  it('rejects negative components', () => {
    expect(() => beatTime(-1)).toThrow()
    expect(() => beatTime(0, -1)).toThrow()
    expect(() => beatTime(0, 0, -1)).toThrow()
  })

  it('rejects out-of-range beat or sixteenth', () => {
    expect(() => beatTime(0, 4)).toThrow()
    expect(() => beatTime(0, 0, 4)).toThrow()
  })
})

describe('parseBeatTime', () => {
  it('parses a well-formed time string', () => {
    expect(parseBeatTime('3:2:1')).toEqual({ bar: 3, beat: 2, sixteenth: 1 })
  })

  it('rejects malformed input', () => {
    expect(() => parseBeatTime('3:2')).toThrow()
    expect(() => parseBeatTime('a:b:c')).toThrow()
    expect(() => parseBeatTime('-1:0:0')).toThrow()
  })
})

describe('offsetBars', () => {
  it('shifts bars forward without touching beat/sixteenth', () => {
    expect(offsetBars('2:1:3', 5)).toBe('7:1:3')
  })

  it('shifts bars backward', () => {
    expect(offsetBars('5:0:0', -2)).toBe('3:0:0')
  })

  it('rejects shifts that produce a negative bar', () => {
    expect(() => offsetBars('1:0:0', -2)).toThrow()
  })
})

describe('beatsToTime', () => {
  it('converts whole beats within the first bar', () => {
    expect(beatsToTime(0)).toBe('0:0:0')
    expect(beatsToTime(1)).toBe('0:1:0')
    expect(beatsToTime(3)).toBe('0:3:0')
  })

  it('wraps to the next bar after 4 beats', () => {
    expect(beatsToTime(4)).toBe('1:0:0')
    expect(beatsToTime(7)).toBe('1:3:0')
    expect(beatsToTime(8)).toBe('2:0:0')
  })

  it('converts fractional beats to sixteenths', () => {
    expect(beatsToTime(0.5)).toBe('0:0:2') // halfway = 2/4 sixteenths
    expect(beatsToTime(5.25)).toBe('1:1:1') // bar 1 beat 1 + 1/4 = sixteenth 1
  })

  it('rejects negative input', () => {
    expect(() => beatsToTime(-1)).toThrow()
  })
})
