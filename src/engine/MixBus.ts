import * as Tone from 'tone'
import type { InstrumentDef } from '../schema/composition'

export interface ChannelState {
  id: string
  name: string
  volume: number // 0–100
  pan: number // -1 to 1
  muted: boolean
  soloed: boolean
}

export class MixBus {
  private channels = new Map<string, Tone.Channel>()
  private master = new Tone.Channel(0, 0).toDestination()
  private states = new Map<string, ChannelState>()
  private onChange?: () => void
  /** Per-channel level meters, tapped off the channel output post-fader. */
  private channelMeters = new Map<string, Tone.Meter>()
  /** Master bus meter, tapped off the master channel output. */
  private masterMeter = new Tone.Meter()

  constructor() {
    // Tap the master channel into the master meter. The master is already
    // connected to Tone.Destination via `.toDestination()`; adding the meter
    // is an additional branch that doesn't affect the audio path.
    this.master.connect(this.masterMeter)
  }

  setOnChange(fn: () => void): void {
    this.onChange = fn
  }

  createChannel(instrument: InstrumentDef): Tone.Channel {
    const vol = this.volumeToDb(instrument.defaultVolume ?? 80)
    const pan = instrument.defaultPan ?? 0

    const channel = new Tone.Channel(vol, pan).connect(this.master)
    this.channels.set(instrument.id, channel)

    // Tap the channel into a level meter. Tone.Meter smooths its output via
    // a low-pass filter (default 0.8) which gives natural decay on the UI
    // meter bars without any extra work.
    const meter = new Tone.Meter()
    channel.connect(meter)
    this.channelMeters.set(instrument.id, meter)

    this.states.set(instrument.id, {
      id: instrument.id,
      name: instrument.name,
      volume: instrument.defaultVolume ?? 80,
      pan,
      muted: false,
      soloed: false,
    })

    return channel
  }

  /**
   * Current level of a channel in dB, smoothed. Returns -Infinity if the
   * channel doesn't exist. Used by the mixer UI's rAF polling loop to
   * render meter bars.
   */
  getChannelLevel(id: string): number {
    const meter = this.channelMeters.get(id)
    if (!meter) return Number.NEGATIVE_INFINITY
    const value = meter.getValue()
    // Tone.Meter.getValue() returns a number for mono meters or an array
    // for stereo. We configure mono (default), so it's always a number,
    // but we narrow defensively.
    return typeof value === 'number' ? value : value[0]
  }

  /** Current master bus level in dB, smoothed. */
  getMasterLevel(): number {
    const value = this.masterMeter.getValue()
    return typeof value === 'number' ? value : value[0]
  }

  getChannel(id: string): Tone.Channel | undefined {
    return this.channels.get(id)
  }

  getStates(): ChannelState[] {
    return Array.from(this.states.values())
  }

  getState(id: string): ChannelState | undefined {
    return this.states.get(id)
  }

  setVolume(id: string, volume: number): void {
    const channel = this.channels.get(id)
    const state = this.states.get(id)
    if (!channel || !state) return

    state.volume = volume
    if (!state.muted) {
      channel.volume.value = this.volumeToDb(volume)
    }
    this.onChange?.()
  }

  setPan(id: string, pan: number): void {
    const channel = this.channels.get(id)
    const state = this.states.get(id)
    if (!channel || !state) return

    state.pan = pan
    channel.pan.value = pan
    this.onChange?.()
  }

  setMuted(id: string, muted: boolean): void {
    const state = this.states.get(id)
    if (!state) return

    state.muted = muted
    this.applySoloMuteLogic()
    this.onChange?.()
  }

  setSoloed(id: string, soloed: boolean): void {
    const state = this.states.get(id)
    if (!state) return

    state.soloed = soloed
    this.applySoloMuteLogic()
    this.onChange?.()
  }

  private applySoloMuteLogic(): void {
    const anySoloed = Array.from(this.states.values()).some((s) => s.soloed)

    for (const [id, state] of this.states) {
      const channel = this.channels.get(id)
      if (!channel) continue
      if (anySoloed) {
        // When any track is soloed: mute everything except soloed tracks
        channel.mute = !state.soloed || state.muted
      } else {
        channel.mute = state.muted
      }
    }
  }

  setMasterVolume(volume: number): void {
    this.master.volume.value = this.volumeToDb(volume)
  }

  /**
   * Expose the master channel so the Engine can route it through a master
   * effects chain (between the mix bus output and Tone.Destination).
   */
  getMaster(): Tone.Channel {
    return this.master
  }

  private volumeToDb(volume: number): number {
    if (volume <= 0) return Number.NEGATIVE_INFINITY
    // Map 0–100 to -60dB–0dB with a curve
    return 20 * Math.log10(volume / 100)
  }

  dispose(): void {
    for (const meter of this.channelMeters.values()) {
      meter.dispose()
    }
    this.channelMeters.clear()
    for (const [, channel] of this.channels) {
      channel.dispose()
    }
    this.channels.clear()
    this.states.clear()
    this.masterMeter.dispose()
    this.master.dispose()
    this.master = new Tone.Channel(0, 0).toDestination()
    this.masterMeter = new Tone.Meter()
    this.master.connect(this.masterMeter)
  }
}
