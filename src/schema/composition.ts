export interface SonicForgeComposition {
  version: '1.0'
  metadata: Metadata
  instruments: InstrumentDef[]
  sections: Section[]
  masterEffects?: EffectConfig[]
  automation?: AutomationLane[]
  sidechain?: SidechainConfig[]
  lfos?: LFOConfig[]
  modulation?: ModulationRoute[]
}

export interface Metadata {
  title: string
  bpm: number
  timeSignature: [number, number]
  key: string
  description?: string
}

export type InstrumentSourceKind = 'sampled' | 'synth' | 'oneshot' | 'drums'

export interface InstrumentDef {
  id: string
  name: string
  category: 'melodic' | 'bass' | 'pad' | 'drums' | 'fx'
  source?: InstrumentSourceKind
  sample?: string
  synth?: SynthPatch | string
  oneshots?: Record<string, string>
  defaultVolume?: number
  defaultPan?: number
  effects?: EffectConfig[]
}

export type SynthType = 'mono' | 'poly' | 'fm' | 'am' | 'duo' | 'pluck'

export interface SynthPatch {
  type: SynthType
  /**
   * Override the default polyphony for this synth type. When unset, each
   * type has a sensible default: `mono` → mono, `poly` → poly, `fm`/`am` → poly,
   * `duo`/`pluck` → mono (those synths don't wrap in PolySynth cleanly).
   * Setting `polyphony: true` on `mono`/`fm`/`am`/`poly` wraps in `Tone.PolySynth`;
   * `polyphony: false` uses a single voice. Ignored for `duo` and `pluck`.
   */
  polyphony?: boolean
  oscillator?: {
    type?: string
    detune?: number
    count?: number
    spread?: number
  }
  envelope?: {
    attack: number
    decay: number
    sustain: number
    release: number
  }
  filter?: {
    type?: 'lowpass' | 'highpass' | 'bandpass'
    frequency?: number
    Q?: number
    rolloff?: -12 | -24 | -48
  }
  filterEnvelope?: {
    attack: number
    decay: number
    sustain: number
    release: number
    baseFrequency: number
    octaves: number
  }
  modulationIndex?: number
  harmonicity?: number
}

export const EFFECT_TYPES = [
  'reverb',
  'delay',
  'pingpong',
  'chorus',
  'phaser',
  'distortion',
  'bitcrusher',
  'autofilter',
  'compressor',
  'limiter',
  'eq3',
  'stereowidener',
] as const

export type EffectType = (typeof EFFECT_TYPES)[number]

export interface EffectConfig {
  type: EffectType
  params: Record<string, number | string>
  bypass?: boolean
}

export interface AutomationPoint {
  time: string | number
  value: number
  curve?: 'step' | 'linear' | 'exponential'
}

export interface AutomationLane {
  target: string
  points: AutomationPoint[]
}

export interface LFOConfig {
  id: string
  frequency: number | string
  type?: 'sine' | 'square' | 'sawtooth' | 'triangle'
  min: number
  max: number
}

export interface ModulationRoute {
  source: string
  target: string
  amount?: number
}

export interface SidechainConfig {
  source: string
  target: string
  amount: number
  attack?: number
  release?: number
}

export interface Section {
  id: string
  name: string
  bars: number
  repeat?: number
  tracks: Track[]
}

export interface Track {
  instrumentId: string
  notes: Note[]
  dynamics?: DynamicMark[]
}

export interface Note {
  pitch: string
  time: string
  duration: string
  velocity?: number
  articulation?: 'legato' | 'staccato' | 'accent' | 'tenuto' | 'ghost'
}

export interface DynamicMark {
  time: string
  level: 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'fff'
  type?: 'sudden' | 'crescendo' | 'decrescendo'
  duration?: string
}
