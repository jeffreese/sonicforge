import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock the engine singleton so importing sf-mixer (which imports from
// ../engine/instance to poll meter levels) doesn't try to construct a
// real Tone.js MixBus under jsdom. The mock returns stable dB values
// that the meter rendering tests can assert on.
vi.mock('../engine/instance', () => ({
  engine: {
    getMixBus: vi.fn().mockReturnValue({
      getStates: () => [],
      setMasterVolume: vi.fn(),
      getChannelLevel: vi.fn().mockReturnValue(Number.NEGATIVE_INFINITY),
      getMasterLevel: vi.fn().mockReturnValue(Number.NEGATIVE_INFINITY),
    }),
  },
}))

import type { ChannelState } from '../stores/MixerStore'
import { mixerStore } from '../stores/MixerStore'
import './sf-mixer'
import { SfMixer } from './sf-mixer'

const testChannels: ChannelState[] = [
  { id: 'piano', name: 'Piano', volume: 80, pan: 0, muted: false, soloed: false, humanization: 50 },
  {
    id: 'bass',
    name: 'Bass',
    volume: 70,
    pan: -0.3,
    muted: false,
    soloed: false,
    humanization: 50,
  },
  {
    id: 'drums',
    name: 'Drums',
    volume: 90,
    pan: 0.2,
    muted: true,
    soloed: false,
    humanization: 50,
  },
]

function createElement(): SfMixer {
  const el = document.createElement('sf-mixer') as SfMixer
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
  mixerStore.clear()
})

describe('sf-mixer', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('sf-mixer')).toBe(SfMixer)
  })

  it('renders with light DOM', () => {
    const el = createElement()
    expect(el.shadowRoot).toBeNull()
  })

  it('renders no channel strips when store is empty', async () => {
    const el = createElement()
    await el.updateComplete
    const strips = el.querySelectorAll('sf-channel-strip')
    expect(strips.length).toBe(0)
  })

  it('renders correct number of channel strips from store', async () => {
    mixerStore.loadChannels(testChannels)
    const el = createElement()
    await el.updateComplete
    const strips = el.querySelectorAll('sf-channel-strip')
    expect(strips.length).toBe(3)
  })

  it('passes channel properties to strips', async () => {
    mixerStore.loadChannels(testChannels)
    const el = createElement()
    await el.updateComplete
    const strips = el.querySelectorAll('sf-channel-strip')
    const first = strips[0] as HTMLElement & { channelId: string; name: string; volume: number }
    expect(first.channelId).toBe('piano')
    expect(first.name).toBe('Piano')
    expect(first.volume).toBe(80)
  })

  it('renders master volume slider', async () => {
    const el = createElement()
    await el.updateComplete
    const master = el.querySelector('input[aria-label="Master Volume"]') as HTMLInputElement
    expect(master).not.toBeNull()
    expect(master.value).toBe('80')
  })

  it('updates strips when store changes', async () => {
    const el = createElement()
    await el.updateComplete
    expect(el.querySelectorAll('sf-channel-strip').length).toBe(0)

    mixerStore.loadChannels(testChannels)
    await el.updateComplete
    expect(el.querySelectorAll('sf-channel-strip').length).toBe(3)
  })

  it('mixer-volume event calls store.setVolume', async () => {
    mixerStore.loadChannels(testChannels)
    const el = createElement()
    await el.updateComplete

    const spy = vi.spyOn(mixerStore, 'setVolume')
    const strip = el.querySelector('sf-channel-strip') as HTMLElement
    strip.dispatchEvent(
      new CustomEvent('mixer-volume', { bubbles: true, detail: { id: 'piano', volume: 50 } }),
    )
    expect(spy).toHaveBeenCalledWith('piano', 50)
    spy.mockRestore()
  })

  it('mixer-pan event calls store.setPan', async () => {
    mixerStore.loadChannels(testChannels)
    const el = createElement()
    await el.updateComplete

    const spy = vi.spyOn(mixerStore, 'setPan')
    const strip = el.querySelector('sf-channel-strip') as HTMLElement
    strip.dispatchEvent(
      new CustomEvent('mixer-pan', { bubbles: true, detail: { id: 'bass', pan: 0.5 } }),
    )
    expect(spy).toHaveBeenCalledWith('bass', 0.5)
    spy.mockRestore()
  })

  it('mixer-mute event calls store.setMuted', async () => {
    mixerStore.loadChannels(testChannels)
    const el = createElement()
    await el.updateComplete

    const spy = vi.spyOn(mixerStore, 'setMuted')
    const strip = el.querySelector('sf-channel-strip') as HTMLElement
    strip.dispatchEvent(
      new CustomEvent('mixer-mute', { bubbles: true, detail: { id: 'piano', muted: true } }),
    )
    expect(spy).toHaveBeenCalledWith('piano', true)
    spy.mockRestore()
  })

  it('mixer-solo event calls store.setSoloed', async () => {
    mixerStore.loadChannels(testChannels)
    const el = createElement()
    await el.updateComplete

    const spy = vi.spyOn(mixerStore, 'setSoloed')
    const strip = el.querySelectorAll('sf-channel-strip')[2] as HTMLElement
    strip.dispatchEvent(
      new CustomEvent('mixer-solo', { bubbles: true, detail: { id: 'drums', soloed: true } }),
    )
    expect(spy).toHaveBeenCalledWith('drums', true)
    spy.mockRestore()
  })

  it('master volume input calls store.setMasterVolume', async () => {
    const el = createElement()
    await el.updateComplete

    const spy = vi.spyOn(mixerStore, 'setMasterVolume')
    const master = el.querySelector('input[aria-label="Master Volume"]') as HTMLInputElement
    master.value = '60'
    master.dispatchEvent(new Event('input', { bubbles: true }))
    expect(spy).toHaveBeenCalledWith(60)
    spy.mockRestore()
  })

  it('unsubscribes on disconnect', async () => {
    mixerStore.loadChannels(testChannels)
    const el = createElement()
    await el.updateComplete

    el.remove()
    mixerStore.loadChannels([])
    expect(el.isConnected).toBe(false)
  })

  it('renders a meter bar on each channel strip', async () => {
    mixerStore.loadChannels(testChannels)
    const el = createElement()
    await el.updateComplete
    const meters = el.querySelectorAll('sf-channel-strip [role="meter"]')
    // One meter per channel strip.
    expect(meters.length).toBe(testChannels.length)
  })

  it('renders a master meter in the master section', async () => {
    const el = createElement()
    await el.updateComplete
    const masterMeter = el.querySelector('[aria-label="Master level"]')
    expect(masterMeter).not.toBeNull()
  })

  it('renders a dB readout next to the master meter', async () => {
    const el = createElement()
    await el.updateComplete
    // Master meter column contains a readout element — initially -∞ under the
    // mocked engine which returns -Infinity.
    const masterSection = el.querySelector('[aria-label="Master level"]') as HTMLElement
    expect(masterSection).not.toBeNull()
    const column = masterSection.parentElement as HTMLElement
    expect(column.textContent).toContain('-∞')
  })

  it('cancels the rAF loop on disconnect', async () => {
    mixerStore.loadChannels(testChannels)
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame')
    const el = createElement()
    await el.updateComplete
    el.remove()
    // cancelAnimationFrame should have been called to clean up the loop.
    expect(cancelSpy).toHaveBeenCalled()
    cancelSpy.mockRestore()
  })
})
