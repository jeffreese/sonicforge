import * as Tone from 'tone'
import { expandChords } from '../schema/chords'
import type { SonicForgeComposition } from '../schema/composition'
import { validate } from '../schema/validate'
import { AutomationEngine } from './AutomationEngine'
import { EffectsChain } from './EffectsChain'
import { type InstrumentSource, type LoadedInstrument, loadInstruments } from './InstrumentLoader'
import { MixBus } from './MixBus'
import { MultiLayerSampler } from './MultiLayerSampler'
import { loadSampleData } from './SampleLoader'
import { TrackPlayer } from './TrackPlayer'
import { Transport, type TransportCallbacks } from './Transport'
import type { AutomationTargetRegistry } from './automation-targets'
import { DEFAULT_HUMANIZATION } from './humanize'

export type EngineState = 'empty' | 'loading' | 'ready' | 'playing' | 'paused'

export interface EngineCallbacks extends TransportCallbacks {
  onStateChange?: (state: EngineState) => void
  onLoadProgress?: (loaded: number, total: number) => void
  onError?: (error: Error) => void
  onLoopChange?: (loopIndex: number | null) => void
}

export class Engine {
  private transport = new Transport()
  private trackPlayers: TrackPlayer[] = []
  /** TrackPlayers grouped by instrument ID, for per-track settings like humanization. */
  private trackPlayersByInstrument = new Map<string, TrackPlayer[]>()
  private instruments = new Map<string, LoadedInstrument>()
  private composition: SonicForgeComposition | null = null
  private callbacks: EngineCallbacks = {}
  private _state: EngineState = 'empty'
  private mixBus = new MixBus()
  private effectsChains: EffectsChain[] = []
  /** instrumentId → EffectsChain for automation target resolution. */
  private chainsByInstrument = new Map<string, EffectsChain>()
  private masterEffectsChain: EffectsChain | null = null
  private automationEngine = new AutomationEngine()

  get state(): EngineState {
    return this._state
  }

  private setState(state: EngineState): void {
    this._state = state
    this.callbacks.onStateChange?.(state)
  }

  setCallbacks(callbacks: EngineCallbacks): void {
    this.callbacks = callbacks
    this.transport.setCallbacks({
      onBeat: callbacks.onBeat,
      onSection: callbacks.onSection,
      onStop: () => {
        this.setState('ready')
        callbacks.onStop?.()
      },
      onLoopChange: callbacks.onLoopChange,
    })
  }

  async load(json: string): Promise<void> {
    this.dispose()

    try {
      const data = JSON.parse(json)
      this.composition = validate(data)
      expandChords(this.composition)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.callbacks.onError?.(error)
      throw error
    }

    this.setState('loading')

    try {
      // Load all instrument samples
      this.instruments = await loadInstruments(
        this.composition.instruments,
        this.composition.sections,
      )

      // Create mix bus channels and effects chains for each instrument
      for (const instDef of this.composition.instruments) {
        const loaded = this.instruments.get(instDef.id)
        if (!loaded) continue

        const channel = this.mixBus.createChannel(instDef)

        // Build effects chain: sampler → effects → channel
        const chain = new EffectsChain()
        chain.connect(loaded.sampler, channel, instDef.effects)
        this.effectsChains.push(chain)
        this.chainsByInstrument.set(instDef.id, chain)
      }

      // Master bus effects: if the composition declares masterEffects, route
      // master → effects → destination. Otherwise the master stays connected
      // directly to Tone.Destination (as MixBus constructs it).
      if (this.composition.masterEffects && this.composition.masterEffects.length > 0) {
        const master = this.mixBus.getMaster()
        master.disconnect()
        this.masterEffectsChain = new EffectsChain()
        this.masterEffectsChain.connect(
          master,
          Tone.getDestination(),
          this.composition.masterEffects,
        )
      }

      // Compile automation lanes against the resolved target registry.
      // Must happen after instruments, per-instrument chains, and master
      // chain are built so every target path can be resolved.
      const registry: AutomationTargetRegistry = {
        mixBus: this.mixBus,
        instrumentChains: this.chainsByInstrument,
        masterChain: this.masterEffectsChain,
      }
      this.automationEngine.compile(
        this.composition.automation,
        this.composition.metadata,
        registry,
      )

      // Configure transport
      this.transport.configure(this.composition.metadata, this.composition.sections)

      // Create track players and schedule notes
      const sectionOffsets = this.transport.getSectionOffsets()
      for (const offset of sectionOffsets) {
        for (const track of offset.section.tracks) {
          const instrument = this.instruments.get(track.instrumentId)
          if (!instrument) {
            console.warn(`No loaded instrument for track "${track.instrumentId}"`)
            continue
          }

          const player = new TrackPlayer(instrument, this.composition.metadata)
          player.setHumanize({ amount: DEFAULT_HUMANIZATION })
          player.scheduleTrack(track, offset)
          this.trackPlayers.push(player)

          // Track by instrument for per-track settings
          const group = this.trackPlayersByInstrument.get(track.instrumentId) ?? []
          group.push(player)
          this.trackPlayersByInstrument.set(track.instrumentId, group)
        }
      }

      this.setState('ready')
    } catch (err) {
      this.setState('empty')
      const error = err instanceof Error ? err : new Error(String(err))
      this.callbacks.onError?.(error)
      throw error
    }
  }

  async play(): Promise<void> {
    if (!this.composition) return
    await this.transport.play()
    this.automationEngine.scheduleFromCurrentPosition()
    this.setState('playing')
  }

  pause(): void {
    this.transport.pause()
    this.automationEngine.stop()
    this.setState('paused')
  }

  stop(): void {
    this.transport.stop()
    this.automationEngine.stop()
    this.setState('ready')
  }

  seekToSection(index: number): void {
    this.transport.seekToSection(index)
    if (this._state === 'playing') {
      this.automationEngine.scheduleFromCurrentPosition()
    }
  }

  seekToBeat(beat: number): void {
    this.transport.seekToBeat(beat)
    if (this._state === 'playing') {
      this.automationEngine.scheduleFromCurrentPosition()
    }
  }

  setLoopSection(index: number | null): void {
    this.transport.setLoopSection(index)
  }

  /** Current playback position as absolute beat number (float), for smooth playhead rendering. */
  getPositionBeats(): number {
    return this.transport.getPositionBeats()
  }

  getComposition(): SonicForgeComposition | null {
    return this.composition
  }

  getTransport(): Transport {
    return this.transport
  }

  /** Update humanization amount for all TrackPlayers of a given instrument. */
  setHumanization(instrumentId: string, amount: number): void {
    const players = this.trackPlayersByInstrument.get(instrumentId)
    if (!players) return
    for (const player of players) {
      player.setHumanize({ amount })
    }
  }

  getMixBus(): MixBus {
    return this.mixBus
  }

  /** Get a map of instrumentId → sample name for the current composition. */
  getSampleMap(): Map<string, string> {
    const map = new Map<string, string>()
    if (this.composition) {
      for (const inst of this.composition.instruments) {
        if (inst.sample) {
          map.set(inst.id, inst.sample)
        }
      }
    }
    return map
  }

  /** Hot-swap an instrument's sample in the running composition. */
  async swapSample(instrumentId: string, newSample: string): Promise<void> {
    if (!this.composition) return

    const loaded = this.instruments.get(instrumentId)
    if (!loaded || loaded.isDrum) return

    // Find the instrument definition
    const instDef = this.composition.instruments.find((i) => i.id === instrumentId)
    if (!instDef) return

    // Load the new sample data
    const sampleData = await loadSampleData(newSample)

    // Create new multi-layer sampler
    const newSampler = new MultiLayerSampler()
    await newSampler.load(sampleData.layers)

    // Disconnect old sampler and dispose
    const oldSampler = loaded.sampler
    oldSampler.disconnect()

    // Reconnect new sampler through the existing channel
    const channel = this.mixBus.getChannel(instrumentId)
    if (channel) {
      // Find and rebuild the effects chain for this instrument
      const chainIndex = this.composition.instruments.indexOf(instDef)
      if (chainIndex >= 0 && chainIndex < this.effectsChains.length) {
        this.effectsChains[chainIndex].dispose()
        const chain = new EffectsChain()
        chain.connect(newSampler, channel, instDef.effects)
        this.effectsChains[chainIndex] = chain
      } else {
        newSampler.connect(channel)
      }
    }

    oldSampler.dispose()

    // Update references
    loaded.sampler = newSampler as unknown as InstrumentSource
    instDef.sample = newSample
  }

  dispose(): void {
    for (const player of this.trackPlayers) {
      player.dispose()
    }
    this.trackPlayers = []
    this.trackPlayersByInstrument.clear()

    for (const chain of this.effectsChains) {
      chain.dispose()
    }
    this.effectsChains = []
    this.chainsByInstrument.clear()

    if (this.masterEffectsChain) {
      this.masterEffectsChain.dispose()
      this.masterEffectsChain = null
    }

    this.automationEngine.dispose()

    for (const [, inst] of this.instruments) {
      inst.sampler.dispose()
    }
    this.instruments.clear()

    this.mixBus.dispose()

    this.transport.dispose()
    this.composition = null
    this.setState('empty')
  }
}
