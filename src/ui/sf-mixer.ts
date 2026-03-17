import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import type { ChannelState } from '../stores/MixerStore'
import { mixerStore } from '../stores/MixerStore'
import type { Unsubscribe } from '../stores/Store'
import { mixer } from '../styles/components'
import './sf-channel-strip'

@customElement('sf-mixer')
export class SfMixer extends LitElement {
  @state() private channels: ChannelState[] = []
  @state() private masterVolume = 80

  private unsubscribe?: Unsubscribe

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
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unsubscribe?.()
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
              ></sf-channel-strip>
            `,
          )}
          ${this.renderMaster()}
        </div>
      </div>
    `
  }

  private renderMaster() {
    return html`
      <div class="${mixer.master}">
        <div class="${mixer.masterLabel}">Master</div>
        <div class="${mixer.controlRow} mt-2">
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
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sf-mixer': SfMixer
  }
}
