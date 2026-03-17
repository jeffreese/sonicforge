import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../engine/instance', () => ({
  engine: {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    stop: vi.fn(),
    seekToSection: vi.fn(),
    setLoopSection: vi.fn(),
    swapSample: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../engine/SampleAuditioner', () => ({
  SampleAuditioner: class MockAuditioner {
    state = 'idle' as const
    activeSample: string | null = null
    setOnStateChange = vi.fn()
    loadSample = vi.fn().mockResolvedValue(undefined)
    play = vi.fn()
    playDrum = vi.fn()
    stop = vi.fn()
    dispose = vi.fn()
  },
}))

import { engine } from '../engine/instance'
import './sf-app'
import { SfApp } from './sf-app'

function createElement(): SfApp {
  const el = document.createElement('sf-app') as SfApp
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('sf-app', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('sf-app')).toBe(SfApp)
  })

  it('renders with light DOM', () => {
    const el = createElement()
    expect(el.shadowRoot).toBeNull()
  })

  it('renders all child components', async () => {
    const el = createElement()
    await el.updateComplete
    expect(el.querySelector('sf-transport-bar')).not.toBeNull()
    expect(el.querySelector('sf-arrangement')).not.toBeNull()
    expect(el.querySelector('sf-mixer')).not.toBeNull()
    expect(el.querySelector('sf-sample-explorer')).not.toBeNull()
    expect(el.querySelector('sf-sample-picker')).not.toBeNull()
  })

  it('handles arrangement-seek event', async () => {
    const el = createElement()
    await el.updateComplete

    const arrangement = el.querySelector('sf-arrangement') as HTMLElement
    arrangement.dispatchEvent(
      new CustomEvent('arrangement-seek', { bubbles: true, detail: { sectionIndex: 2 } }),
    )
    expect(engine.seekToSection).toHaveBeenCalledWith(2)
  })

  it('handles arrangement-loop event', async () => {
    const el = createElement()
    await el.updateComplete

    const arrangement = el.querySelector('sf-arrangement') as HTMLElement
    arrangement.dispatchEvent(
      new CustomEvent('arrangement-loop', { bubbles: true, detail: { sectionIndex: 1 } }),
    )
    expect(engine.setLoopSection).toHaveBeenCalledWith(1)
  })

  it('handles sample-select event', async () => {
    const el = createElement()
    await el.updateComplete

    const picker = el.querySelector('sf-sample-picker') as HTMLElement
    picker.dispatchEvent(
      new CustomEvent('sample-select', {
        bubbles: true,
        detail: { instrumentId: 'piano', sample: 'violin' },
      }),
    )
    expect(engine.swapSample).toHaveBeenCalledWith('piano', 'violin')
  })

  it('has a slot for composition loader content', async () => {
    const el = createElement()
    await el.updateComplete
    const slot = el.querySelector('slot')
    expect(slot).not.toBeNull()
  })
})
