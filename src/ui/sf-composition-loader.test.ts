import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SonicForgeComposition } from '../schema/composition'
import { compositionStore } from '../stores/CompositionStore'
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

/** Query helpers that assert existence so Biome doesn't complain about non-null assertions. */
function getTextarea(el: SfCompositionLoader): HTMLTextAreaElement {
  const ta = el.querySelector('textarea')
  expect(ta).not.toBeNull()
  return ta as HTMLTextAreaElement
}

function getLoadButton(el: SfCompositionLoader): HTMLButtonElement {
  const btn = el.querySelector('button')
  expect(btn).not.toBeNull()
  return btn as HTMLButtonElement
}

afterEach(() => {
  document.body.innerHTML = ''
  compositionStore.clear()
})

describe('sf-composition-loader', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('sf-composition-loader')).toBe(SfCompositionLoader)
  })

  it('renders with light DOM', () => {
    const el = createElement()
    expect(el.shadowRoot).toBeNull()
  })

  it('renders textarea and buttons after update', async () => {
    const el = createElement()
    await el.updateComplete
    expect(el.querySelector('textarea')).not.toBeNull()
    expect(el.querySelector('button')).not.toBeNull()
    const buttons = el.querySelectorAll('button')
    expect(buttons.length).toBe(2)
    expect(buttons[0].textContent).toBe('Load & Play')
    expect(buttons[1].textContent).toBe('Upload File')
  })

  it('loads valid JSON into compositionStore', async () => {
    const loadSpy = vi.spyOn(compositionStore, 'load')
    const el = createElement()
    await el.updateComplete

    getTextarea(el).value = JSON.stringify(validComposition)
    getLoadButton(el).click()

    expect(loadSpy).toHaveBeenCalledOnce()
    expect(loadSpy.mock.calls[0][0]).toEqual(validComposition)
    expect(el.querySelector('pre')).toBeNull()

    loadSpy.mockRestore()
  })

  it('shows parse error for invalid JSON', async () => {
    const el = createElement()
    await el.updateComplete

    getTextarea(el).value = '{ not valid json'
    getLoadButton(el).click()

    await el.updateComplete
    const errorEl = el.querySelector('pre')
    expect(errorEl).not.toBeNull()
    expect(errorEl?.textContent).toContain('Invalid JSON')
  })

  it('shows validation errors for invalid composition', async () => {
    const el = createElement()
    await el.updateComplete

    getTextarea(el).value = JSON.stringify({ version: '2.0' })
    getLoadButton(el).click()

    await el.updateComplete
    const errorEl = el.querySelector('pre')
    expect(errorEl).not.toBeNull()
    expect(errorEl?.textContent).toContain('version must be "1.0"')
  })

  it('shows error for empty textarea', async () => {
    const el = createElement()
    await el.updateComplete

    getTextarea(el).value = ''
    getLoadButton(el).click()

    await el.updateComplete
    const errorEl = el.querySelector('pre')
    expect(errorEl).not.toBeNull()
    expect(errorEl?.textContent).toBe('Please paste a composition JSON')
  })

  it('loads file via upload', async () => {
    const loadSpy = vi.spyOn(compositionStore, 'load')
    const el = createElement()
    await el.updateComplete

    const jsonStr = JSON.stringify(validComposition)
    const file = new File([jsonStr], 'test.json', { type: 'application/json' })

    const fileInput = el.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(fileInput, 'files', { value: [file], writable: false })
    fileInput.dispatchEvent(new Event('change'))

    // Wait for FileReader async callback
    await new Promise((r) => setTimeout(r, 50))
    await el.updateComplete

    expect(loadSpy).toHaveBeenCalledOnce()
    expect(loadSpy.mock.calls[0][0]).toEqual(validComposition)

    loadSpy.mockRestore()
  })

  it('clears error on successful load', async () => {
    const el = createElement()
    await el.updateComplete

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
