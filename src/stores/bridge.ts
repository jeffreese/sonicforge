/**
 * Bridge between Engine callbacks and reactive stores.
 * Wires engine events to store updates so Lit components can subscribe
 * to stores instead of managing engine callbacks directly.
 */
import type { Engine, EngineState } from '../engine/Engine'
import type { MixBus } from '../engine/MixBus'
import { DEFAULT_HUMANIZATION } from '../engine/humanize'
import type { SonicForgeComposition } from '../schema/composition'
import { compositionStore } from './CompositionStore'
import type { MixerAction } from './MixerStore'
import { mixerStore } from './MixerStore'
import { transportStore } from './TransportStore'

/** Map engine state to transport playback state. */
function toPlaybackState(engineState: EngineState) {
  switch (engineState) {
    case 'playing':
      return 'playing' as const
    case 'paused':
      return 'paused' as const
    default:
      return 'stopped' as const
  }
}

/** Wire engine callbacks to update stores. Call once at app startup. */
export function bridgeEngineToStores(engine: Engine): void {
  engine.setCallbacks({
    onStateChange: (state) => {
      transportStore.updatePlayback(toPlaybackState(state))
      transportStore.updateEngineState(state)
    },
    onBeat: (bar, beat) => {
      const transport = engine.getTransport()
      const sectionIndex = transport.getCurrentSectionIndex()
      const offsets = transport.getSectionOffsets()
      const section = offsets[sectionIndex]
      transportStore.updatePosition(bar, beat, section?.section.name)
    },
    onStop: () => {
      transportStore.resetPosition()
    },
    onLoopChange: (loopIndex) => {
      transportStore.updateLoop(loopIndex)
    },
    onError: (err) => {
      console.error('[SonicForge]', err.message)
    },
  })
}

/** Wire a loaded composition into stores. Call after engine.load(). */
export function bridgeCompositionToStores(
  composition: SonicForgeComposition,
  mixBus: MixBus,
): void {
  // Load composition into store
  compositionStore.load(composition)

  // Load mixer channels from MixBus state, adding humanization default
  const channels = mixBus.getStates().map((ch) => ({
    ...ch,
    humanization: DEFAULT_HUMANIZATION,
  }))
  mixerStore.loadChannels(channels)

  // Configure transport with composition metadata
  transportStore.configure(composition.metadata.bpm, composition.metadata.timeSignature)
}

/** Create a MixerSink that forwards store actions to the engine MixBus. */
export function createMixerSink(mixBus: MixBus, engine: Engine) {
  return (action: MixerAction) => {
    switch (action.type) {
      case 'setVolume':
        mixBus.setVolume(action.id, action.volume)
        break
      case 'setPan':
        mixBus.setPan(action.id, action.pan)
        break
      case 'setMuted':
        mixBus.setMuted(action.id, action.muted)
        break
      case 'setSoloed':
        mixBus.setSoloed(action.id, action.soloed)
        break
      case 'setMasterVolume':
        mixBus.setMasterVolume(action.volume)
        break
      case 'setHumanization':
        engine.setHumanization(action.id, action.humanization)
        break
    }
  }
}
