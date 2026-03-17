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

  createRenderRoot() {
    return this
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

    return html`
      <div class="${mixer.channel}">
        <div class="${mixer.channelName}">${this.name}</div>
        <div class="${mixer.controlRow} mt-2">
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
