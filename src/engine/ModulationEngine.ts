import * as Tone from 'tone'
import type { LFOConfig, ModulationRoute } from '../schema/composition'
import { type AutomationTargetRegistry, resolveTarget } from './automation-targets'

/**
 * Creates Tone.LFO instances declared in composition.lfos and routes them
 * to parameter targets declared in composition.modulation.
 *
 * The LFO output directly drives the target param (standard wobble-bass
 * pattern): when an LFO is connected to `filter.frequency`, the signal
 * oscillating between the LFO's min and max IS the filter frequency. The
 * schema's `ModulationRoute.amount` is applied as a multiplier on the LFO
 * output via Tone.Multiply (default 1, pass-through). Amounts < 1 scale the
 * output range; users control the absolute range via each LFO's min/max.
 *
 * Target paths reuse the same resolver as AutomationEngine, including
 * synth-internal walking from sub-epic #4 commit 1. LFOs for wobble bass
 * typically target `"<instrumentId>.filter.frequency"` on a mono synth.
 *
 * Lifecycle:
 *   - compile(): instantiate LFOs and Multiply nodes, wire routes
 *   - start():   start every LFO (called from Engine.play)
 *   - stop():    stop every LFO (called from Engine.stop/pause)
 *   - dispose(): dispose every Tone node
 */
export class ModulationEngine {
  private lfos = new Map<string, Tone.LFO>()
  private multipliers: Tone.Multiply[] = []

  /**
   * Build LFOs and wire them to their routes' resolved target params.
   * Call this during Engine.load(), after all instruments and effects
   * chains are constructed so every target path can be resolved.
   */
  compile(
    lfoConfigs: LFOConfig[] | undefined,
    routes: ModulationRoute[] | undefined,
    registry: AutomationTargetRegistry,
  ): void {
    if (lfoConfigs && lfoConfigs.length > 0) {
      for (const config of lfoConfigs) {
        if (this.lfos.has(config.id)) {
          console.warn(`ModulationEngine: duplicate LFO id "${config.id}"; ignoring`)
          continue
        }
        const lfo = new Tone.LFO({
          frequency: config.frequency as Tone.Unit.Frequency,
          min: config.min,
          max: config.max,
          type: config.type ?? 'sine',
        })
        this.lfos.set(config.id, lfo)
      }
    }

    if (!routes || routes.length === 0) return

    for (const route of routes) {
      const lfo = this.lfos.get(route.source)
      if (!lfo) {
        console.warn(
          `ModulationEngine: modulation route source "${route.source}" does not match any LFO; skipping`,
        )
        continue
      }
      const target = resolveTarget(route.target, registry)
      if (!target) {
        console.warn(
          `ModulationEngine: could not resolve modulation target "${route.target}"; skipping`,
        )
        continue
      }

      const amount = route.amount ?? 1
      if (amount === 1) {
        // Full-range pass-through: connect LFO directly to the target param.
        lfo.connect(target as unknown as Tone.InputNode)
      } else {
        // Scale the LFO output by `amount` before connecting.
        const scaler = new Tone.Multiply(amount)
        lfo.connect(scaler)
        scaler.connect(target as unknown as Tone.InputNode)
        this.multipliers.push(scaler)
      }
    }
  }

  /** Start every LFO. Called from Engine.play(). */
  start(): void {
    for (const lfo of this.lfos.values()) {
      lfo.start()
    }
  }

  /** Stop every LFO. Called from Engine.stop() / Engine.pause(). */
  stop(): void {
    for (const lfo of this.lfos.values()) {
      lfo.stop()
    }
  }

  /** Dispose all created nodes. Called from Engine.dispose(). */
  dispose(): void {
    for (const m of this.multipliers) m.dispose()
    this.multipliers = []
    for (const lfo of this.lfos.values()) lfo.dispose()
    this.lfos.clear()
  }

  /** Test/debug accessor. */
  get lfoCount(): number {
    return this.lfos.size
  }
}
