import { afterEach, describe, expect, it, vi } from 'vitest'
import { uiStore } from '../stores/UIStore'
import './sf-sample-explorer'
import { SfSampleExplorer } from './sf-sample-explorer'

// Mock SampleAuditioner to avoid Tone.js in jsdom
vi.mock('../engine/SampleAuditioner', () => ({
  SampleAuditioner: class MockAuditioner {
    state = 'idle' as const
    activeSample: string | null = null
    private onStateChange?: (state: string, sample: string | null) => void

    setOnStateChange(fn: (state: string, sample: string | null) => void) {
      this.onStateChange = fn
    }
    async loadSample(name: string) {
      this.activeSample = name
      this.onStateChange?.('loading', name)
      this.onStateChange?.('ready', name)
    }
    play = vi.fn()
    playDrum = vi.fn()
    stop = vi.fn()
    dispose = vi.fn()
  },
}))

function createElement(): SfSampleExplorer {
  const el = document.createElement('sf-sample-explorer') as SfSampleExplorer
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
  uiStore.clear()
})

describe('sf-sample-explorer', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('sf-sample-explorer')).toBe(SfSampleExplorer)
  })

  it('renders with light DOM', () => {
    const el = createElement()
    expect(el.shadowRoot).toBeNull()
  })

  it('renders collapsed by default', async () => {
    const el = createElement()
    await el.updateComplete
    expect(el.querySelector('[aria-label="Search instruments"]')).toBeNull()
    expect(el.textContent).toContain('Show')
  })

  it('expands when header is clicked', async () => {
    const el = createElement()
    await el.updateComplete
    const header = el.querySelector('h2')?.parentElement as HTMLElement
    header.click()
    await el.updateComplete
    expect(el.querySelector('[aria-label="Search instruments"]')).not.toBeNull()
    expect(el.textContent).toContain('Hide')
  })

  it('syncs collapsed state with UIStore', async () => {
    uiStore.toggleExplorer() // collapsed = false
    const el = createElement()
    await el.updateComplete
    expect(el.querySelector('[aria-label="Search instruments"]')).not.toBeNull()
  })

  it('renders all GM categories when expanded', async () => {
    uiStore.toggleExplorer()
    const el = createElement()
    await el.updateComplete
    const categories = el.querySelectorAll('[data-category]')
    // 11 GM categories + 1 Drums = 12
    expect(categories.length).toBe(12)
  })

  it('renders drum buttons', async () => {
    uiStore.toggleExplorer()
    const el = createElement()
    await el.updateComplete
    const drumBtns = el.querySelectorAll('[data-drum-hit]')
    expect(drumBtns.length).toBe(9)
  })

  it('renders velocity slider', async () => {
    uiStore.toggleExplorer()
    const el = createElement()
    await el.updateComplete
    const slider = el.querySelector('[aria-label="Velocity"]') as HTMLInputElement
    expect(slider).not.toBeNull()
    expect(slider.value).toBe('100')
  })

  it('updates velocity display on slider change', async () => {
    uiStore.toggleExplorer()
    const el = createElement()
    await el.updateComplete
    const slider = el.querySelector('[aria-label="Velocity"]') as HTMLInputElement
    slider.value = '64'
    slider.dispatchEvent(new Event('input', { bubbles: true }))
    await el.updateComplete
    expect(el.textContent).toContain('64')
  })

  it('filters instruments by search query', async () => {
    uiStore.toggleExplorer()
    const el = createElement()
    await el.updateComplete

    const search = el.querySelector('[aria-label="Search instruments"]') as HTMLInputElement
    search.value = 'violin'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    await el.updateComplete

    const visibleBtns = el.querySelectorAll('[data-sample]')
    expect(visibleBtns.length).toBeGreaterThan(0)
    for (const btn of visibleBtns) {
      const text = btn.textContent?.toLowerCase() ?? ''
      const sample = (btn as HTMLElement).dataset.sample?.toLowerCase() ?? ''
      // Either the instrument matches or it belongs to a category that matches
      const category =
        btn.closest('[data-category]')?.getAttribute('data-category')?.toLowerCase() ?? ''
      expect(
        text.includes('violin') || sample.includes('violin') || category.includes('violin'),
      ).toBe(true)
    }
  })

  it('hides categories with no matching instruments', async () => {
    uiStore.toggleExplorer()
    const el = createElement()
    await el.updateComplete

    const search = el.querySelector('[aria-label="Search instruments"]') as HTMLInputElement
    search.value = 'xyznonexistent'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    await el.updateComplete

    const categories = el.querySelectorAll('[data-category]')
    expect(categories.length).toBe(0)
  })

  it('renders sf-keyboard child component', async () => {
    uiStore.toggleExplorer()
    const el = createElement()
    await el.updateComplete
    const kbd = el.querySelector('sf-keyboard')
    expect(kbd).not.toBeNull()
  })

  it('exposes auditioner via getAuditioner()', async () => {
    const el = createElement()
    await el.updateComplete
    const auditioner = el.getAuditioner()
    expect(auditioner).toBeDefined()
    expect(auditioner?.state).toBe('idle')
  })

  it('marks instrument as active on click', async () => {
    uiStore.toggleExplorer()
    const el = createElement()
    await el.updateComplete

    const pianoBtn = el.querySelector('[data-sample="acoustic_grand_piano"]') as HTMLElement
    expect(pianoBtn).not.toBeNull()
    pianoBtn.click()
    await el.updateComplete

    const activeBtn = el.querySelector('[data-sample="acoustic_grand_piano"]')
    expect(activeBtn?.className).toContain('primary')
  })

  it('marks drum button as active on click', async () => {
    uiStore.toggleExplorer()
    const el = createElement()
    await el.updateComplete

    const kickBtn = el.querySelector('[data-drum-hit="kick"]') as HTMLElement
    kickBtn.click()
    await el.updateComplete

    const activeKick = el.querySelector('[data-drum-hit="kick"]')
    expect(activeKick?.className).toContain('secondary')
  })

  it('disposes auditioner on disconnect', async () => {
    const el = createElement()
    await el.updateComplete
    const auditioner = el.getAuditioner()
    expect(auditioner).toBeDefined()
    // biome-ignore lint/style/noNonNullAssertion: guarded by expect above
    const disposeSpy = vi.spyOn(auditioner!, 'dispose')

    el.remove()
    expect(disposeSpy).toHaveBeenCalled()
  })
})
