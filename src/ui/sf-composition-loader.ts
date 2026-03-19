import { LitElement, html, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { btn, explorer, input, loader, state as stateStyles } from '../styles/components'

@customElement('sf-composition-loader')
export class SfCompositionLoader extends LitElement {
  @state() private error: string | null = null
  @state() private dragging = false
  @state() private expanded = false

  createRenderRoot() {
    return this
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.boundCloseOnOutsideClick = this.closeOnOutsideClick.bind(this)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('mousedown', this.boundCloseOnOutsideClick)
    document.removeEventListener('keydown', this.boundCloseOnEscape)
  }

  private boundCloseOnOutsideClick: (e: MouseEvent) => void = () => {}
  private boundCloseOnEscape: (e: KeyboardEvent) => void = (e) => {
    if (e.key === 'Escape') this.collapse()
  }

  private get textarea(): HTMLTextAreaElement | null {
    return this.querySelector<HTMLTextAreaElement>('textarea')
  }

  private get fileInput(): HTMLInputElement | null {
    return this.querySelector<HTMLInputElement>('input[type="file"]')
  }

  private toggleExpanded(): void {
    if (this.expanded) {
      this.collapse()
    } else {
      this.expanded = true
      document.addEventListener('mousedown', this.boundCloseOnOutsideClick)
      document.addEventListener('keydown', this.boundCloseOnEscape)
    }
  }

  private collapse(): void {
    this.expanded = false
    document.removeEventListener('mousedown', this.boundCloseOnOutsideClick)
    document.removeEventListener('keydown', this.boundCloseOnEscape)
  }

  private closeOnOutsideClick(e: MouseEvent): void {
    if (!this.contains(e.target as Node)) {
      this.collapse()
    }
  }

  private handleLoad(): void {
    const json = this.textarea?.value.trim()
    if (!json) {
      this.error = 'Please paste a composition JSON'
      return
    }
    this.parseAndLoad(json)
  }

  private handleFile(file: File): void {
    const reader = new FileReader()
    reader.onload = () => {
      const json = reader.result as string
      if (this.textarea) this.textarea.value = json
      this.parseAndLoad(json)
    }
    reader.onerror = () => {
      this.error = 'Failed to read file'
    }
    reader.readAsText(file)
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault()
    this.dragging = false
    const file = e.dataTransfer?.files[0]
    if (file) this.handleFile(file)
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault()
    this.dragging = true
  }

  private handleDragLeave(): void {
    this.dragging = false
  }

  private parseAndLoad(json: string): void {
    try {
      JSON.parse(json) // Validate it's valid JSON first
      this.error = null
      this.collapse()
      this.dispatchEvent(
        new CustomEvent('composition-load', {
          bubbles: true,
          detail: { json },
        }),
      )
    } catch (e) {
      if (e instanceof SyntaxError) {
        this.error = `Invalid JSON: ${e.message}`
      } else {
        this.error = 'An unexpected error occurred'
      }
    }
  }

  render() {
    return html`
      <div
        class="${explorer.container} relative"
        @dragover=${this.handleDragOver}
        @dragleave=${this.handleDragLeave}
        @drop=${this.handleDrop}
      >
        <div class="${explorer.header}">
          <h2 class="${explorer.heading}">Load Composition</h2>
          <div class="flex items-center gap-2">
            <button class=${btn.ghost} @click=${(e: Event) => {
              e.stopPropagation()
              this.fileInput?.click()
            }}>Upload File</button>
            <input
              type="file"
              accept=".json"
              class="hidden"
              @change=${(e: Event) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) this.handleFile(file)
              }}
            />
            <span class="${explorer.toggle}" @click=${this.toggleExpanded}>
              ${this.expanded ? 'Hide' : 'Show'}
            </span>
          </div>
        </div>
        ${this.expanded ? this.renderPopover() : nothing}
        ${
          this.dragging
            ? html`<div class=${loader.dropzone}>
              <span class=${loader.dropzoneText}>Drop JSON file here</span>
            </div>`
            : nothing
        }
      </div>
    `
  }

  private renderPopover() {
    return html`
      <div class="absolute bottom-full left-0 right-0 mb-1 bg-surface-elevated border border-border rounded-lg shadow-lg p-4 z-40"
        @mousedown=${(e: Event) => e.stopPropagation()}
      >
        <textarea
          class="${input.textarea} w-full mb-3"
          rows="8"
          placeholder="Paste composition JSON here..."
        ></textarea>
        <div class="flex gap-2">
          <button class=${btn.primary} @click=${this.handleLoad}>Load & Play</button>
        </div>
        ${
          this.error
            ? html`<pre class="${stateStyles.error} text-sm whitespace-pre-wrap mt-3">${this.error}</pre>`
            : nothing
        }
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sf-composition-loader': SfCompositionLoader
  }
}
