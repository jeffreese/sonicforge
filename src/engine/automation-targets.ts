import type * as Tone from 'tone'
import type { EffectsChain } from './EffectsChain'
import type { MixBus } from './MixBus'

/**
 * Automation target paths are dotted strings that resolve to a specific
 * `Tone.Param` or `Tone.Signal` at composition-load time. The AutomationEngine
 * uses these resolutions to schedule value changes over transport time.
 *
 * Supported path shapes:
 *
 *   "<instrumentId>.volume"               → MixBus channel volume
 *   "<instrumentId>.pan"                  → MixBus channel pan
 *   "<instrumentId>.<effect>.<param>"     → per-instrument effect param
 *                                           (effect resolves via EffectsChain.getEffect:
 *                                            id first, then type-first-match)
 *   "master.<effect>.<param>"             → master bus effect param
 *
 * Synth filter.cutoff and envelope params are intentionally not supported
 * here — sub-epic #4 extends the resolver with synth internals alongside
 * the LFO modulation work.
 */

/**
 * Registry of lookups the resolver needs. Engine builds this during load()
 * and passes it to the AutomationEngine. This keeps the resolver decoupled
 * from Engine internals — easy to test, easy to extend.
 */
export interface AutomationTargetRegistry {
  /** MixBus for channel volume/pan lookups. */
  mixBus: MixBus
  /** instrumentId → EffectsChain for per-instrument effect param lookups. */
  instrumentChains: Map<string, EffectsChain>
  /** Master effects chain, or null if the composition has none. */
  masterChain: EffectsChain | null
}

export type TonePrimitiveParam = Tone.Param<'normalRange'> | Tone.Param<'decibels'> | Tone.Signal

/**
 * Resolve a target path to a Tone.Param / Tone.Signal on which we can call
 * setValueAtTime / linearRampToValueAtTime / exponentialRampToValueAtTime.
 *
 * Returns `null` if the path is malformed or doesn't resolve to anything.
 * Callers should log a warning and skip the lane — never throw — so one
 * malformed automation entry can't break playback of an otherwise-valid
 * composition.
 */
export function resolveTarget(
  path: string,
  registry: AutomationTargetRegistry,
): TonePrimitiveParam | null {
  const parts = path.split('.')
  if (parts.length < 2) return null

  const [head, ...rest] = parts

  if (head === 'master') {
    return resolveEffectParam(registry.masterChain, rest)
  }

  // Track-level: "<instrumentId>.<paramName>" (volume/pan)
  if (rest.length === 1) {
    return resolveTrackParam(registry.mixBus, head, rest[0])
  }

  // Per-instrument effect: "<instrumentId>.<effectIdOrType>.<paramName>"
  const chain = registry.instrumentChains.get(head)
  if (!chain) return null
  return resolveEffectParam(chain, rest)
}

function resolveTrackParam(
  mixBus: MixBus,
  instrumentId: string,
  paramName: string,
): TonePrimitiveParam | null {
  const channel = mixBus.getChannel(instrumentId)
  if (!channel) return null
  if (paramName === 'volume') return channel.volume as unknown as TonePrimitiveParam
  if (paramName === 'pan') return channel.pan as unknown as TonePrimitiveParam
  return null
}

function resolveEffectParam(
  chain: EffectsChain | null,
  pathRest: string[],
): TonePrimitiveParam | null {
  if (!chain) return null
  if (pathRest.length !== 2) return null
  const [effectIdOrType, paramName] = pathRest

  const effect = chain.getEffect(effectIdOrType)
  if (!effect) return null

  // Tone.js effect params are typically exposed as direct properties on the
  // effect node (e.g., reverb.wet, compressor.threshold, eq3.low). We access
  // them by key and check the shape.
  const candidate = (effect as unknown as Record<string, unknown>)[paramName]
  if (isToneParam(candidate)) {
    return candidate as TonePrimitiveParam
  }
  return null
}

/**
 * Duck-type check for a Tone.Param / Tone.Signal: it has a `setValueAtTime`
 * method and a `value` property. This lets us avoid importing the concrete
 * Tone classes here (they're hard to check in jsdom tests) while still
 * rejecting plain numbers or unrelated objects.
 */
function isToneParam(x: unknown): boolean {
  if (!x || typeof x !== 'object') return false
  const obj = x as Record<string, unknown>
  return (
    typeof obj.setValueAtTime === 'function' &&
    typeof obj.linearRampToValueAtTime === 'function' &&
    typeof obj.cancelScheduledValues === 'function'
  )
}
