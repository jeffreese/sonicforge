/**
 * Structured GM instrument registry.
 * Categories and sample names match the CDN at gleitz/midi-js-soundfonts.
 */

export interface GMInstrument {
  name: string
  sample: string
  category: GMCategory
}

export type GMCategory =
  | 'Piano/Keys'
  | 'Chromatic Percussion'
  | 'Organ'
  | 'Guitar'
  | 'Bass'
  | 'Strings'
  | 'Ensemble/Choir'
  | 'Brass'
  | 'Woodwinds'
  | 'Synth Lead'
  | 'Synth Pad'

export const GM_CATEGORIES: GMCategory[] = [
  'Piano/Keys',
  'Chromatic Percussion',
  'Organ',
  'Guitar',
  'Bass',
  'Strings',
  'Ensemble/Choir',
  'Brass',
  'Woodwinds',
  'Synth Lead',
  'Synth Pad',
]

function sampleToName(sample: string): string {
  return sample
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function instruments(category: GMCategory, samples: string[]): GMInstrument[] {
  return samples.map((sample) => ({ name: sampleToName(sample), sample, category }))
}

export const GM_INSTRUMENTS: GMInstrument[] = [
  ...instruments('Piano/Keys', [
    'acoustic_grand_piano',
    'bright_acoustic_piano',
    'electric_grand_piano',
    'honkytonk_piano',
    'electric_piano_1',
    'electric_piano_2',
    'harpsichord',
    'clavinet',
  ]),
  ...instruments('Chromatic Percussion', [
    'celesta',
    'glockenspiel',
    'music_box',
    'vibraphone',
    'marimba',
    'xylophone',
    'tubular_bells',
  ]),
  ...instruments('Organ', [
    'drawbar_organ',
    'percussive_organ',
    'rock_organ',
    'church_organ',
    'reed_organ',
    'accordion',
  ]),
  ...instruments('Guitar', [
    'acoustic_guitar_nylon',
    'acoustic_guitar_steel',
    'electric_guitar_jazz',
    'electric_guitar_clean',
    'electric_guitar_muted',
    'overdriven_guitar',
    'distortion_guitar',
  ]),
  ...instruments('Bass', [
    'acoustic_bass',
    'electric_bass_finger',
    'electric_bass_pick',
    'fretless_bass',
    'slap_bass_1',
    'slap_bass_2',
    'synth_bass_1',
    'synth_bass_2',
  ]),
  ...instruments('Strings', [
    'violin',
    'viola',
    'cello',
    'contrabass',
    'tremolo_strings',
    'pizzicato_strings',
    'orchestral_harp',
    'string_ensemble_1',
    'string_ensemble_2',
    'synth_strings_1',
    'synth_strings_2',
  ]),
  ...instruments('Ensemble/Choir', ['choir_aahs', 'voice_oohs']),
  ...instruments('Brass', [
    'trumpet',
    'trombone',
    'tuba',
    'muted_trumpet',
    'french_horn',
    'brass_section',
    'synth_brass_1',
    'synth_brass_2',
  ]),
  ...instruments('Woodwinds', [
    'soprano_sax',
    'alto_sax',
    'tenor_sax',
    'baritone_sax',
    'oboe',
    'english_horn',
    'bassoon',
    'clarinet',
    'piccolo',
    'flute',
    'recorder',
  ]),
  ...instruments('Synth Lead', ['lead_1_square', 'lead_2_sawtooth', 'lead_5_charang']),
  ...instruments('Synth Pad', [
    'pad_1_new_age',
    'pad_2_warm',
    'pad_3_polysynth',
    'pad_4_choir',
    'pad_7_halo',
  ]),
]

export const DRUM_HITS = [
  'kick',
  'snare',
  'hihat',
  'hihat-open',
  'ride',
  'crash',
  'tom-high',
  'tom-mid',
  'tom-low',
] as const

export type DrumHit = (typeof DRUM_HITS)[number]

/** Get all instruments in a given category. */
export function getByCategory(category: GMCategory): GMInstrument[] {
  return GM_INSTRUMENTS.filter((i) => i.category === category)
}

/** Find an instrument by sample name. */
export function getBySample(sample: string): GMInstrument | undefined {
  return GM_INSTRUMENTS.find((i) => i.sample === sample)
}
