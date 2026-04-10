import { Store } from './Store'

export interface ChannelState {
  id: string
  name: string
  volume: number // 0–100
  pan: number // -1 to 1
  muted: boolean
  soloed: boolean
  humanization: number // 0–100
}

export interface MixerState {
  channels: ChannelState[]
  masterVolume: number // 0–100
}

export type MixerAction =
  | { type: 'setVolume'; id: string; volume: number }
  | { type: 'setPan'; id: string; pan: number }
  | { type: 'setMuted'; id: string; muted: boolean }
  | { type: 'setSoloed'; id: string; soloed: boolean }
  | { type: 'setMasterVolume'; volume: number }
  | { type: 'setHumanization'; id: string; humanization: number }

/** Callback that the store calls to push changes to the engine's MixBus. */
export type MixerSink = (action: MixerAction) => void

const initialState: MixerState = {
  channels: [],
  masterVolume: 80,
}

export class MixerStore extends Store<MixerState> {
  private sink: MixerSink | null = null

  constructor() {
    super(initialState)
  }

  /** Connect to engine — actions dispatched here get forwarded to MixBus. */
  setSink(sink: MixerSink): void {
    this.sink = sink
  }

  /** Load channel states (called when a composition is loaded). */
  loadChannels(channels: ChannelState[]): void {
    this.setState({ channels: [...channels] })
  }

  /** Clear all channels (called on dispose). */
  clear(): void {
    this.setState({ channels: [], masterVolume: 80 })
  }

  setVolume(id: string, volume: number): void {
    this.updateChannel(id, { volume })
    this.sink?.({ type: 'setVolume', id, volume })
  }

  setPan(id: string, pan: number): void {
    this.updateChannel(id, { pan })
    this.sink?.({ type: 'setPan', id, pan })
  }

  setMuted(id: string, muted: boolean): void {
    this.updateChannel(id, { muted })
    this.sink?.({ type: 'setMuted', id, muted })
  }

  setSoloed(id: string, soloed: boolean): void {
    this.updateChannel(id, { soloed })
    this.sink?.({ type: 'setSoloed', id, soloed })
  }

  setHumanization(id: string, humanization: number): void {
    this.updateChannel(id, { humanization })
    this.sink?.({ type: 'setHumanization', id, humanization })
  }

  setMasterVolume(volume: number): void {
    this.setState({ masterVolume: volume })
    this.sink?.({ type: 'setMasterVolume', volume })
  }

  private updateChannel(id: string, partial: Partial<ChannelState>): void {
    const channels = this.state.channels.map((ch) => (ch.id === id ? { ...ch, ...partial } : ch))
    this.setState({ channels })
  }
}

export const mixerStore = new MixerStore()
