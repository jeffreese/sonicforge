import { describe, expect, it } from 'vitest'
import { ValidationError, validate } from './validate'

const validComposition = {
  version: '1.0' as const,
  metadata: {
    title: 'Test',
    bpm: 120,
    timeSignature: [4, 4],
    key: 'C major',
  },
  instruments: [
    { id: 'piano', name: 'Piano', sample: 'acoustic_grand_piano', category: 'melodic' },
  ],
  sections: [
    {
      name: 'intro',
      bars: 4,
      tracks: [{ instrumentId: 'piano', notes: [] }],
    },
  ],
}

describe('validate', () => {
  it('accepts a valid composition', () => {
    const result = validate(validComposition)
    expect(result).toEqual(validComposition)
  })

  it('rejects non-object input', () => {
    expect(() => validate(null)).toThrow(ValidationError)
  })

  it('rejects missing metadata', () => {
    expect(() => validate({ ...validComposition, metadata: undefined })).toThrow('metadata')
  })

  it('rejects empty instruments', () => {
    expect(() => validate({ ...validComposition, instruments: [] })).toThrow('instruments')
  })

  it('rejects unknown instrumentId in tracks', () => {
    const bad = {
      ...validComposition,
      sections: [{ name: 'a', bars: 4, tracks: [{ instrumentId: 'nope', notes: [] }] }],
    }
    expect(() => validate(bad)).toThrow('unknown instrumentId')
  })
})
