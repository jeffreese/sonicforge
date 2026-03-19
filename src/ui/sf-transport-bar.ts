import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import type { EngineState } from '../engine/Engine'
import { engine } from '../engine/instance'
import type { Unsubscribe } from '../stores/Store'
import { transportStore } from '../stores/TransportStore'
import { btn, transport } from '../styles/components'

const statusLabels: Record<EngineState, string> = {
  empty: 'No composition loaded',
  loading: 'Loading samples…',
  ready: 'Ready',
  playing: 'Playing',
  paused: 'Paused',
}

@customElement('sf-transport-bar')
export class SfTransportBar extends LitElement {
  @state() private engineState: EngineState = 'empty'
  @state() private bar = 0
  @state() private beat = 0
  @state() private bpm = 120
  @state() private sectionName: string | null = null
  @state() private follow = true

  private unsubscribe?: Unsubscribe

  createRenderRoot() {
    return this
  }

  connectedCallback(): void {
    super.connectedCallback()
    const s = transportStore.state
    this.engineState = s.engineState
    this.bar = s.bar
    this.beat = s.beat
    this.bpm = s.bpm
    this.sectionName = s.sectionName

    this.unsubscribe = transportStore.subscribe((state) => {
      this.engineState = state.engineState
      this.bar = state.bar
      this.beat = state.beat
      this.bpm = state.bpm
      this.sectionName = state.sectionName
    })
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unsubscribe?.()
  }

  private handlePlay(): void {
    engine.play()
  }

  private handlePause(): void {
    engine.pause()
  }

  private handleStop(): void {
    engine.stop()
  }

  private handleFollowToggle(): void {
    this.dispatchEvent(new CustomEvent('transport-follow-toggle', { bubbles: true }))
  }

  /** Called by parent to sync follow state after arrangement toggles it. */
  setFollow(value: boolean): void {
    this.follow = value
  }

  private get positionText(): string {
    const text = `Bar ${this.bar + 1} | Beat ${this.beat + 1}`
    return this.sectionName ? `${this.sectionName} | ${text}` : text
  }

  render() {
    const s = this.engineState
    const playDisabled = s !== 'ready' && s !== 'paused'
    const pauseDisabled = s !== 'playing'
    const stopDisabled = s !== 'playing' && s !== 'paused'

    return html`
      <div class="${transport.bar}">
        <div class="flex items-center gap-1">
          <button
            class="${btn.icon}"
            ?disabled=${playDisabled}
            @click=${this.handlePlay}
            aria-label="Play"
          >▶</button>
          <button
            class="${btn.icon}"
            ?disabled=${pauseDisabled}
            @click=${this.handlePause}
            aria-label="Pause"
          >⏸</button>
          <button
            class="${btn.icon}"
            ?disabled=${stopDisabled}
            @click=${this.handleStop}
            aria-label="Stop"
          >⏹</button>
          <button
            class="${btn.icon}"
            @click=${this.handleFollowToggle}
            aria-label="Toggle follow playhead"
            title="Follow playhead"
            style="opacity: ${this.follow ? '1' : '0.4'}"
          >⤵</button>
        </div>
        <span class="${transport.position}">${this.positionText}</span>
        <span class="${transport.status}">${statusLabels[s]} | ${this.bpm} BPM</span>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sf-transport-bar': SfTransportBar
  }
}
