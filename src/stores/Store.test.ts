import { describe, expect, it, vi } from 'vitest'
import { Store } from './Store'

interface TestState {
  count: number
  label: string
}

class TestStore extends Store<TestState> {
  increment() {
    this.setState({ count: this.state.count + 1 })
  }

  setLabel(label: string) {
    this.setState({ label })
  }
}

function createStore() {
  return new TestStore({ count: 0, label: 'initial' })
}

describe('Store', () => {
  it('exposes initial state', () => {
    const store = createStore()
    expect(store.state).toEqual({ count: 0, label: 'initial' })
  })

  it('updates state via setState', () => {
    const store = createStore()
    store.increment()
    expect(store.state.count).toBe(1)
  })

  it('merges partial state without clobbering other fields', () => {
    const store = createStore()
    store.setLabel('changed')
    expect(store.state).toEqual({ count: 0, label: 'changed' })
  })

  it('notifies subscribers on state change', () => {
    const store = createStore()
    const listener = vi.fn()
    store.subscribe(listener)

    store.increment()

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith({ count: 1, label: 'initial' })
  })

  it('supports multiple subscribers', () => {
    const store = createStore()
    const a = vi.fn()
    const b = vi.fn()
    store.subscribe(a)
    store.subscribe(b)

    store.increment()

    expect(a).toHaveBeenCalledOnce()
    expect(b).toHaveBeenCalledOnce()
  })

  it('returns an unsubscribe function', () => {
    const store = createStore()
    const listener = vi.fn()
    const unsub = store.subscribe(listener)

    store.increment()
    expect(listener).toHaveBeenCalledOnce()

    unsub()
    store.increment()
    expect(listener).toHaveBeenCalledOnce() // not called again
  })

  it('does not affect other subscribers when one unsubscribes', () => {
    const store = createStore()
    const staying = vi.fn()
    const leaving = vi.fn()
    store.subscribe(staying)
    const unsub = store.subscribe(leaving)

    unsub()
    store.increment()

    expect(staying).toHaveBeenCalledOnce()
    expect(leaving).not.toHaveBeenCalled()
  })

  it('creates a new state object on each update (immutable)', () => {
    const store = createStore()
    const first = store.state
    store.increment()
    const second = store.state

    expect(first).not.toBe(second)
    expect(first.count).toBe(0)
    expect(second.count).toBe(1)
  })
})
