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
 * Convert bar:beat:sixteenth to absolute beat position (float).
 * A "beat" here is one beat of the time signature numerator.
 * barOffset shifts the bar origin (for placing notes within a section that starts at a given bar).
 */
export function timeToBeats(time: string, beatsPerBar: number, barOffset = 0): number {
  const { bar, beat, sixteenth } = parseTime(time)
  return (bar + barOffset) * beatsPerBar + beat + sixteenth / 4
}

/**
 * Convert a duration notation to beats.
 * Supports: "1n", "2n", "4n", "8n", "16n", "32n" and dotted variants ("4n."),
 * as well as "bar:beat:sixteenth" format.
 */
export function durationToBeats(duration: string, beatsPerBar: number): number {
  // Handle bar:beat:sixteenth format
  if (duration.includes(':')) {
    const { bar, beat, sixteenth } = parseTime(duration)
    return bar * beatsPerBar + beat + sixteenth / 4
  }

  const dotted = duration.endsWith('.')
  const base = dotted ? duration.slice(0, -1) : duration

  // Note values relative to a quarter note (1 beat in 4/4)
  let beats: number
  switch (base) {
    case '1n':
      beats = 4
      break
    case '2n':
      beats = 2
      break
    case '4n':
      beats = 1
      break
    case '8n':
      beats = 0.5
      break
    case '16n':
      beats = 0.25
      break
    case '32n':
      beats = 0.125
      break
    default:
      beats = 1 // fallback to quarter note
  }

  if (dotted) {
    beats *= 1.5
  }

  return beats
}

/**
 * Compute total bars for a section, including repeats.
 */
export function sectionTotalBars(bars: number, repeat?: number): number {
  return bars * (repeat ?? 1)
}
