import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SonicForgeComposition } from '../schema/composition'
import './sf-composition-loader'
import { SfCompositionLoader } from './sf-composition-loader'

const validComposition: SonicForgeComposition = {
  version: '1.0',
  metadata: {
    title: 'Test Song',
    bpm: 120,
    timeSignature: [4, 4],
    key: 'C major',
  },
  instruments: [
    { id: 'piano', name: 'Piano', sample: 'acoustic_grand_piano', category: 'melodic' },
  ],
  sections: [
    {
      id: 'intro',
      name: 'Intro',
      bars: 4,
      tracks: [{ instrumentId: 'piano', notes: [] }],
    },
  ],
}

function createElement(): SfCompositionLoader {
  const el = document.createElement('sf-composition-loader') as SfCompositionLoader
  document.body.appendChild(el)
  return el
}

function getToggle(el: SfCompositionLoader): HTMLElement {
  const spans = el.querySelectorAll('span')
  for (const span of spans) {
    const text = span.textContent?.trim()
    if (text === 'Show' || text === 'Hide') return span
  }
  throw new Error('Toggle span not found')
}

async function expand(el: SfCompositionLoader): Promise<void> {
  getToggle(el).click()
  await el.updateComplete
}

function getTextarea(el: SfCompositionLoader): HTMLTextAreaElement {
  const ta = el.querySelector('textarea')
  expect(ta).not.toBeNull()
  return ta as HTMLTextAreaElement
}

function getLoadButton(el: SfCompositionLoader): HTMLButtonElement {
  const buttons = el.querySelectorAll('button')
  for (const b of buttons) {
    if (b.textContent?.trim() === 'Load & Play') return b
  }
  throw new Error('Load & Play button not found')
}

function getUploadButton(el: SfCompositionLoader): HTMLButtonElement {
  const buttons = el.querySelectorAll('button')
  for (const b of buttons) {
    if (b.textContent?.trim() === 'Upload File') return b
  }
  throw new Error('Upload File button not found')
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('sf-composition-loader', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('sf-composition-loader')).toBe(SfCompositionLoader)
  })

  it('renders with light DOM', () => {
    const el = createElement()
    expect(el.shadowRoot).toBeNull()
  })

  it('starts collapsed with header and upload button visible', async () => {
    const el = createElement()
    await el.updateComplete
    expect(el.querySelector('h2')?.textContent).toBe('Load Composition')
    expect(getUploadButton(el)).not.toBeNull()
    expect(el.querySelector('textarea')).toBeNull()
  })

  it('expands popover on toggle click to show textarea', async () => {
    const el = createElement()
    await el.updateComplete
    await expand(el)

    expect(el.querySelector('textarea')).not.toBeNull()
    expect(getLoadButton(el)).not.toBeNull()
  })

  it('collapses on second toggle click', async () => {
    const el = createElement()
    await el.updateComplete
    await expand(el)
    expect(el.querySelector('textarea')).not.toBeNull()

    getToggle(el).click()
    await el.updateComplete
    expect(el.querySelector('textarea')).toBeNull()
  })

  it('dispatches composition-load event with valid JSON', async () => {
    const el = createElement()
    await el.updateComplete
    await expand(el)

    const handler = vi.fn()
    el.addEventListener('composition-load', handler)

    getTextarea(el).value = JSON.stringify(validComposition)
    getLoadButton(el).click()

    expect(handler).toHaveBeenCalledOnce()
    const detail = handler.mock.calls[0][0].detail
    expect(JSON.parse(detail.json)).toEqual(validComposition)
  })

  it('collapses popover on successful load', async () => {
    const el = createElement()
    await el.updateComplete
    await expand(el)

    getTextarea(el).value = JSON.stringify(validComposition)
    getLoadButton(el).click()
    await el.updateComplete

    expect(el.querySelector('textarea')).toBeNull()
  })

  it('shows parse error for invalid JSON', async () => {
    const el = createElement()
    await el.updateComplete
    await expand(el)

    getTextarea(el).value = '{ not valid json'
    getLoadButton(el).click()

    await el.updateComplete
    const errorEl = el.querySelector('pre')
    expect(errorEl).not.toBeNull()
    expect(errorEl?.textContent).toContain('Invalid JSON')
  })

  it('shows error for empty textarea', async () => {
    const el = createElement()
    await el.updateComplete
    await expand(el)

    getTextarea(el).value = ''
    getLoadButton(el).click()

    await el.updateComplete
    const errorEl = el.querySelector('pre')
    expect(errorEl).not.toBeNull()
    expect(errorEl?.textContent).toBe('Please paste a composition JSON')
  })

  it('dispatches composition-load event via file upload', async () => {
    const el = createElement()
    await el.updateComplete

    const handler = vi.fn()
    el.addEventListener('composition-load', handler)

    const jsonStr = JSON.stringify(validComposition)
    const file = new File([jsonStr], 'test.json', { type: 'application/json' })

    const fileInput = el.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(fileInput, 'files', { value: [file], writable: false })
    fileInput.dispatchEvent(new Event('change'))

    // Wait for FileReader async callback
    await new Promise((r) => setTimeout(r, 50))

    expect(handler).toHaveBeenCalledOnce()
    expect(JSON.parse(handler.mock.calls[0][0].detail.json)).toEqual(validComposition)
  })

  it('clears error on successful load', async () => {
    const el = createElement()
    await el.updateComplete
    await expand(el)

    // First trigger an error
    getTextarea(el).value = ''
    getLoadButton(el).click()
    await el.updateComplete
    expect(el.querySelector('pre')).not.toBeNull()

    // Then load valid data
    getTextarea(el).value = JSON.stringify(validComposition)
    getLoadButton(el).click()
    await el.updateComplete
    expect(el.querySelector('pre')).toBeNull()
  })
})
