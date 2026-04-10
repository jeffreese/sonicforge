import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { mixer } from '../styles/components'

@customElement('sf-channel-strip')
export class SfChannelStrip extends LitElement {
  @property() channelId = ''
  @property() name = ''
  @property({ type: Number }) volume = 80
  @property({ type: Number }) pan = 0
  @property({ type: Boolean }) muted = false
  @property({ type: Boolean }) soloed = false
  /** Current signal level in dB. -Infinity = silent, 0 = peak. */
  @property({ type: Number }) level = Number.NEGATIVE_INFINITY

  createRenderRoot() {
    return this
  }

  /**
   * Convert a dB level to a bar height percentage. Maps -60 dB → 0%,
   * 0 dB → 100%, clamps outside that range. Values below -60 (including
   * -Infinity) produce 0%; values above 0 produce 100%.
   */
  private levelToHeight(db: number): number {
    if (!Number.isFinite(db)) return 0
    const clamped = Math.max(-60, Math.min(0, db))
    return ((clamped + 60) / 60) * 100
  }

  /**
   * Pick a color zone class based on dB level. Green below -12 dB,
   * yellow -12 to -3 dB, red above -3 dB. Standard DAW convention.
   */
  private levelColorClass(db: number): string {
    if (db > -3) return mixer.meterRed
    if (db > -12) return mixer.meterYellow
    return mixer.meterGreen
  }

  private formatPan(pan: number): string {
    const val = Math.round(pan * 100)
    if (val === 0) return 'C'
    return val < 0 ? `L${Math.abs(val)}` : `R${val}`
  }

  private handleVolume(e: Event): void {
    const value = Number((e.target as HTMLInputElement).value)
    this.dispatchEvent(
      new CustomEvent('mixer-volume', {
        bubbles: true,
        detail: { id: this.channelId, volume: value },
      }),
    )
  }

  private handlePan(e: Event): void {
    const value = Number((e.target as HTMLInputElement).value)
    this.dispatchEvent(
      new CustomEvent('mixer-pan', {
        bubbles: true,
        detail: { id: this.channelId, pan: value / 100 },
      }),
    )
  }

  private handleMute(): void {
    this.dispatchEvent(
      new CustomEvent('mixer-mute', {
        bubbles: true,
        detail: { id: this.channelId, muted: !this.muted },
      }),
    )
  }

  private handleSolo(): void {
    this.dispatchEvent(
      new CustomEvent('mixer-solo', {
        bubbles: true,
        detail: { id: this.channelId, soloed: !this.soloed },
      }),
    )
  }

  render() {
    const panDisplay = Math.round(this.pan * 100)
    const meterHeight = this.levelToHeight(this.level)
    const meterColor = this.levelColorClass(this.level)

    return html`
      <div class="${mixer.channel}">
        <div class="${mixer.channelName}">${this.name}</div>
        <div class="${mixer.meterRow} mt-2">
          <div class="flex-1">
            <div class="${mixer.controlRow}">
              <span class="${mixer.label}">Vol</span>
              <input
                type="range"
                class="${mixer.slider}"
                min="0"
                max="100"
                .value=${String(this.volume)}
                @input=${this.handleVolume}
                aria-label="Volume"
              />
              <span class="${mixer.value}">${this.volume}</span>
            </div>
            <div class="${mixer.controlRow} mt-1">
              <span class="${mixer.label}">Pan</span>
              <input
                type="range"
                class="${mixer.slider}"
                min="-100"
                max="100"
                .value=${String(panDisplay)}
                @input=${this.handlePan}
                aria-label="Pan"
              />
              <span class="${mixer.value}">${this.formatPan(this.pan)}</span>
            </div>
          </div>
          <div
            class="${mixer.meterContainer}"
            role="meter"
            aria-label="${this.name} level"
            aria-valuenow=${Number.isFinite(this.level) ? String(this.level) : '-Infinity'}
            aria-valuemin="-60"
            aria-valuemax="0"
          >
            <div
              class="${mixer.meterFill} ${meterColor}"
              style="height: ${meterHeight}%"
            ></div>
          </div>
        </div>
        <div class="${mixer.buttonRow}">
          <button
            class="${this.muted ? mixer.muteBtnActive : mixer.muteBtn}"
            @click=${this.handleMute}
            aria-label="Mute"
          >M</button>
          <button
            class="${this.soloed ? mixer.soloBtnActive : mixer.soloBtn}"
            @click=${this.handleSolo}
            aria-label="Solo"
          >S</button>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sf-channel-strip': SfChannelStrip
  }
}
