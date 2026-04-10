import { afterEach, describe, expect, it, vi } from 'vitest'
import './sf-channel-strip'
import { SfChannelStrip } from './sf-channel-strip'

function createElement(props: Partial<SfChannelStrip> = {}): SfChannelStrip {
  const el = document.createElement('sf-channel-strip') as SfChannelStrip
  Object.assign(el, {
    channelId: 'piano',
    name: 'Piano',
    volume: 80,
    pan: 0,
    muted: false,
    soloed: false,
    ...props,
  })
  document.body.appendChild(el)
  return el
}

function getSlider(el: SfChannelStrip, label: string): HTMLInputElement {
  const slider = el.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement
  if (!slider) throw new Error(`Slider with aria-label "${label}" not found`)
  return slider
}

function getButton(el: SfChannelStrip, label: string): HTMLButtonElement {
  const buttons = el.querySelectorAll('button')
  for (const btn of buttons) {
    if (btn.getAttribute('aria-label') === label) return btn
  }
  throw new Error(`Button with aria-label "${label}" not found`)
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('sf-channel-strip', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('sf-channel-strip')).toBe(SfChannelStrip)
  })

  it('renders with light DOM', () => {
    const el = createElement()
    expect(el.shadowRoot).toBeNull()
  })

  it('renders channel name', async () => {
    const el = createElement({ name: 'Strings' })
    await el.updateComplete
    expect(el.textContent).toContain('Strings')
  })

  it('renders volume slider with correct value', async () => {
    const el = createElement({ volume: 65 })
    await el.updateComplete
    const slider = getSlider(el, 'Volume')
    expect(slider.value).toBe('65')
    expect(el.textContent).toContain('65')
  })

  it('renders pan slider with correct value', async () => {
    const el = createElement({ pan: -0.5 })
    await el.updateComplete
    const slider = getSlider(el, 'Pan')
    expect(slider.value).toBe('-50')
  })

  it('formats pan as L/C/R', async () => {
    const el = createElement({ pan: 0 })
    await el.updateComplete
    expect(el.textContent).toContain('C')

    el.pan = -0.5
    await el.updateComplete
    expect(el.textContent).toContain('L50')

    el.pan = 0.75
    await el.updateComplete
    expect(el.textContent).toContain('R75')
  })

  it('mute button toggles active style', async () => {
    const el = createElement({ muted: false })
    await el.updateComplete
    const btn = getButton(el, 'Mute')
    expect(btn.className).not.toContain('bg-error')

    el.muted = true
    await el.updateComplete
    const btnActive = getButton(el, 'Mute')
    expect(btnActive.className).toContain('bg-error')
  })

  it('solo button toggles active style', async () => {
    const el = createElement({ soloed: false })
    await el.updateComplete
    const btn = getButton(el, 'Solo')
    expect(btn.className).not.toContain('bg-warning')

    el.soloed = true
    await el.updateComplete
    const btnActive = getButton(el, 'Solo')
    expect(btnActive.className).toContain('bg-warning')
  })

  it('dispatches mixer-volume on slider input', async () => {
    const el = createElement()
    await el.updateComplete
    const handler = vi.fn()
    el.addEventListener('mixer-volume', handler)

    const slider = getSlider(el, 'Volume')
    slider.value = '50'
    slider.dispatchEvent(new Event('input', { bubbles: true }))

    expect(handler).toHaveBeenCalledOnce()
    expect(handler.mock.calls[0][0].detail).toEqual({ id: 'piano', volume: 50 })
  })

  it('dispatches mixer-pan on slider input (converts to -1..1)', async () => {
    const el = createElement()
    await el.updateComplete
    const handler = vi.fn()
    el.addEventListener('mixer-pan', handler)

    const slider = getSlider(el, 'Pan')
    slider.value = '-50'
    slider.dispatchEvent(new Event('input', { bubbles: true }))

    expect(handler).toHaveBeenCalledOnce()
    expect(handler.mock.calls[0][0].detail).toEqual({ id: 'piano', pan: -0.5 })
  })

  it('dispatches mixer-mute on button click (toggles)', async () => {
    const el = createElement({ muted: false })
    await el.updateComplete
    const handler = vi.fn()
    el.addEventListener('mixer-mute', handler)

    getButton(el, 'Mute').click()
    expect(handler).toHaveBeenCalledOnce()
    expect(handler.mock.calls[0][0].detail).toEqual({ id: 'piano', muted: true })
  })

  it('dispatches mixer-solo on button click (toggles)', async () => {
    const el = createElement({ soloed: false })
    await el.updateComplete
    const handler = vi.fn()
    el.addEventListener('mixer-solo', handler)

    getButton(el, 'Solo').click()
    expect(handler).toHaveBeenCalledOnce()
    expect(handler.mock.calls[0][0].detail).toEqual({ id: 'piano', soloed: true })
  })

  it('renders -∞ readout when level is silent', async () => {
    const el = createElement({ level: Number.NEGATIVE_INFINITY })
    await el.updateComplete
    expect(el.textContent).toContain('-∞')
  })

  it('renders rounded dB readout when level is audible', async () => {
    const el = createElement({ level: -12.4 })
    await el.updateComplete
    expect(el.textContent).toContain('-12 dB')
  })

  it('renders peak hold indicator when peakLevel is finite', async () => {
    const el = createElement({ level: -20, peakLevel: -6 })
    await el.updateComplete
    const peakLine = el.querySelector('[role="meter"] > div:nth-child(2)') as HTMLElement
    expect(peakLine).not.toBeNull()
    // -6 dB should place the peak line at 90% of the meter height.
    expect(peakLine.style.bottom).toBe('90%')
  })

  it('hides peak hold indicator when peakLevel is -Infinity', async () => {
    const el = createElement({
      level: Number.NEGATIVE_INFINITY,
      peakLevel: Number.NEGATIVE_INFINITY,
    })
    await el.updateComplete
    // Only the meter fill div should exist inside the meter container.
    const children = el.querySelectorAll('[role="meter"] > div')
    expect(children.length).toBe(1)
  })
})
