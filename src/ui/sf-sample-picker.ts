import { LitElement, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import {
  type GMCategory,
  type GMInstrument,
  GM_CATEGORIES,
  getByCategory,
} from '../data/gm-instruments'
import { picker } from '../styles/components'

@customElement('sf-sample-picker')
export class SfSamplePicker extends LitElement {
  @property() instrumentId = ''
  @property() currentSample = ''

  @state() private open = false
  @state() private searchQuery = ''
  @state() private previewingItem: string | null = null

  createRenderRoot() {
    return this
  }

  show(instrumentId: string, currentSample: string): void {
    this.instrumentId = instrumentId
    this.currentSample = currentSample
    this.searchQuery = ''
    this.open = true
  }

  close(): void {
    this.open = false
    this.previewingItem = null
  }

  private handleOverlayClick(e: Event): void {
    if (e.target === e.currentTarget) {
      this.close()
    }
  }

  private handleSearch(e: Event): void {
    this.searchQuery = (e.target as HTMLInputElement).value
  }

  private handleSelect(inst: GMInstrument): void {
    this.dispatchEvent(
      new CustomEvent('sample-select', {
        bubbles: true,
        detail: { instrumentId: this.instrumentId, sample: inst.sample },
      }),
    )
    this.close()
  }

  private handlePreview(e: Event, inst: GMInstrument): void {
    e.stopPropagation()
    this.previewingItem = inst.sample
    this.dispatchEvent(
      new CustomEvent('sample-preview', {
        bubbles: true,
        detail: { sample: inst.sample },
      }),
    )
  }

  private matchesSearch(text: string): boolean {
    if (!this.searchQuery) return true
    return text.toLowerCase().includes(this.searchQuery.toLowerCase())
  }

  render() {
    if (!this.open) return ''

    return html`
      <div class="${picker.overlay}" @click=${this.handleOverlayClick}>
        <div class="${picker.panel}">
          <div class="${picker.header}">
            <span class="${picker.heading}">Change Sample</span>
            <button
              class="${picker.closeBtn}"
              @click=${() => this.close()}
              aria-label="Close picker"
            >x</button>
          </div>
          <input
            type="text"
            class="${picker.search}"
            placeholder="Search..."
            .value=${this.searchQuery}
            @input=${this.handleSearch}
            aria-label="Search samples"
          />
          <div class="${picker.list}">
            ${GM_CATEGORIES.map((cat) => this.renderCategory(cat))}
          </div>
        </div>
      </div>
    `
  }

  private renderCategory(category: GMCategory) {
    const instruments = getByCategory(category)
    const filtered = instruments.filter(
      (inst) => this.matchesSearch(inst.name) || this.matchesSearch(inst.sample),
    )

    if (filtered.length === 0 && !this.matchesSearch(category)) return ''

    const visible = this.matchesSearch(category) ? instruments : filtered

    return html`
      <div class="${picker.category}" data-category="${category}">
        <div class="${picker.categoryLabel}">${category}</div>
        ${visible.map((inst) => this.renderItem(inst))}
      </div>
    `
  }

  private renderItem(inst: GMInstrument) {
    const isCurrent = inst.sample === this.currentSample
    const cls = isCurrent ? picker.itemCurrent : picker.item

    return html`
      <div
        class="${cls}"
        data-sample="${inst.sample}"
        @click=${() => this.handleSelect(inst)}
      >
        <span>${inst.name}</span>
        <button
          class="${picker.previewBtn}"
          @click=${(e: Event) => this.handlePreview(e, inst)}
          aria-label="Preview ${inst.name}"
        >${this.previewingItem === inst.sample ? '...' : 'Preview'}</button>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sf-sample-picker': SfSamplePicker
  }
}
