import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { engine } from '../engine/instance'
import type { SonicForgeComposition } from '../schema/composition'
import { mixerStore } from '../stores/MixerStore'
import { bridgeCompositionToStores, createMixerSink } from '../stores/bridge'
import { surface, text } from '../styles/components'
import './sf-arrangement'
import './sf-composition-loader'
import './sf-mixer'
import './sf-sample-explorer'
import './sf-sample-picker'
import './sf-transport-bar'
import type { SfArrangement } from './sf-arrangement'

@customElement('sf-app')
export class SfApp extends LitElement {
  @state() private compositionInfo: SonicForgeComposition | null = null

  private boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e)

  createRenderRoot() {
    return this
  }

  connectedCallback(): void {
    super.connectedCallback()
    document.addEventListener('keydown', this.boundKeyDown)
    this.autoLoadFromUrl()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('keydown', this.boundKeyDown)
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code !== 'Space' || e.target !== document.body) return
    e.preventDefault()
    if (engine.state === 'playing') {
      engine.pause()
    } else if (engine.state === 'ready' || engine.state === 'paused') {
      engine.play()
    }
  }

  private async autoLoadFromUrl(): Promise<void> {
    const params = new URLSearchParams(window.location.search)
    const loadPath = params.get('load')
    if (!loadPath) return

    try {
      const response = await fetch(loadPath)
      if (!response.ok) return
      const json = await response.text()
      await this.loadComposition(json)
    } catch {
      // Silently fail for auto-load
    }
  }

  private async handleCompositionLoad(e: CustomEvent<{ json: string }>): Promise<void> {
    await this.loadComposition(e.detail.json)
  }

  private async loadComposition(json: string): Promise<void> {
    try {
      await engine.load(json)

      const composition = engine.getComposition()
      if (!composition) return

      // Bridge engine state to stores
      bridgeCompositionToStores(composition, engine.getMixBus())

      // Wire mixer store actions back to engine
      mixerStore.setSink(createMixerSink(engine.getMixBus()))

      // Load arrangement with section data
      const transport = engine.getTransport()
      const arrangement = this.querySelector('sf-arrangement') as SfArrangement | null
      arrangement?.loadSections(transport.getSectionOffsets(), transport.getTotalBars())

      this.compositionInfo = composition
    } catch {
      // Errors handled by engine callbacks → bridge → console
    }
  }

  private handleSeek(e: CustomEvent<{ sectionIndex: number }>): void {
    engine.seekToSection(e.detail.sectionIndex)
  }

  private handleLoop(e: CustomEvent<{ sectionIndex: number | null }>): void {
    engine.setLoopSection(e.detail.sectionIndex)
  }

  private handleSampleSelect(e: CustomEvent<{ instrumentId: string; sample: string }>): void {
    engine.swapSample(e.detail.instrumentId, e.detail.sample)
  }

  private handleSamplePreview(e: CustomEvent<{ sample: string }>): void {
    const explorer = this.querySelector('sf-sample-explorer')
    const auditioner = explorer?.getAuditioner()
    if (auditioner) {
      auditioner.loadSample(e.detail.sample).then(() => {
        auditioner.play('C4', '8n', 0.8)
      })
    }
  }

  render() {
    return html`
      <div
        class="${surface.base} min-h-screen"
        @composition-load=${this.handleCompositionLoad}
        @arrangement-seek=${this.handleSeek}
        @arrangement-loop=${this.handleLoop}
        @sample-select=${this.handleSampleSelect}
        @sample-preview=${this.handleSamplePreview}
      >
        <sf-transport-bar></sf-transport-bar>
        <sf-arrangement></sf-arrangement>
        ${this.renderCompositionInfo()}
        <sf-mixer></sf-mixer>
        <sf-sample-explorer></sf-sample-explorer>
        <sf-composition-loader></sf-composition-loader>
        <sf-sample-picker></sf-sample-picker>
      </div>
    `
  }

  private renderCompositionInfo() {
    if (!this.compositionInfo) return ''
    const { metadata, instruments, sections } = this.compositionInfo
    return html`
      <div class="px-4 py-3 border-b border-border">
        <h2 class="${text.heading} text-lg">${metadata.title}</h2>
        <div class="${text.muted} text-sm mt-1">
          ${metadata.bpm} BPM · ${metadata.key} · ${metadata.timeSignature[0]}/${metadata.timeSignature[1]}
          ${metadata.description ? html` · ${metadata.description}` : ''}
        </div>
        <div class="${text.muted} text-xs mt-1">
          ${instruments.map((i) => i.name).join(', ')} · ${sections.map((s) => s.name).join(' → ')}
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sf-app': SfApp
  }
}
