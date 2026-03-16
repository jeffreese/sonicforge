import { describe, expect, it, vi } from 'vitest'
import type { ChannelState } from './MixerStore'
import { MixerStore } from './MixerStore'

function createStore() {
  return new MixerStore()
}

const testChannels: ChannelState[] = [
  { id: 'piano', name: 'Piano', volume: 80, pan: 0, muted: false, soloed: false },
  { id: 'bass', name: 'Bass', volume: 70, pan: -0.3, muted: false, soloed: false },
]

describe('MixerStore', () => {
  it('starts with empty channels', () => {
    const store = createStore()
    expect(store.state.channels).toEqual([])
    expect(store.state.masterVolume).toBe(80)
  })

  it('loads channels from composition', () => {
    const store = createStore()
    store.loadChannels(testChannels)
    expect(store.state.channels).toHaveLength(2)
    expect(store.state.channels[0].id).toBe('piano')
  })

  it('does not mutate the original array on load', () => {
    const store = createStore()
    const original = [...testChannels]
    store.loadChannels(original)
    original.push({ id: 'drums', name: 'Drums', volume: 90, pan: 0, muted: false, soloed: false })
    expect(store.state.channels).toHaveLength(2)
  })

  it('updates volume for a channel', () => {
    const store = createStore()
    store.loadChannels(testChannels)
    store.setVolume('piano', 50)
    expect(store.state.channels[0].volume).toBe(50)
    expect(store.state.channels[1].volume).toBe(70) // bass unchanged
  })

  it('updates pan for a channel', () => {
    const store = createStore()
    store.loadChannels(testChannels)
    store.setPan('bass', 0.5)
    expect(store.state.channels[1].pan).toBe(0.5)
  })

  it('updates muted state', () => {
    const store = createStore()
    store.loadChannels(testChannels)
    store.setMuted('piano', true)
    expect(store.state.channels[0].muted).toBe(true)
  })

  it('updates soloed state', () => {
    const store = createStore()
    store.loadChannels(testChannels)
    store.setSoloed('bass', true)
    expect(store.state.channels[1].soloed).toBe(true)
  })

  it('updates master volume', () => {
    const store = createStore()
    store.setMasterVolume(60)
    expect(store.state.masterVolume).toBe(60)
  })

  it('clears all channels', () => {
    const store = createStore()
    store.loadChannels(testChannels)
    store.setMasterVolume(50)
    store.clear()
    expect(store.state.channels).toEqual([])
    expect(store.state.masterVolume).toBe(80)
  })

  it('forwards actions to sink', () => {
    const store = createStore()
    const sink = vi.fn()
    store.setSink(sink)
    store.loadChannels(testChannels)

    store.setVolume('piano', 40)
    expect(sink).toHaveBeenCalledWith({ type: 'setVolume', id: 'piano', volume: 40 })

    store.setPan('bass', 0.7)
    expect(sink).toHaveBeenCalledWith({ type: 'setPan', id: 'bass', pan: 0.7 })

    store.setMuted('piano', true)
    expect(sink).toHaveBeenCalledWith({ type: 'setMuted', id: 'piano', muted: true })

    store.setSoloed('bass', true)
    expect(sink).toHaveBeenCalledWith({ type: 'setSoloed', id: 'bass', soloed: true })

    store.setMasterVolume(30)
    expect(sink).toHaveBeenCalledWith({ type: 'setMasterVolume', volume: 30 })
  })

  it('works without a sink (no-op)', () => {
    const store = createStore()
    store.loadChannels(testChannels)
    // Should not throw
    expect(() => store.setVolume('piano', 50)).not.toThrow()
  })

  it('notifies subscribers on channel updates', () => {
    const store = createStore()
    store.loadChannels(testChannels)
    const listener = vi.fn()
    store.subscribe(listener)

    store.setVolume('piano', 60)
    expect(listener).toHaveBeenCalledOnce()
    expect(listener.mock.calls[0][0].channels[0].volume).toBe(60)
  })

  it('produces immutable channel arrays', () => {
    const store = createStore()
    store.loadChannels(testChannels)
    const before = store.state.channels
    store.setVolume('piano', 30)
    const after = store.state.channels
    expect(before).not.toBe(after)
  })
})
