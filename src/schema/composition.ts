export interface SonicForgeComposition {
  version: "1.0";
  metadata: Metadata;
  instruments: InstrumentDef[];
  sections: Section[];
}

export interface Metadata {
  title: string;
  bpm: number;
  timeSignature: [number, number];
  key: string;
  description?: string;
}

export interface InstrumentDef {
  id: string;
  name: string;
  sample: string;
  category: "melodic" | "bass" | "pad" | "drums" | "fx";
  defaultVolume?: number;
  defaultPan?: number;
  effects?: EffectDef[];
}

export interface EffectDef {
  type: "reverb" | "delay" | "chorus" | "distortion" | "eq" | "compressor";
  params: Record<string, number>;
}

export interface Section {
  id: string;
  name: string;
  bars: number;
  repeat?: number;
  tracks: Track[];
}

export interface Track {
  instrumentId: string;
  notes: Note[];
  dynamics?: DynamicMark[];
}

export interface Note {
  pitch: string;
  time: string;
  duration: string;
  velocity?: number;
  articulation?: "legato" | "staccato" | "accent" | "tenuto" | "ghost";
}

export interface DynamicMark {
  time: string;
  level: "ppp" | "pp" | "p" | "mp" | "mf" | "f" | "ff" | "fff";
  type?: "sudden" | "crescendo" | "decrescendo";
  duration?: string;
}
