/**
 * Parse a time string "bar:beat:sixteenth" into components.
 * All values are 0-indexed.
 */
export function parseTime(time: string): { bar: number; beat: number; sixteenth: number } {
  const parts = time.split(':').map(Number)
  return {
    bar: parts[0] ?? 0,
    beat: parts[1] ?? 0,
    sixteenth: parts[2] ?? 0,
  }
}

/**
 * Convert bar:beat:sixteenth to absolute seconds.
 */
export function timeToSeconds(
  time: string,
  bpm: number,
  timeSignature: [number, number],
  barOffset = 0,
): number {
  const { bar, beat, sixteenth } = parseTime(time)
  const beatDuration = 60 / bpm
  // Adjust for time signature denominator (4 = quarter note, 8 = eighth note)
  const baseBeatDuration = beatDuration * (4 / timeSignature[1])
  const beatsPerBar = timeSignature[0]

  const totalBeats = (bar + barOffset) * beatsPerBar + beat + sixteenth / 4
  return totalBeats * baseBeatDuration
}

/**
 * Convert a duration notation to seconds.
 * Supports: "1n", "2n", "4n", "8n", "16n", "32n" and dotted variants ("4n.")
 */
export function durationToSeconds(duration: string, bpm: number): number {
  const beatDuration = 60 / bpm // quarter note duration

  const dotted = duration.endsWith('.')
  const base = dotted ? duration.slice(0, -1) : duration

  let seconds: number
  switch (base) {
    case '1n':
      seconds = beatDuration * 4
      break
    case '2n':
      seconds = beatDuration * 2
      break
    case '4n':
      seconds = beatDuration
      break
    case '8n':
      seconds = beatDuration / 2
      break
    case '16n':
      seconds = beatDuration / 4
      break
    case '32n':
      seconds = beatDuration / 8
      break
    default:
      seconds = beatDuration // fallback to quarter note
  }

  if (dotted) {
    seconds *= 1.5
  }

  return seconds
}

/**
 * Compute total bars for a section, including repeats.
 */
export function sectionTotalBars(bars: number, repeat?: number): number {
  return bars * (repeat ?? 1)
}
