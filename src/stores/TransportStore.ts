import type { EngineState } from '../engine/Engine'
import { Store } from './Store'

export type PlaybackState = 'stopped' | 'playing' | 'paused'

export interface TransportState {
  playbackState: PlaybackState
  engineState: EngineState
  bar: number
  beat: number
  bpm: number
  timeSignature: [number, number]
  sectionName: string | null
  loopSectionIndex: number | null
}

const initialState: TransportState = {
  playbackState: 'stopped',
  engineState: 'empty',
  bar: 0,
  beat: 0,
  bpm: 120,
  timeSignature: [4, 4],
  sectionName: null,
  loopSectionIndex: null,
}

export class TransportStore extends Store<TransportState> {
  constructor() {
    super(initialState)
  }

  /** Called by engine when playback state changes. */
  updatePlayback(playbackState: PlaybackState): void {
    this.setState({ playbackState })
  }

  /** Called by engine on each beat. */
  updatePosition(bar: number, beat: number, sectionName?: string): void {
    this.setState({
      bar,
      beat,
      sectionName: sectionName ?? this.state.sectionName,
    })
  }

  /** Called when a composition is loaded. */
  configure(bpm: number, timeSignature: [number, number]): void {
    this.setState({ bpm, timeSignature })
  }

  /** Called when loop region changes. */
  updateLoop(loopSectionIndex: number | null): void {
    this.setState({ loopSectionIndex })
  }

  /** Called by bridge when raw engine state changes. */
  updateEngineState(engineState: EngineState): void {
    this.setState({ engineState })
  }

  /** Reset position to zero (on stop). */
  resetPosition(): void {
    this.setState({ bar: 0, beat: 0, sectionName: null, playbackState: 'stopped' })
  }
}

export const transportStore = new TransportStore()
