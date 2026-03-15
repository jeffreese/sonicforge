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
