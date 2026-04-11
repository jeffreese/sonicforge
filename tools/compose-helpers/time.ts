/**
 * Time string helpers for composition note scheduling.
 *
 * SonicForge uses "bar:beat:sixteenth" zero-indexed time strings. "0:0:0" is the
 * first sixteenth of the first beat of the first bar. Durations use Tone.js
 * notation ("4n", "8n", "16n", etc.) and are handled by the engine directly —
 * these helpers only deal with note start times.
 */

export interface BeatTime {
  bar: number
  beat: number
  sixteenth: number
}

/** Build a "bar:beat:sixteenth" time string from numeric components. */
export function beatTime(bar: number, beat = 0, sixteenth = 0): string {
  if (bar < 0 || beat < 0 || sixteenth < 0) {
    throw new Error(`beatTime: components must be non-negative (got ${bar}:${beat}:${sixteenth})`)
  }
  if (beat > 3) {
    throw new Error(`beatTime: beat must be 0-3 for 4/4 (got ${beat})`)
  }
  if (sixteenth > 3) {
    throw new Error(`beatTime: sixteenth must be 0-3 (got ${sixteenth})`)
  }
  return `${bar}:${beat}:${sixteenth}`
}

/** Parse a "bar:beat:sixteenth" time string into numeric components. */
export function parseBeatTime(time: string): BeatTime {
  const parts = time.split(':')
  if (parts.length !== 3) {
    throw new Error(`parseBeatTime: expected "bar:beat:sixteenth", got "${time}"`)
  }
  const [bar, beat, sixteenth] = parts.map((p) => {
    const n = Number(p)
    if (!Number.isFinite(n) || n < 0) {
      throw new Error(`parseBeatTime: invalid component "${p}" in "${time}"`)
    }
    return n
  })
  return { bar, beat, sixteenth }
}

/**
 * Shift a time string by a number of bars. Negative deltas shift earlier;
 * throws if the result would have a negative bar number.
 */
export function offsetBars(time: string, barDelta: number): string {
  const parsed = parseBeatTime(time)
  const newBar = parsed.bar + barDelta
  if (newBar < 0) {
    throw new Error(`offsetBars: result has negative bar (${newBar}) for "${time}" + ${barDelta}`)
  }
  return beatTime(newBar, parsed.beat, parsed.sixteenth)
}

/**
 * Convert a flat beat offset (including fractional sixteenths) to a time string
 * in 4/4. Useful when generating from beat-counter loops rather than bar loops.
 *
 * Example: totalBeats 5.5 → bar 1, beat 1, sixteenth 2 → "1:1:2"
 */
export function beatsToTime(totalBeats: number): string {
  if (totalBeats < 0) {
    throw new Error(`beatsToTime: totalBeats must be non-negative (got ${totalBeats})`)
  }
  const bar = Math.floor(totalBeats / 4)
  const beatInBar = Math.floor(totalBeats % 4)
  const fraction = totalBeats - Math.floor(totalBeats)
  const sixteenth = Math.round(fraction * 4)
  return beatTime(bar, beatInBar, sixteenth)
}
