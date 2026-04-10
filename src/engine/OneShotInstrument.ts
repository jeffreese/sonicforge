import * as Tone from 'tone'

/**
 * A fixed-pitch sample instrument. Each hit name (e.g. "kick", "snare") maps
 * to a dedicated `Tone.Player` that triggers the sample when a matching note
 * is scheduled. Used for drum one-shots and FX samples — things that don't
 * need to play pitched across a range.
 *
 * Signature intentionally matches `InstrumentSource`: extends `Tone.Gain` for
 * routing, implements `triggerAttackRelease(pitch, duration, time, velocity)`.
 * The `pitch` parameter is interpreted as a hit name, and `duration` is
 * ignored — one-shots play to their natural length, velocity scales volume.
 *
 * Loading is async: construct, then call `await load(oneshots)` before
 * triggering. This matches the existing `MultiLayerSampler` pattern.
 */
export class OneShotInstrument extends Tone.Gain {
  private players = new Map<string, Tone.Player>()

  /**
   * Load every sample referenced in the `oneshots` map. Each key is a hit
   * name the composition will trigger by; each value is a URL resolvable by
   * the browser (e.g. `"samples/oneshots/kicks/foo.wav"`).
   *
   * Resolves when every sample has loaded, or rejects on the first load
   * error. Hits that fail to load are not registered — triggering them
   * later becomes a no-op (rather than throwing).
   */
  async load(oneshots: Record<string, string>): Promise<void> {
    const entries = Object.entries(oneshots)
    if (entries.length === 0) return

    const loadPromises = entries.map(
      ([hitName, url]) =>
        new Promise<void>((resolve, reject) => {
          const player = new Tone.Player({
            url,
            autostart: false,
            onload: () => {
              player.connect(this)
              this.players.set(hitName, player)
              resolve()
            },
            onerror: (err) => {
              reject(err instanceof Error ? err : new Error(String(err)))
            },
          })
        }),
    )

    await Promise.all(loadPromises)
  }

  /**
   * Trigger a hit by name. `pitch` is the hit name (typed as `string | number`
   * to match the InstrumentSource interface, but always coerced to string).
   * `duration` is ignored — one-shots play to completion. `velocity` is 0..1
   * and is converted to dB volume on the player.
   *
   * Unknown hit names are silently no-ops (not an error) so a composition
   * can reference hits that may be absent without crashing playback.
   */
  triggerAttackRelease(
    pitch: string | number,
    _duration: string | number,
    time?: number,
    velocity?: number,
  ): this {
    const hitName = String(pitch)
    const player = this.players.get(hitName)
    if (!player) return this

    if (velocity !== undefined) {
      player.volume.value = velocityToDb(velocity)
    }
    player.start(time)
    return this
  }

  /** Names of hits registered on this instrument. For tests and debugging. */
  getHitNames(): string[] {
    return Array.from(this.players.keys())
  }

  dispose(): this {
    for (const player of this.players.values()) {
      player.dispose()
    }
    this.players.clear()
    return super.dispose()
  }
}

/**
 * Convert a linear velocity in [0, 1] to dB. `velocity === 1` → 0 dB,
 * `velocity === 0.5` → ~-6 dB, `velocity === 0.1` → -20 dB. Zero maps
 * to -Infinity (silent).
 *
 * Exported for unit testing.
 */
export function velocityToDb(velocity: number): number {
  if (velocity <= 0) return Number.NEGATIVE_INFINITY
  return 20 * Math.log10(velocity)
}
