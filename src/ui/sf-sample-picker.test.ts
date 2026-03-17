import { afterEach, describe, expect, it, vi } from 'vitest'
import './sf-sample-picker'
import { SfSamplePicker } from './sf-sample-picker'

function createElement(): SfSamplePicker {
  const el = document.createElement('sf-sample-picker') as SfSamplePicker
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('sf-sample-picker', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('sf-sample-picker')).toBe(SfSamplePicker)
  })

  it('renders with light DOM', () => {
    const el = createElement()
    expect(el.shadowRoot).toBeNull()
  })

  it('renders nothing when closed', async () => {
    const el = createElement()
    await el.updateComplete
    expect(el.querySelector('[aria-label="Search samples"]')).toBeNull()
  })

  it('renders overlay when opened via show()', async () => {
    const el = createElement()
    el.show('piano-1', 'acoustic_grand_piano')
    await el.updateComplete
    expect(el.querySelector('[aria-label="Search samples"]')).not.toBeNull()
    expect(el.textContent).toContain('Change Sample')
  })

  it('renders all GM categories', async () => {
    const el = createElement()
    el.show('piano-1', 'acoustic_grand_piano')
    await el.updateComplete
    const categories = el.querySelectorAll('[data-category]')
    expect(categories.length).toBe(11) // No drums in picker
  })

  it('highlights current sample', async () => {
    const el = createElement()
    el.show('piano-1', 'acoustic_grand_piano')
    await el.updateComplete
    const currentItem = el.querySelector('[data-sample="acoustic_grand_piano"]')
    expect(currentItem?.className).toContain('primary')
  })

  it('filters instruments by search', async () => {
    const el = createElement()
    el.show('piano-1', 'acoustic_grand_piano')
    await el.updateComplete

    const search = el.querySelector('[aria-label="Search samples"]') as HTMLInputElement
    search.value = 'trumpet'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    await el.updateComplete

    const items = el.querySelectorAll('[data-sample]')
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      const text = item.textContent?.toLowerCase() ?? ''
      const sample = (item as HTMLElement).dataset.sample?.toLowerCase() ?? ''
      const category =
        item.closest('[data-category]')?.getAttribute('data-category')?.toLowerCase() ?? ''
      expect(
        text.includes('trumpet') || sample.includes('trumpet') || category.includes('trumpet'),
      ).toBe(true)
    }
  })

  it('dispatches sample-select event on item click', async () => {
    const el = createElement()
    el.show('piano-1', 'acoustic_grand_piano')
    await el.updateComplete

    const handler = vi.fn()
    el.addEventListener('sample-select', handler)

    const violin = el.querySelector('[data-sample="violin"]') as HTMLElement
    violin.click()
    await el.updateComplete

    expect(handler).toHaveBeenCalledTimes(1)
    const detail = handler.mock.calls[0][0].detail
    expect(detail.instrumentId).toBe('piano-1')
    expect(detail.sample).toBe('violin')
  })

  it('closes after selection', async () => {
    const el = createElement()
    el.show('piano-1', 'acoustic_grand_piano')
    await el.updateComplete

    const violin = el.querySelector('[data-sample="violin"]') as HTMLElement
    violin.click()
    await el.updateComplete

    expect(el.querySelector('[aria-label="Search samples"]')).toBeNull()
  })

  it('dispatches sample-preview event on preview button click', async () => {
    const el = createElement()
    el.show('piano-1', 'acoustic_grand_piano')
    await el.updateComplete

    const handler = vi.fn()
    el.addEventListener('sample-preview', handler)

    const previewBtn = el.querySelector('[aria-label="Preview Violin"]') as HTMLButtonElement
    previewBtn.click()

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0].detail.sample).toBe('violin')
  })

  it('preview click does not trigger selection', async () => {
    const el = createElement()
    el.show('piano-1', 'acoustic_grand_piano')
    await el.updateComplete

    const selectHandler = vi.fn()
    el.addEventListener('sample-select', selectHandler)

    const previewBtn = el.querySelector('[aria-label="Preview Violin"]') as HTMLButtonElement
    previewBtn.click()

    expect(selectHandler).not.toHaveBeenCalled()
  })

  it('closes on close button click', async () => {
    const el = createElement()
    el.show('piano-1', 'acoustic_grand_piano')
    await el.updateComplete

    const closeBtn = el.querySelector('[aria-label="Close picker"]') as HTMLButtonElement
    closeBtn.click()
    await el.updateComplete

    expect(el.querySelector('[aria-label="Search samples"]')).toBeNull()
  })

  it('closes on overlay background click', async () => {
    const el = createElement()
    el.show('piano-1', 'acoustic_grand_piano')
    await el.updateComplete

    // Click the overlay itself (not the panel)
    const overlay = el.firstElementChild as HTMLElement
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await el.updateComplete

    expect(el.querySelector('[aria-label="Search samples"]')).toBeNull()
  })

  it('resets search when reopened', async () => {
    const el = createElement()
    el.show('piano-1', 'acoustic_grand_piano')
    await el.updateComplete

    const search = el.querySelector('[aria-label="Search samples"]') as HTMLInputElement
    search.value = 'trumpet'
    search.dispatchEvent(new Event('input', { bubbles: true }))

    el.close()
    await el.updateComplete
    el.show('bass-1', 'acoustic_bass')
    await el.updateComplete

    const searchAfter = el.querySelector('[aria-label="Search samples"]') as HTMLInputElement
    expect(searchAfter.value).toBe('')
  })
})
