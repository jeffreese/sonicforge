import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { engine } from '../engine/instance'
import type { ChannelState } from '../stores/MixerStore'
import { mixerStore } from '../stores/MixerStore'
import type { Unsubscribe } from '../stores/Store'
import { mixer } from '../styles/components'
import './sf-channel-strip'

/** How long peak holds at its high point before decaying, in milliseconds. */
const PEAK_HOLD_MS = 1000
/** Peak decay rate after the hold expires, in dB per millisecond. */
const PEAK_DECAY_DB_PER_MS = 0.02

interface PeakState {
  /** The value to render — updated each tick during decay. */
  level: number
  /** The original peak when it was set — used to compute decay from a stable base. */
  peakLevel: number
  /** Timestamp when `peakLevel` was set (used for hold + decay timing). */
  heldSince: number
}

@customElement('sf-mixer')
export class SfMixer extends LitElement {
  @state() private channels: ChannelState[] = []
  @state() private masterVolume = 80
  /** Current meter levels in dB, keyed by channel id. Updated via rAF. */
  @state() private levels: Record<string, number> = {}
  /** Current master bus meter level in dB. Updated via rAF. */
  @state() private masterLevel = Number.NEGATIVE_INFINITY
  /** Peak-hold levels per channel, updated each rAF tick. */
  @state() private peakLevels: Record<string, number> = {}
  /** Peak-hold level for the master bus. */
  @state() private masterPeakLevel = Number.NEGATIVE_INFINITY

  // Internal tracking for peak decay — not reactive state to avoid
  // re-rendering every time we bump heldSince.
  private channelPeaks = new Map<string, PeakState>()
  private masterPeak: PeakState = {
    level: Number.NEGATIVE_INFINITY,
    peakLevel: Number.NEGATIVE_INFINITY,
    heldSince: 0,
  }

  private unsubscribe?: Unsubscribe
  private rafId: number | null = null

  createRenderRoot() {
    return this
  }

  connectedCallback(): void {
    super.connectedCallback()
    const s = mixerStore.state
    this.channels = s.channels
    this.masterVolume = s.masterVolume

    this.unsubscribe = mixerStore.subscribe((state) => {
      this.channels = state.channels
      this.masterVolume = state.masterVolume
    })

    // Start the meter polling loop. It runs as long as the mixer is
    // in the DOM — when audio is silent, Tone.Meter values naturally
    // drop to -Infinity and the bars go empty. No need to gate on
    // playback state.
    this.startMeterLoop()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unsubscribe?.()
    this.stopMeterLoop()
  }

  /**
   * rAF loop that polls the engine's MixBus for current channel levels,
   * computes peak-hold values, and updates the mixer state. The property
   * bindings to each `<sf-channel-strip>` propagate the new levels and
   * peaks as Lit reactive props.
   *
   * We read a fresh channels list each tick (rather than relying on the
   * closure-captured one at loop start) so that channels added or
   * removed via store updates are picked up automatically.
   */
  private startMeterLoop(): void {
    const tick = () => {
      const now = performance.now()
      const mixBus = engine.getMixBus()
      const nextLevels: Record<string, number> = {}
      const nextPeaks: Record<string, number> = {}
      for (const ch of this.channels) {
        const current = mixBus.getChannelLevel(ch.id)
        nextLevels[ch.id] = current
        nextPeaks[ch.id] = this.updatePeak(this.channelPeaks, ch.id, current, now)
      }
      this.levels = nextLevels
      this.peakLevels = nextPeaks
      const masterCurrent = mixBus.getMasterLevel()
      this.masterLevel = masterCurrent
      this.masterPeak = this.advancePeakState(this.masterPeak, masterCurrent, now)
      this.masterPeakLevel = this.masterPeak.level
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  /**
   * Update a per-channel peak state entry and return the current peak dB.
   * Rises immediately to any new high; holds for PEAK_HOLD_MS, then decays
   * linearly at PEAK_DECAY_DB_PER_MS toward the current level.
   */
  private updatePeak(
    store: Map<string, PeakState>,
    id: string,
    currentLevel: number,
    now: number,
  ): number {
    const existing = store.get(id) ?? {
      level: Number.NEGATIVE_INFINITY,
      peakLevel: Number.NEGATIVE_INFINITY,
      heldSince: now,
    }
    const next = this.advancePeakState(existing, currentLevel, now)
    store.set(id, next)
    return next.level
  }

  /**
   * Advance a peak state for one tick. Decay is always computed from the
   * ORIGINAL peak (not the last decayed value) so the rate is time-
   * consistent regardless of tick frequency.
   */
  private advancePeakState(prev: PeakState, currentLevel: number, now: number): PeakState {
    // Rise immediately to any new high — resets the hold clock.
    if (currentLevel >= prev.peakLevel) {
      return { level: currentLevel, peakLevel: currentLevel, heldSince: now }
    }
    const elapsed = now - prev.heldSince
    // Hold phase — keep showing the original peak.
    if (elapsed <= PEAK_HOLD_MS) {
      return { level: prev.peakLevel, peakLevel: prev.peakLevel, heldSince: prev.heldSince }
    }
    // Decay phase — compute from the stable original peak.
    const decayed = prev.peakLevel - PEAK_DECAY_DB_PER_MS * (elapsed - PEAK_HOLD_MS)
    if (decayed <= currentLevel) {
      // Fully decayed to current — reset the peak cycle.
      return { level: currentLevel, peakLevel: currentLevel, heldSince: now }
    }
    return { level: decayed, peakLevel: prev.peakLevel, heldSince: prev.heldSince }
  }

  private stopMeterLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  /** Compute the bar height (0-100%) for a dB level. Matches sf-channel-strip. */
  private levelToHeight(db: number): number {
    if (!Number.isFinite(db)) return 0
    const clamped = Math.max(-60, Math.min(0, db))
    return ((clamped + 60) / 60) * 100
  }

  /** Pick a color zone class for a dB level. Matches sf-channel-strip. */
  private levelColorClass(db: number): string {
    if (db > -3) return mixer.meterRed
    if (db > -12) return mixer.meterYellow
    return mixer.meterGreen
  }

  private handleVolume(e: CustomEvent<{ id: string; volume: number }>): void {
    mixerStore.setVolume(e.detail.id, e.detail.volume)
  }

  private handlePan(e: CustomEvent<{ id: string; pan: number }>): void {
    mixerStore.setPan(e.detail.id, e.detail.pan)
  }

  private handleMute(e: CustomEvent<{ id: string; muted: boolean }>): void {
    mixerStore.setMuted(e.detail.id, e.detail.muted)
  }

  private handleSolo(e: CustomEvent<{ id: string; soloed: boolean }>): void {
    mixerStore.setSoloed(e.detail.id, e.detail.soloed)
  }

  private handleMasterVolume(e: Event): void {
    const value = Number((e.target as HTMLInputElement).value)
    mixerStore.setMasterVolume(value)
  }

  render() {
    return html`
      <div
        class="${mixer.container}"
        @mixer-volume=${this.handleVolume}
        @mixer-pan=${this.handlePan}
        @mixer-mute=${this.handleMute}
        @mixer-solo=${this.handleSolo}
      >
        <div class="${mixer.strip}">
          ${this.channels.map(
            (ch) => html`
              <sf-channel-strip
                .channelId=${ch.id}
                .name=${ch.name}
                .volume=${ch.volume}
                .pan=${ch.pan}
                .muted=${ch.muted}
                .soloed=${ch.soloed}
                .level=${this.levels[ch.id] ?? Number.NEGATIVE_INFINITY}
                .peakLevel=${this.peakLevels[ch.id] ?? Number.NEGATIVE_INFINITY}
              ></sf-channel-strip>
            `,
          )}
          ${this.renderMaster()}
        </div>
      </div>
    `
  }

  private renderMaster() {
    const meterHeight = this.levelToHeight(this.masterLevel)
    const peakHeight = this.levelToHeight(this.masterPeakLevel)
    const meterColor = this.levelColorClass(this.masterLevel)
    const readout = Number.isFinite(this.masterLevel) ? `${Math.round(this.masterLevel)} dB` : '-∞'
    return html`
      <div class="${mixer.master}">
        <div class="${mixer.masterLabel}">Master</div>
        <div class="${mixer.meterRow} mt-2">
          <div class="flex-1">
            <div class="${mixer.controlRow}">
              <span class="${mixer.label}">Vol</span>
              <input
                type="range"
                class="${mixer.slider}"
                min="0"
                max="100"
                .value=${String(this.masterVolume)}
                @input=${this.handleMasterVolume}
                aria-label="Master Volume"
              />
              <span class="${mixer.value}">${this.masterVolume}</span>
            </div>
          </div>
          <div class="${mixer.meterColumn}">
            <div
              class="${mixer.meterContainer}"
              role="meter"
              aria-label="Master level"
              aria-valuenow=${Number.isFinite(this.masterLevel) ? String(this.masterLevel) : '-Infinity'}
              aria-valuemin="-60"
              aria-valuemax="0"
            >
              <div
                class="${mixer.meterFill} ${meterColor}"
                style="height: ${meterHeight}%"
              ></div>
              ${
                Number.isFinite(this.masterPeakLevel)
                  ? html`<div
                    class="${mixer.meterPeak}"
                    style="bottom: ${peakHeight}%"
                  ></div>`
                  : ''
              }
            </div>
            <div class="${mixer.meterReadout}">${readout}</div>
          </div>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sf-mixer': SfMixer
  }
}
