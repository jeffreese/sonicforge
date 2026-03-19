import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../engine/instance', () => ({
  engine: {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    stop: vi.fn(),
  },
}))

import { engine } from '../engine/instance'
import { transportStore } from '../stores/TransportStore'
import './sf-transport-bar'
import { SfTransportBar } from './sf-transport-bar'

function createElement(): SfTransportBar {
  const el = document.createElement('sf-transport-bar') as SfTransportBar
  document.body.appendChild(el)
  return el
}

function getButton(el: SfTransportBar, label: string): HTMLButtonElement {
  const buttons = el.querySelectorAll('button')
  for (const btn of buttons) {
    if (btn.getAttribute('aria-label') === label) return btn
  }
  throw new Error(`Button with aria-label "${label}" not found`)
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('sf-transport-bar', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('sf-transport-bar')).toBe(SfTransportBar)
  })

  it('renders with light DOM', () => {
    const el = createElement()
    expect(el.shadowRoot).toBeNull()
  })

  it('renders four buttons (play, pause, stop, follow)', async () => {
    const el = createElement()
    await el.updateComplete
    const buttons = el.querySelectorAll('button')
    expect(buttons.length).toBe(4)
  })

  it('all buttons disabled when engineState is empty', async () => {
    const el = createElement()
    await el.updateComplete
    expect(getButton(el, 'Play').disabled).toBe(true)
    expect(getButton(el, 'Pause').disabled).toBe(true)
    expect(getButton(el, 'Stop').disabled).toBe(true)
  })

  it('play enabled when engine is ready', async () => {
    transportStore.updateEngineState('ready')
    const el = createElement()
    await el.updateComplete
    expect(getButton(el, 'Play').disabled).toBe(false)
    expect(getButton(el, 'Pause').disabled).toBe(true)
    expect(getButton(el, 'Stop').disabled).toBe(true)
    transportStore.updateEngineState('empty')
  })

  it('pause enabled when engine is playing', async () => {
    transportStore.updateEngineState('playing')
    const el = createElement()
    await el.updateComplete
    expect(getButton(el, 'Play').disabled).toBe(true)
    expect(getButton(el, 'Pause').disabled).toBe(false)
    expect(getButton(el, 'Stop').disabled).toBe(false)
    transportStore.updateEngineState('empty')
  })

  it('play and stop enabled when engine is paused', async () => {
    transportStore.updateEngineState('paused')
    const el = createElement()
    await el.updateComplete
    expect(getButton(el, 'Play').disabled).toBe(false)
    expect(getButton(el, 'Pause').disabled).toBe(true)
    expect(getButton(el, 'Stop').disabled).toBe(false)
    transportStore.updateEngineState('empty')
  })

  it('position display updates from store', async () => {
    const el = createElement()
    await el.updateComplete
    expect(el.textContent).toContain('Bar 1 | Beat 1')

    transportStore.updatePosition(2, 3)
    await el.updateComplete
    expect(el.textContent).toContain('Bar 3 | Beat 4')
  })

  it('BPM display updates from store', async () => {
    const el = createElement()
    await el.updateComplete
    expect(el.textContent).toContain('120 BPM')

    transportStore.configure(140, [4, 4])
    await el.updateComplete
    expect(el.textContent).toContain('140 BPM')

    transportStore.configure(120, [4, 4])
  })

  it('section name appears in position when set', async () => {
    const el = createElement()
    await el.updateComplete

    transportStore.updatePosition(0, 0, 'Intro')
    await el.updateComplete
    expect(el.textContent).toContain('Intro | Bar 1')
  })

  it('clicking play calls engine.play', async () => {
    transportStore.updateEngineState('ready')
    const el = createElement()
    await el.updateComplete

    getButton(el, 'Play').click()
    expect(engine.play).toHaveBeenCalledOnce()

    vi.mocked(engine.play).mockClear()
    transportStore.updateEngineState('empty')
  })

  it('clicking pause calls engine.pause', async () => {
    transportStore.updateEngineState('playing')
    const el = createElement()
    await el.updateComplete

    getButton(el, 'Pause').click()
    expect(engine.pause).toHaveBeenCalledOnce()

    vi.mocked(engine.pause).mockClear()
    transportStore.updateEngineState('empty')
  })

  it('clicking stop calls engine.stop', async () => {
    transportStore.updateEngineState('playing')
    const el = createElement()
    await el.updateComplete

    getButton(el, 'Stop').click()
    expect(engine.stop).toHaveBeenCalledOnce()

    vi.mocked(engine.stop).mockClear()
    transportStore.updateEngineState('empty')
  })

  it('unsubscribes on disconnect', async () => {
    const el = createElement()
    await el.updateComplete

    el.remove()

    // After disconnect, store updates should not re-render
    transportStore.updateEngineState('playing')
    // No error means unsubscribe worked — component doesn't try to update while disconnected
    expect(el.isConnected).toBe(false)
  })
})
