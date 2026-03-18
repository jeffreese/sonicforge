import { LitElement, html, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { btn, input, loader, panel, state as stateStyles } from '../styles/components'

@customElement('sf-composition-loader')
export class SfCompositionLoader extends LitElement {
  @state() private error: string | null = null
  @state() private dragging = false

  createRenderRoot() {
    return this
  }

  private get textarea(): HTMLTextAreaElement | null {
    return this.querySelector<HTMLTextAreaElement>('textarea')
  }

  private get fileInput(): HTMLInputElement | null {
    return this.querySelector<HTMLInputElement>('input[type="file"]')
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
        class="${panel.base} relative"
        @dragover=${this.handleDragOver}
        @dragleave=${this.handleDragLeave}
        @drop=${this.handleDrop}
      >
        <div class="${panel.header}">Load Composition</div>
        <div class="${panel.body}">
          <textarea
            class="${input.textarea} w-full mb-3"
            rows="12"
            placeholder="Paste composition JSON here..."
          ></textarea>
          <div class="flex gap-2 mb-3">
            <button class=${btn.primary} @click=${this.handleLoad}>Load & Play</button>
            <button class=${btn.ghost} @click=${() => this.fileInput?.click()}>Upload File</button>
            <input
              type="file"
              accept=".json"
              class="hidden"
              @change=${(e: Event) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) this.handleFile(file)
              }}
            />
          </div>
          ${
            this.error
              ? html`<pre class="${stateStyles.error} text-sm whitespace-pre-wrap">${this.error}</pre>`
              : nothing
          }
        </div>
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
}

declare global {
  interface HTMLElementTagNameMap {
    'sf-composition-loader': SfCompositionLoader
  }
}
