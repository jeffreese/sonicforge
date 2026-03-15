const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const ENHARMONIC: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Fb: "E",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
  Cb: "B",
  "E#": "F",
  "B#": "C",
};

/**
 * Parse a note name like "C4", "Eb5" into { name, octave }.
 */
export function parseNote(note: string): { name: string; octave: number } | null {
  const match = note.match(/^([A-Ga-g][#b]?)(\d+)$/);
  if (!match) return null;

  let name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  const octave = parseInt(match[2], 10);

  if (ENHARMONIC[name]) {
    name = ENHARMONIC[name];
  }

  return { name, octave };
}

/**
 * Convert a note name to MIDI number. C4 = 60.
 */
export function noteToMidi(note: string): number | null {
  const parsed = parseNote(note);
  if (!parsed) return null;

  const semitone = NOTE_NAMES.indexOf(parsed.name);
  if (semitone === -1) return null;

  return (parsed.octave + 1) * 12 + semitone;
}

/**
 * Drum hit name to GM MIDI drum number mapping.
 */
export const DRUM_MAP: Record<string, number> = {
  kick: 36,
  snare: 38,
  hihat: 42,
  "hihat-open": 46,
  ride: 51,
  crash: 49,
  "tom-high": 50,
  "tom-mid": 47,
  "tom-low": 45,
};

/**
 * Map drum note names to the note names used in soundfont samples.
 * GM percussion is on channel 10, mapped to specific MIDI notes.
 */
export function drumHitToNote(hit: string): string | null {
  const midi = DRUM_MAP[hit];
  if (midi === undefined) return null;
  return midiToNoteName(midi);
}

/**
 * Convert MIDI number back to note name.
 */
export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = midi % 12;
  return NOTE_NAMES[semitone] + octave;
}

/**
 * Chord quality definitions: intervals from root in semitones.
 */
const CHORD_INTERVALS: Record<string, number[]> = {
  // Triads
  "": [0, 4, 7],
  maj: [0, 4, 7],
  min: [0, 3, 7],
  m: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  // Sevenths
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  m7: [0, 3, 7, 10],
  dim7: [0, 3, 6, 9],
  "m7b5": [0, 3, 6, 10],
  aug7: [0, 4, 8, 10],
  // Extended
  "9": [0, 4, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  min9: [0, 3, 7, 10, 14],
  m9: [0, 3, 7, 10, 14],
  // Sixths
  "6": [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  // Power
  "5": [0, 7],
};

/**
 * Parse a chord symbol (e.g. "Cmaj7", "Ebm", "F#dim7") and return
 * the individual note names at the given octave.
 *
 * Returns null if the input is a single note (e.g. "C4") or unrecognized.
 */
export function expandChord(chord: string, octave = 4): string[] | null {
  // If it already looks like a single note with octave, skip it
  if (/^[A-Ga-g][#b]?\d+$/.test(chord)) return null;

  // Match root + optional quality
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return null;

  let root = match[1];
  const quality = match[2];

  // Normalize enharmonics
  if (ENHARMONIC[root]) {
    root = ENHARMONIC[root];
  }

  const rootIndex = NOTE_NAMES.indexOf(root);
  if (rootIndex === -1) return null;

  const intervals = CHORD_INTERVALS[quality];
  if (!intervals) return null;

  const rootMidi = (octave + 1) * 12 + rootIndex;
  return intervals.map((interval) => midiToNoteName(rootMidi + interval));
}
