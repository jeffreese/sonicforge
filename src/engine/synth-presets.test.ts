import { describe, expect, it } from 'vitest'
import type { SynthType } from '../schema/composition'
import { SYNTH_PRESETS, getPreset, listPresetNames } from './synth-presets'

describe('SYNTH_PRESETS', () => {
  const validTypes: SynthType[] = ['mono', 'poly', 'fm', 'am', 'duo', 'pluck']

  it('contains the expected starter roster', () => {
    const names = listPresetNames()
    expect(names).toContain('supersaw_lead')
    expect(names).toContain('reese_bass')
    expect(names).toContain('wobble_bass')
    expect(names).toContain('sub_bass')
    expect(names).toContain('acid_bass')
    expect(names).toContain('warm_pad')
    expect(names).toContain('fm_bell')
    expect(names).toContain('pluck_lead')
  })

  it('has at least 14 presets', () => {
    expect(listPresetNames().length).toBeGreaterThanOrEqual(14)
  })

  it('every preset has a valid synth type', () => {
    for (const [name, patch] of Object.entries(SYNTH_PRESETS)) {
      expect(validTypes, `${name} type ${patch.type}`).toContain(patch.type)
    }
  })

  it('every preset envelope (when present) has all four ADSR fields', () => {
    for (const [name, patch] of Object.entries(SYNTH_PRESETS)) {
      if (patch.envelope) {
        expect(patch.envelope.attack, `${name}.envelope.attack`).toBeTypeOf('number')
        expect(patch.envelope.decay, `${name}.envelope.decay`).toBeTypeOf('number')
        expect(patch.envelope.sustain, `${name}.envelope.sustain`).toBeTypeOf('number')
        expect(patch.envelope.release, `${name}.envelope.release`).toBeTypeOf('number')
      }
    }
  })
})

describe('getPreset', () => {
  it('resolves a known preset name', () => {
    const patch = getPreset('supersaw_lead')
    expect(patch).toBeDefined()
    expect(patch?.type).toBe('poly')
  })

  it('returns undefined for an unknown name', () => {
    expect(getPreset('nonexistent_preset')).toBeUndefined()
  })
})

describe('listPresetNames', () => {
  it('returns a sorted list', () => {
    const names = listPresetNames()
    const sorted = [...names].sort()
    expect(names).toEqual(sorted)
  })
})
