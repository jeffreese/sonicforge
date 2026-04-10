import * as Tone from 'tone'
import type { SidechainConfig } from '../schema/composition'
import type { LoadedInstrument } from './InstrumentLoader'
import type { MixBus } from './MixBus'

/**
 * Implements sidechain compression via envelope-follower ducking.
 *
 * Signal flow for a sidechain target:
 *
 *   sampler → effects → duckingGain → channel → master → destination
 *                            ↑
 *                            │  (control signal drives .gain directly)
 *                            │
 *                     Tone.Add(1)
 *                            ↑
 *                     Tone.Multiply(-amount)
 *                            ↑
 *                     Tone.Follower
 *                            ↑
 *                     sourceChannel (tapped post-fader via a branch)
 *
 * Control signal math: `1 + (-amount * follower) = 1 - amount * follower`
 *
 *   follower = 0 (silent source) → gain = 1 (full pass-through)
 *   follower = 1 (loud source)   → gain = 1 - amount (ducked)
 *
 * Implementation note: we build the full control signal with an explicit
 * Tone.Add(1) node BEFORE it reaches the target gain's `.gain` param,
 * rather than trying to rely on the connect-to-param behavior of Tone.js.
 * Connecting a source to a Tone.Param does NOT sum with the param's base
 * value — it drives the param from the connected signal, and any attempt
 * to use `gain.value = 1` as a baseline is effectively ignored once a
 * signal is connected. We set `gain.value = 0` explicitly to make this
 * unambiguous: the Add(1) node is the only source of the gain value.
 *
 * (Earlier iterations of this class relied on the sum-with-baseline
 * assumption and produced silent targets. That broken behavior was
 * caught in sub-epic #6 when Jeff soloed a pad in a bass-trance demo
 * and heard nothing.)
 *
 * Because signal routing happens in two phases, the Engine must call
 * prepareTargets() BEFORE building the effects chains (so the ducking
 * gains can be used as chain terminals) and connectSources() AFTER the
 * chains are wired (so follower taps see fully-connected sources).
 */
export class SidechainRouter {
  /** Target instrument id → ducking Gain node inserted in its signal path. */
  private targetGains = new Map<string, Tone.Gain>()
  /** Followers, multipliers, and adders created per config, tracked for disposal. */
  private followers: Tone.Follower[] = []
  private multipliers: Tone.Multiply[] = []
  private adders: Tone.Add[] = []

  /**
   * Phase 1: for every sidechain config, create a Tone.Gain that will sit
   * between a target instrument's effects chain and its mix bus channel.
   * The Engine passes these as effect-chain terminals for each target.
   *
   * Returns the map so the Engine can look up the terminal for each
   * instrument. Multiple sidechain configs targeting the same instrument
   * share a single gain node (amounts are summed at connect time).
   */
  prepareTargets(configs: SidechainConfig[] | undefined): Map<string, Tone.Gain> {
    if (!configs || configs.length === 0) return this.targetGains
    for (const config of configs) {
      if (!this.targetGains.has(config.target)) {
        this.targetGains.set(config.target, new Tone.Gain(1))
      }
    }
    return this.targetGains
  }

  /**
   * Phase 2: for every sidechain config, create a Tone.Follower on the
   * source's channel output and route it through a scaling Multiply into
   * the target's ducking gain. Sources and targets that can't be resolved
   * log a warning and are skipped — one bad config doesn't break playback.
   */
  connectSources(
    configs: SidechainConfig[] | undefined,
    instruments: Map<string, LoadedInstrument>,
    mixBus: MixBus,
  ): void {
    if (!configs || configs.length === 0) return

    for (const config of configs) {
      const sourceChannel = mixBus.getChannel(config.source)
      if (!sourceChannel) {
        console.warn(`SidechainRouter: source "${config.source}" has no channel; skipping`)
        continue
      }
      const targetGain = this.targetGains.get(config.target)
      if (!targetGain) {
        // prepareTargets wasn't called with this config, or the target was
        // rejected for some other reason. Should not happen in practice.
        console.warn(`SidechainRouter: target "${config.target}" has no ducking gain; skipping`)
        continue
      }
      if (!instruments.has(config.target)) {
        console.warn(
          `SidechainRouter: target "${config.target}" is not a loaded instrument; skipping`,
        )
        continue
      }

      // Tone.Follower takes a single `smoothing` time (low-pass on the envelope).
      // Use the config's `release` as the smoothing value since release time is
      // what matters for the pumping feel. The `attack` field from the schema
      // is accepted for forward compatibility but not separately applied in v1.
      const follower = new Tone.Follower(config.release ?? 0.1)
      // Branch the source channel into the follower without disturbing the
      // existing source → master routing.
      sourceChannel.connect(follower)

      const multiplier = new Tone.Multiply(-config.amount)
      follower.connect(multiplier)

      // Build the control signal `1 - amount*follower` explicitly with an
      // Add(1) node so the signal arriving at targetGain.gain is already the
      // correct value. Then zero out the gain's base value so the connected
      // signal is the only source — this sidesteps any ambiguity about
      // whether connecting to a Tone.Param sums with or replaces the base.
      const adder = new Tone.Add(1)
      multiplier.connect(adder)
      targetGain.gain.value = 0
      adder.connect(targetGain.gain)

      this.followers.push(follower)
      this.multipliers.push(multiplier)
      this.adders.push(adder)
    }
  }

  /** Return the ducking gain for an instrument, or undefined if it isn't a target. */
  getTargetGain(instrumentId: string): Tone.Gain | undefined {
    return this.targetGains.get(instrumentId)
  }

  /** Dispose all created nodes. Called by Engine.dispose(). */
  dispose(): void {
    for (const a of this.adders) a.dispose()
    this.adders = []
    for (const m of this.multipliers) m.dispose()
    this.multipliers = []
    for (const f of this.followers) f.dispose()
    this.followers = []
    for (const g of this.targetGains.values()) g.dispose()
    this.targetGains.clear()
  }

  /** Test/debug accessor. */
  get targetCount(): number {
    return this.targetGains.size
  }
}
