import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
  DRUM_HITS,
  type DrumHit,
  type GMCategory,
  type GMInstrument,
  GM_CATEGORIES,
  getByCategory,
} from '../data/gm-instruments'
import { SampleAuditioner } from '../engine/SampleAuditioner'
import type { Unsubscribe } from '../stores/Store'
import { uiStore } from '../stores/UIStore'
import { explorer } from '../styles/components'
import './sf-keyboard'

@customElement('sf-sample-explorer')
export class SfSampleExplorer extends LitElement {
  @state() private collapsed = true
  @state() private searchQuery = ''
  @state() private velocity = 100
  @state() private activeSample: string | null = null
  @state() private loadingSample: string | null = null
  @state() private keyboardEnabled = false

  private auditioner?: SampleAuditioner
  private unsubscribe?: Unsubscribe

  createRenderRoot() {
    return this
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.collapsed = uiStore.state.explorerCollapsed

    this.unsubscribe = uiStore.subscribe((state) => {
      this.collapsed = state.explorerCollapsed
    })

    if (!this.auditioner) {
      this.auditioner = new SampleAuditioner()
    }

    this.auditioner.setOnStateChange((auditionerState, sample) => {
      if (auditionerState === 'ready' && sample) {
        this.keyboardEnabled = true
        this.activeSample = sample
        this.loadingSample = null
      } else if (auditionerState === 'loading') {
        this.keyboardEnabled = false
        this.loadingSample = this.auditioner?.activeSample ?? null
      } else {
        this.keyboardEnabled = false
        this.loadingSample = null
      }
    })
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unsubscribe?.()
    this.auditioner?.dispose()
  }

  getAuditioner(): SampleAuditioner | undefined {
    return this.auditioner
  }

  private get normalizedVelocity(): number {
    return this.velocity / 127
  }

  private handleToggle(): void {
    uiStore.toggleExplorer()
  }

  private handleSearch(e: Event): void {
    this.searchQuery = (e.target as HTMLInputElement).value
  }

  private handleVelocity(e: Event): void {
    this.velocity = Number((e.target as HTMLInputElement).value)
  }

  private async handleInstrumentClick(inst: GMInstrument): Promise<void> {
    if (!this.auditioner) return
    this.activeSample = inst.sample
    await this.auditioner.loadSample(inst.sample)

    if (this.auditioner.activeSample === inst.sample) {
      this.auditioner.play('C4', '8n', this.normalizedVelocity)
    }
  }

  private handleDrumClick(hit: DrumHit): void {
    if (!this.auditioner) return
    this.activeSample = hit
    this.keyboardEnabled = false
    this.auditioner.playDrum(hit, this.normalizedVelocity)
  }

  private matchesSearch(text: string): boolean {
    if (!this.searchQuery) return true
    const query = this.searchQuery.toLowerCase()
    return text.toLowerCase().includes(query)
  }

  render() {
    return html`
      <div class="${explorer.container}">
        <div class="${explorer.header}" @click=${this.handleToggle}>
          <h2 class="${explorer.heading}">Sample Explorer</h2>
          <span class="${explorer.toggle}">${this.collapsed ? 'Show' : 'Hide'}</span>
        </div>
        ${this.collapsed ? '' : this.renderContent()}
      </div>
    `
  }

  private renderContent() {
    return html`
      <div class="${explorer.content}">
        <div class="${explorer.controls}">
          <input
            type="text"
            class="${explorer.search}"
            placeholder="Search instruments..."
            .value=${this.searchQuery}
            @input=${this.handleSearch}
            aria-label="Search instruments"
          />
          <div class="${explorer.velRow}">
            <span class="${explorer.velLabel}">Vel</span>
            <input
              type="range"
              class="${explorer.velSlider}"
              min="1"
              max="127"
              .value=${String(this.velocity)}
              @input=${this.handleVelocity}
              aria-label="Velocity"
            />
            <span class="${explorer.velValue}">${this.velocity}</span>
          </div>
        </div>
        <div class="${explorer.grid}">
          ${GM_CATEGORIES.map((cat) => this.renderCategory(cat))}
          ${this.renderDrums()}
        </div>
        <sf-keyboard
          .auditioner=${this.auditioner}
          .enabled=${this.keyboardEnabled}
          .activeSample=${this.activeSample}
        ></sf-keyboard>
      </div>
    `
  }

  private renderCategory(category: GMCategory) {
    const instruments = getByCategory(category)
    const filtered = instruments.filter(
      (inst) => this.matchesSearch(inst.name) || this.matchesSearch(inst.sample),
    )

    if (filtered.length === 0 && !this.matchesSearch(category)) return ''

    const visibleInstruments = this.matchesSearch(category) ? instruments : filtered

    return html`
      <div class="${explorer.category}" data-category="${category}">
        <h3 class="${explorer.categoryHeading}">${category}</h3>
        <div class="${explorer.instrumentList}">
          ${visibleInstruments.map((inst) => this.renderInstrumentBtn(inst))}
        </div>
      </div>
    `
  }

  private renderInstrumentBtn(inst: GMInstrument) {
    const isActive = this.activeSample === inst.sample
    const isLoading = this.loadingSample === inst.sample
    const cls = isLoading
      ? explorer.instrumentBtnLoading
      : isActive
        ? explorer.instrumentBtnActive
        : explorer.instrumentBtn

    return html`
      <button
        class="${cls}"
        data-sample="${inst.sample}"
        @click=${() => this.handleInstrumentClick(inst)}
      >${inst.name}</button>
    `
  }

  private renderDrums() {
    const matchesDrums = this.matchesSearch('drums') || DRUM_HITS.some((h) => this.matchesSearch(h))
    if (!matchesDrums) return ''

    return html`
      <div class="${explorer.category}" data-category="Drums">
        <h3 class="${explorer.categoryHeading}">Drums</h3>
        <div class="${explorer.instrumentList}">
          ${DRUM_HITS.filter((hit) => this.matchesSearch(hit) || this.matchesSearch('drums')).map(
            (hit) => {
              const isActive = this.activeSample === hit
              const cls = isActive ? explorer.drumBtnActive : explorer.drumBtn
              return html`
                <button
                  class="${cls}"
                  data-drum-hit="${hit}"
                  @click=${() => this.handleDrumClick(hit as DrumHit)}
                >${hit}</button>
              `
            },
          )}
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sf-sample-explorer': SfSampleExplorer
  }
}
