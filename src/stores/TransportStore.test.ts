import { describe, expect, it, vi } from 'vitest'
import { TransportStore } from './TransportStore'

function createStore() {
  return new TransportStore()
}

describe('TransportStore', () => {
  it('starts with default state', () => {
    const store = createStore()
    expect(store.state).toEqual({
      playbackState: 'stopped',
      bar: 0,
      beat: 0,
      bpm: 120,
      timeSignature: [4, 4],
      sectionName: null,
      loopSectionIndex: null,
    })
  })

  it('updates playback state', () => {
    const store = createStore()
    store.updatePlayback('playing')
    expect(store.state.playbackState).toBe('playing')

    store.updatePlayback('paused')
    expect(store.state.playbackState).toBe('paused')
  })

  it('updates position and section name', () => {
    const store = createStore()
    store.updatePosition(3, 2, 'chorus')
    expect(store.state.bar).toBe(3)
    expect(store.state.beat).toBe(2)
    expect(store.state.sectionName).toBe('chorus')
  })

  it('preserves section name when not provided', () => {
    const store = createStore()
    store.updatePosition(1, 0, 'verse')
    store.updatePosition(2, 1)
    expect(store.state.sectionName).toBe('verse')
  })

  it('configures bpm and time signature', () => {
    const store = createStore()
    store.configure(140, [3, 4])
    expect(store.state.bpm).toBe(140)
    expect(store.state.timeSignature).toEqual([3, 4])
  })

  it('updates loop section index', () => {
    const store = createStore()
    store.updateLoop(2)
    expect(store.state.loopSectionIndex).toBe(2)

    store.updateLoop(null)
    expect(store.state.loopSectionIndex).toBeNull()
  })

  it('resets position on stop', () => {
    const store = createStore()
    store.updatePlayback('playing')
    store.updatePosition(5, 3, 'bridge')
    store.resetPosition()

    expect(store.state.bar).toBe(0)
    expect(store.state.beat).toBe(0)
    expect(store.state.sectionName).toBeNull()
    expect(store.state.playbackState).toBe('stopped')
  })

  it('notifies subscribers on updates', () => {
    const store = createStore()
    const listener = vi.fn()
    store.subscribe(listener)

    store.updatePlayback('playing')
    store.updatePosition(1, 2)

    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener.mock.calls[0][0].playbackState).toBe('playing')
    expect(listener.mock.calls[1][0].bar).toBe(1)
  })

  it('does not affect other state fields on partial update', () => {
    const store = createStore()
    store.configure(90, [6, 8])
    store.updatePlayback('playing')

    expect(store.state.bpm).toBe(90)
    expect(store.state.timeSignature).toEqual([6, 8])
  })
})
