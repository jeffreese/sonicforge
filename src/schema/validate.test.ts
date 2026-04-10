import { describe, expect, it } from 'vitest'
import { EFFECT_TYPES } from './composition'
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

describe('validate — instrument sources', () => {
  it('accepts a synth instrument with a preset name', () => {
    const comp = {
      ...validComposition,
      instruments: [
        {
          id: 'lead',
          name: 'Lead',
          category: 'melodic' as const,
          source: 'synth' as const,
          synth: 'supersaw_lead',
        },
      ],
      sections: [{ name: 'a', bars: 4, tracks: [{ instrumentId: 'lead', notes: [] }] }],
    }
    expect(() => validate(comp)).not.toThrow()
  })

  it('accepts a synth instrument with an inline patch', () => {
    const comp = {
      ...validComposition,
      instruments: [
        {
          id: 'bass',
          name: 'Bass',
          category: 'bass' as const,
          source: 'synth' as const,
          synth: {
            type: 'mono',
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.3 },
          },
        },
      ],
      sections: [{ name: 'a', bars: 4, tracks: [{ instrumentId: 'bass', notes: [] }] }],
    }
    expect(() => validate(comp)).not.toThrow()
  })

  it('rejects synth source without a synth field', () => {
    const comp = {
      ...validComposition,
      instruments: [
        { id: 'lead', name: 'Lead', category: 'melodic' as const, source: 'synth' as const },
      ],
      sections: [{ name: 'a', bars: 4, tracks: [{ instrumentId: 'lead', notes: [] }] }],
    }
    expect(() => validate(comp)).toThrow('synth is required')
  })

  it('accepts an oneshot instrument with oneshots map', () => {
    const comp = {
      ...validComposition,
      instruments: [
        {
          id: 'drums',
          name: 'Drums',
          category: 'drums' as const,
          source: 'oneshot' as const,
          oneshots: {
            kick: 'samples/oneshots/kicks/kick1.wav',
            snare: 'samples/oneshots/snares/snare1.wav',
          },
        },
      ],
      sections: [{ name: 'a', bars: 4, tracks: [{ instrumentId: 'drums', notes: [] }] }],
    }
    expect(() => validate(comp)).not.toThrow()
  })

  it('rejects oneshot source without oneshots field', () => {
    const comp = {
      ...validComposition,
      instruments: [
        { id: 'drums', name: 'Drums', category: 'drums' as const, source: 'oneshot' as const },
      ],
      sections: [{ name: 'a', bars: 4, tracks: [{ instrumentId: 'drums', notes: [] }] }],
    }
    expect(() => validate(comp)).toThrow('oneshots is required')
  })

  it('rejects unknown source kind', () => {
    const comp = {
      ...validComposition,
      instruments: [
        {
          id: 'mystery',
          name: 'Mystery',
          category: 'melodic' as const,
          source: 'wavetable',
          sample: 'whatever',
        },
      ],
      sections: [{ name: 'a', bars: 4, tracks: [{ instrumentId: 'mystery', notes: [] }] }],
    }
    expect(() => validate(comp)).toThrow('source must be one of')
  })
})

describe('validate — effects', () => {
  it('accepts all 12 supported effect types', () => {
    const comp = {
      ...validComposition,
      instruments: [
        {
          id: 'piano',
          name: 'Piano',
          sample: 'acoustic_grand_piano',
          category: 'melodic' as const,
          effects: EFFECT_TYPES.map((type) => ({ type, params: {} })),
        },
      ],
    }
    expect(() => validate(comp)).not.toThrow()
  })

  it('rejects unknown effect type', () => {
    const comp = {
      ...validComposition,
      instruments: [
        {
          id: 'piano',
          name: 'Piano',
          sample: 'acoustic_grand_piano',
          category: 'melodic' as const,
          effects: [{ type: 'warp_drive', params: {} }],
        },
      ],
    }
    expect(() => validate(comp)).toThrow('unknown effect type')
  })

  it('accepts masterEffects at the composition level', () => {
    const comp = {
      ...validComposition,
      masterEffects: [{ type: 'limiter', params: { threshold: -0.3 } }],
    }
    expect(() => validate(comp)).not.toThrow()
  })
})

describe('validate — automation', () => {
  it('accepts a valid automation lane', () => {
    const comp = {
      ...validComposition,
      automation: [
        {
          target: 'piano.volume',
          points: [
            { time: '0:0:0', value: 0, curve: 'linear' },
            { time: '4:0:0', value: 1, curve: 'exponential' },
          ],
        },
      ],
    }
    expect(() => validate(comp)).not.toThrow()
  })

  it('rejects unknown curve type', () => {
    const comp = {
      ...validComposition,
      automation: [
        {
          target: 'piano.volume',
          points: [{ time: 0, value: 0.5, curve: 'bouncy' }],
        },
      ],
    }
    expect(() => validate(comp)).toThrow('curve must be one of')
  })

  it('rejects automation lane with empty target', () => {
    const comp = {
      ...validComposition,
      automation: [{ target: '', points: [] }],
    }
    expect(() => validate(comp)).toThrow('target must be a non-empty string')
  })
})

describe('validate — LFO + modulation', () => {
  it('accepts LFOs with unique ids', () => {
    const comp = {
      ...validComposition,
      lfos: [
        { id: 'wobble', frequency: '4n', type: 'sine', min: 200, max: 2000 },
        { id: 'tremolo', frequency: 6, type: 'triangle', min: 0, max: 1 },
      ],
    }
    expect(() => validate(comp)).not.toThrow()
  })

  it('rejects duplicate LFO ids', () => {
    const comp = {
      ...validComposition,
      lfos: [
        { id: 'wobble', frequency: 4, min: 0, max: 1 },
        { id: 'wobble', frequency: 2, min: 0, max: 1 },
      ],
    }
    expect(() => validate(comp)).toThrow('duplicate LFO id')
  })

  it('rejects modulation route referencing unknown LFO', () => {
    const comp = {
      ...validComposition,
      lfos: [{ id: 'wobble', frequency: 4, min: 0, max: 1 }],
      modulation: [{ source: 'nonexistent', target: 'piano.filter.cutoff' }],
    }
    expect(() => validate(comp)).toThrow('does not match any LFO id')
  })
})

describe('validate — sidechain', () => {
  const twoInstruments = {
    ...validComposition,
    instruments: [
      { id: 'kick', name: 'Kick', sample: 'kick', category: 'drums' as const },
      { id: 'pad', name: 'Pad', sample: 'warm_pad', category: 'pad' as const },
    ],
    sections: [
      {
        name: 'a',
        bars: 4,
        tracks: [
          { instrumentId: 'kick', notes: [] },
          { instrumentId: 'pad', notes: [] },
        ],
      },
    ],
  }

  it('accepts a valid sidechain routing', () => {
    const comp = {
      ...twoInstruments,
      sidechain: [{ source: 'kick', target: 'pad', amount: 0.7 }],
    }
    expect(() => validate(comp)).not.toThrow()
  })

  it('rejects sidechain source referencing unknown instrument', () => {
    const comp = {
      ...twoInstruments,
      sidechain: [{ source: 'nope', target: 'pad', amount: 0.5 }],
    }
    expect(() => validate(comp)).toThrow('sidechain source')
  })

  it('rejects sidechain amount out of 0–1 range', () => {
    const comp = {
      ...twoInstruments,
      sidechain: [{ source: 'kick', target: 'pad', amount: 1.5 }],
    }
    expect(() => validate(comp)).toThrow('amount must be a number 0–1')
  })
})
