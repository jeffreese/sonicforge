import { GM_CATEGORIES, GM_INSTRUMENTS } from '../data/gm-instruments'
import type { SampleAuditioner } from '../engine/SampleAuditioner'

export interface SamplePickerCallbacks {
  onSelect: (instrumentId: string, newSample: string) => void
}

/**
 * Dropdown sample picker for swapping instrument samples in a loaded composition.
 * Attaches to a mixer channel name element.
 */
export class SamplePicker {
  private overlay: HTMLElement | null = null
  private auditioner: SampleAuditioner
  private callbacks: SamplePickerCallbacks

  constructor(auditioner: SampleAuditioner, callbacks: SamplePickerCallbacks) {
    this.auditioner = auditioner
    this.callbacks = callbacks
  }

  /** Open the picker anchored near the given element. */
  open(_anchor: HTMLElement, instrumentId: string, currentSample: string): void {
    this.close()

    this.overlay = document.createElement('div')
    this.overlay.className = 'sample-picker-overlay'
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close()
    })

    const panel = document.createElement('div')
    panel.className = 'sample-picker-panel'

    const heading = document.createElement('div')
    heading.className = 'picker-heading'
    heading.textContent = 'Change Sample'

    const closeBtn = document.createElement('button')
    closeBtn.className = 'picker-close'
    closeBtn.textContent = 'x'
    closeBtn.addEventListener('click', () => this.close())
    heading.append(closeBtn)

    // Search
    const search = document.createElement('input')
    search.type = 'text'
    search.placeholder = 'Search...'
    search.className = 'picker-search'
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase()
      const items = panel.querySelectorAll<HTMLElement>('.picker-item')
      const cats = panel.querySelectorAll<HTMLElement>('.picker-category')

      for (const item of items) {
        const match = !q || item.textContent?.toLowerCase().includes(q)
        item.style.display = match ? '' : 'none'
      }
      for (const cat of cats) {
        const anyVisible = cat.querySelector('.picker-item:not([style*="display: none"])')
        cat.style.display = anyVisible ? '' : 'none'
      }
    })

    const list = document.createElement('div')
    list.className = 'picker-list'

    for (const category of GM_CATEGORIES) {
      const catEl = document.createElement('div')
      catEl.className = 'picker-category'

      const catLabel = document.createElement('div')
      catLabel.className = 'picker-cat-label'
      catLabel.textContent = category
      catEl.append(catLabel)

      const instruments = GM_INSTRUMENTS.filter((i) => i.category === category)
      for (const inst of instruments) {
        const item = document.createElement('div')
        item.className = 'picker-item'
        if (inst.sample === currentSample) item.classList.add('current')

        const name = document.createElement('span')
        name.textContent = inst.name

        const previewBtn = document.createElement('button')
        previewBtn.className = 'picker-preview-btn'
        previewBtn.textContent = 'Preview'
        previewBtn.addEventListener('click', async (e) => {
          e.stopPropagation()
          previewBtn.textContent = '...'
          await this.auditioner.loadSample(inst.sample)
          previewBtn.textContent = 'Preview'
          this.auditioner.play('C4', '8n', 0.8)
        })

        item.append(name, previewBtn)
        item.addEventListener('click', () => {
          this.callbacks.onSelect(instrumentId, inst.sample)
          this.close()
        })

        catEl.append(item)
      }

      list.append(catEl)
    }

    panel.append(heading, search, list)
    this.overlay.append(panel)
    document.body.append(this.overlay)

    // Focus search
    requestAnimationFrame(() => search.focus())
  }

  close(): void {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
  }
}
