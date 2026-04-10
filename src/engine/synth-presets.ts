import type { SynthPatch } from '../schema/composition'

/**
 * Starter library of named synth patches covering common EDM roles.
 *
 * Compositions can reference these by name (`{ synth: 'supersaw_lead' }`) or
 * pass an inline SynthPatch object for full control. Sub-epic #6 will wire
 * these names into the /compose skill's vocabulary.
 *
 * Organized by role:
 *   - Bass: reese_bass, wobble_bass, sub_bass, acid_bass, fm_bass
 *   - Lead: supersaw_lead, detuned_lead, pluck_lead, fm_bell
 *   - Pad:  warm_pad, stab_pad, organ_pad
 *   - Pluck/arp: pluck_bass, arp_pluck
 */
export const SYNTH_PRESETS: Record<string, SynthPatch> = {
  // ───── Bass ─────

  /** Classic D&B/dubstep reese — detuned sawtooths through a resonant filter. */
  reese_bass: {
    type: 'mono',
    oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
    envelope: { attack: 0.02, decay: 0.3, sustain: 0.9, release: 0.4 },
    filter: { type: 'lowpass', frequency: 800, Q: 2, rolloff: -24 },
    filterEnvelope: {
      attack: 0.01,
      decay: 0.2,
      sustain: 0.5,
      release: 0.4,
      baseFrequency: 200,
      octaves: 2,
    },
  },

  /** Dubstep wobble base — LFO routed to filter cutoff ships in sub-epic #4. */
  wobble_bass: {
    type: 'mono',
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 1, release: 0.1 },
    filter: { type: 'lowpass', frequency: 400, Q: 8, rolloff: -24 },
    filterEnvelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 1,
      release: 0.1,
      baseFrequency: 100,
      octaves: 3,
    },
  },

  /** Clean sub sine — for hip-hop, trap, and deep house. */
  sub_bass: {
    type: 'mono',
    oscillator: { type: 'sine' },
    envelope: { attack: 0.005, decay: 0.1, sustain: 1, release: 0.2 },
  },

  /** TB-303-style acid bass — square wave, squelchy resonant filter envelope. */
  acid_bass: {
    type: 'mono',
    oscillator: { type: 'square' },
    envelope: { attack: 0.005, decay: 0.15, sustain: 0.3, release: 0.15 },
    filter: { type: 'lowpass', frequency: 600, Q: 10, rolloff: -24 },
    filterEnvelope: {
      attack: 0.005,
      decay: 0.2,
      sustain: 0.2,
      release: 0.2,
      baseFrequency: 150,
      octaves: 4,
    },
  },

  /** FM bass — harsh, metallic. Works well for neurofunk or industrial. */
  fm_bass: {
    type: 'fm',
    polyphony: false,
    modulationIndex: 5,
    harmonicity: 0.5,
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.3 },
  },

  // ───── Lead ─────

  /** Fat 7-voice detuned supersaw — the defining EDM lead sound. */
  supersaw_lead: {
    type: 'poly',
    oscillator: { type: 'fatsawtooth', count: 7, spread: 40 },
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.8, release: 0.5 },
    filter: { type: 'lowpass', frequency: 4000, Q: 1 },
  },

  /** Simpler detuned lead — 3 voices, lighter than supersaw. */
  detuned_lead: {
    type: 'poly',
    oscillator: { type: 'fatsawtooth', count: 3, spread: 20 },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3 },
  },

  /** Plucky synth lead — staccato, melodic, good for tropical / future bass. */
  pluck_lead: {
    type: 'pluck',
  },

  /** FM bell — glassy metallic tone, classic Yamaha DX7 territory. */
  fm_bell: {
    type: 'fm',
    modulationIndex: 10,
    harmonicity: 3.01,
    envelope: { attack: 0.001, decay: 1.5, sustain: 0.1, release: 2 },
  },

  // ───── Pad ─────

  /** Warm sustained pad — slow attack, long release. */
  warm_pad: {
    type: 'poly',
    oscillator: { type: 'sine' },
    envelope: { attack: 1.5, decay: 0.5, sustain: 0.8, release: 2.5 },
    filter: { type: 'lowpass', frequency: 2000, Q: 0.5 },
  },

  /** Short pad stab — rhythmic hit rather than sustained wash. */
  stab_pad: {
    type: 'poly',
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.2 },
    filter: { type: 'lowpass', frequency: 1500, Q: 2 },
  },

  /** Organ-style pad — additive square with slow release. */
  organ_pad: {
    type: 'poly',
    oscillator: { type: 'square' },
    envelope: { attack: 0.1, decay: 0.3, sustain: 0.9, release: 1.5 },
    filter: { type: 'lowpass', frequency: 3000, Q: 0.7 },
  },

  // ───── Pluck / Arp ─────

  /** Short plucky bass — Karplus-Strong. */
  pluck_bass: {
    type: 'pluck',
  },

  /** Arpeggiator-friendly pluck — short poly synth for arp patterns. */
  arp_pluck: {
    type: 'poly',
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.005, decay: 0.15, sustain: 0.1, release: 0.1 },
    filter: { type: 'lowpass', frequency: 3000, Q: 1 },
  },
}

/**
 * Resolve a preset name to its SynthPatch. Returns `undefined` if the name
 * doesn't match any bundled preset.
 */
export function getPreset(name: string): SynthPatch | undefined {
  return SYNTH_PRESETS[name]
}

/** Get a sorted list of all bundled preset names — useful for error messages. */
export function listPresetNames(): string[] {
  return Object.keys(SYNTH_PRESETS).sort()
}
