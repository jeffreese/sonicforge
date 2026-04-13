import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { engine } from '../engine/instance'
import type { SonicForgeComposition } from '../schema/composition'
import { mixerStore } from '../stores/MixerStore'
import { bridgeCompositionToStores, createMixerSink } from '../stores/bridge'
import { app, text } from '../styles/components'
import './sf-arrangement'
import './sf-composition-loader'
import './sf-mixer'
import './sf-sample-explorer'
import './sf-sample-picker'
import './sf-transport-bar'
import type { SfArrangement } from './sf-arrangement'
import type { SfTransportBar } from './sf-transport-bar'

const FOOTER_MIN = 180
const ARRANGEMENT_MIN = 150
const HANDLE_HEIGHT = 6
const STORAGE_KEY = 'sf-footer-height'

@customElement('sf-app')
export class SfApp extends LitElement {
  @state() private compositionInfo: SonicForgeComposition | null = null
  @state() private footerHeight = Number(localStorage.getItem(STORAGE_KEY)) || 240
  @state() private isDragging = false

  private boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e)
  private boundMouseMove = (e: MouseEvent) => this.handleResizeMove(e)
  private boundMouseUp = () => this.handleResizeEnd()

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
    if (this.isDragging) {
      this.isDragging = false
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', this.boundMouseMove)
      document.removeEventListener('mouseup', this.boundMouseUp)
    }
  }

  private handleResizeStart(e: MouseEvent): void {
    e.preventDefault()
    this.isDragging = true
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'row-resize'
    document.addEventListener('mousemove', this.boundMouseMove)
    document.addEventListener('mouseup', this.boundMouseUp)
  }

  private handleResizeMove(e: MouseEvent): void {
    if (!this.isDragging) return
    const header = this.querySelector(`.${app.header.split(' ')[0]}`) as HTMLElement | null
    const headerHeight = header?.offsetHeight ?? 0
    const maxFooter = window.innerHeight - headerHeight - HANDLE_HEIGHT - ARRANGEMENT_MIN
    const newHeight = window.innerHeight - e.clientY
    this.footerHeight = Math.max(FOOTER_MIN, Math.min(maxFooter, newHeight))
  }

  private handleResizeEnd(): void {
    this.isDragging = false
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    document.removeEventListener('mousemove', this.boundMouseMove)
    document.removeEventListener('mouseup', this.boundMouseUp)
    localStorage.setItem(STORAGE_KEY, String(Math.round(this.footerHeight)))
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.target !== document.body) return

    if (e.code === 'Space') {
      e.preventDefault()
      if (engine.state === 'playing') {
        engine.pause()
      } else if (engine.state === 'ready' || engine.state === 'paused') {
        engine.play()
      }
    } else if (e.code === 'KeyE' && !engine.isExporting) {
      e.preventDefault()
      this.handleCompositionExport()
    } else if (e.code === 'KeyF') {
      const arr = this.querySelector('sf-arrangement') as SfArrangement | null
      arr?.scrollToPlayhead()
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
      mixerStore.setSink(createMixerSink(engine.getMixBus(), engine))

      // Load arrangement with section data and position source
      const transport = engine.getTransport()
      const arrangement = this.querySelector('sf-arrangement') as SfArrangement | null
      arrangement?.loadSections(transport.getSectionOffsets(), transport.getTotalBars())
      arrangement?.setPositionSource(() => engine.getPositionBeats())

      this.compositionInfo = composition
    } catch {
      // Errors handled by engine callbacks → bridge → console
    }
  }

  private handleSeek(e: CustomEvent<{ sectionIndex: number }>): void {
    engine.seekToSection(e.detail.sectionIndex)
  }

  private handleSeekBeat(e: CustomEvent<{ beat: number }>): void {
    engine.seekToBeat(e.detail.beat)
  }

  private handleFollowToggle(): void {
    const arr = this.querySelector('sf-arrangement') as SfArrangement | null
    const tb = this.querySelector('sf-transport-bar') as SfTransportBar | null
    if (arr) {
      const newState = arr.toggleFollow()
      tb?.setFollow(newState)
    }
  }

  private handleLoop(e: CustomEvent<{ sectionIndex: number | null }>): void {
    engine.setLoopSection(e.detail.sectionIndex)
  }

  private async handleCompositionExport(): Promise<void> {
    const tb = this.querySelector('sf-transport-bar') as SfTransportBar | null
    tb?.setExporting(true)
    try {
      await engine.exportAudio()
    } catch (err) {
      console.error('[export]', err instanceof Error ? err.message : err)
    } finally {
      tb?.setExporting(false)
    }
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
        class="${app.shell}"
        @composition-load=${this.handleCompositionLoad}
        @arrangement-seek=${this.handleSeek}
        @arrangement-seek-beat=${this.handleSeekBeat}
        @arrangement-loop=${this.handleLoop}
        @sample-select=${this.handleSampleSelect}
        @sample-preview=${this.handleSamplePreview}
        @composition-export=${this.handleCompositionExport}
        @transport-follow-toggle=${this.handleFollowToggle}
      >
        <div class="${app.header}">
          <sf-transport-bar></sf-transport-bar>
          ${this.renderCompositionInfo()}
        </div>
        <sf-arrangement class="flex-1 min-h-0 flex flex-col" style="min-height:${ARRANGEMENT_MIN}px"></sf-arrangement>
        <div
          class="${this.isDragging ? app.resizeHandleActive : app.resizeHandle}"
          @mousedown=${this.handleResizeStart}
        ></div>
        <div class="${app.footer}" style="height:${this.footerHeight}px">
          <sf-mixer></sf-mixer>
          <sf-sample-explorer></sf-sample-explorer>
          <sf-composition-loader></sf-composition-loader>
          ${this.renderControlsLegend()}
        </div>
        <sf-sample-picker></sf-sample-picker>
      </div>
    `
  }

  private renderControlsLegend() {
    const key = app.controlsKey
    return html`
      <div class="${app.controlsLegend}">
        <span><span class="${key}">Space</span> play/pause</span>
        <span><span class="${key}">Scroll</span> pan</span>
        <span><span class="${key}">⌘+scroll</span> zoom time</span>
        <span><span class="${key}">⇧+scroll</span> zoom pitch</span>
        <span><span class="${key}">Click</span> seek</span>
        <span><span class="${key}">Dbl-click</span> loop section</span>
        <span><span class="${key}">E</span> export audio</span>
        <span><span class="${key}">F</span> go to playhead</span>
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
