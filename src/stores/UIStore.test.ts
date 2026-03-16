import { describe, expect, it, vi } from 'vitest'
import { UIStore } from './UIStore'

function createStore() {
  return new UIStore()
}

describe('UIStore', () => {
  it('starts with default state', () => {
    const store = createStore()
    expect(store.state).toEqual({
      activePanel: 'mixer',
      selectedInstrumentId: null,
      keyboardOctave: 4,
      explorerCollapsed: true,
      zoom: 1,
      snapEnabled: true,
    })
  })

  it('sets active panel', () => {
    const store = createStore()
    store.setActivePanel('explorer')
    expect(store.state.activePanel).toBe('explorer')
  })

  it('selects and deselects instrument', () => {
    const store = createStore()
    store.selectInstrument('piano')
    expect(store.state.selectedInstrumentId).toBe('piano')

    store.selectInstrument(null)
    expect(store.state.selectedInstrumentId).toBeNull()
  })

  it('sets keyboard octave', () => {
    const store = createStore()
    store.setKeyboardOctave(6)
    expect(store.state.keyboardOctave).toBe(6)
  })

  it('clamps keyboard octave to 1–7', () => {
    const store = createStore()
    store.setKeyboardOctave(0)
    expect(store.state.keyboardOctave).toBe(1)

    store.setKeyboardOctave(9)
    expect(store.state.keyboardOctave).toBe(7)
  })

  it('toggles explorer collapsed state', () => {
    const store = createStore()
    expect(store.state.explorerCollapsed).toBe(true)

    store.toggleExplorer()
    expect(store.state.explorerCollapsed).toBe(false)

    store.toggleExplorer()
    expect(store.state.explorerCollapsed).toBe(true)
  })

  it('sets zoom with clamping', () => {
    const store = createStore()
    store.setZoom(2)
    expect(store.state.zoom).toBe(2)

    store.setZoom(0.1)
    expect(store.state.zoom).toBe(0.25)

    store.setZoom(10)
    expect(store.state.zoom).toBe(4)
  })

  it('sets snap enabled/disabled', () => {
    const store = createStore()
    store.setSnap(false)
    expect(store.state.snapEnabled).toBe(false)
  })

  it('notifies subscribers', () => {
    const store = createStore()
    const listener = vi.fn()
    store.subscribe(listener)

    store.setActivePanel('arrangement')
    expect(listener).toHaveBeenCalledOnce()
    expect(listener.mock.calls[0][0].activePanel).toBe('arrangement')
  })
})
