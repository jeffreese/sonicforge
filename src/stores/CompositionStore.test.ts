import { describe, expect, it, vi } from 'vitest'
import type { SonicForgeComposition } from '../schema/composition'
import type { Command } from './CompositionStore'
import { CompositionStore } from './CompositionStore'

const testComposition: SonicForgeComposition = {
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

function createSetTitleCommand(newTitle: string, oldTitle: string): Command {
  return {
    description: `Set title to "${newTitle}"`,
    execute(comp) {
      comp.metadata.title = newTitle
    },
    undo(comp) {
      comp.metadata.title = oldTitle
    },
  }
}

function createStore() {
  return new CompositionStore()
}

describe('CompositionStore', () => {
  it('starts with null composition', () => {
    const store = createStore()
    expect(store.state.composition).toBeNull()
    expect(store.state.undoStack).toEqual([])
    expect(store.state.redoStack).toEqual([])
    expect(store.state.dirty).toBe(false)
  })

  it('loads a composition', () => {
    const store = createStore()
    store.load(testComposition)
    expect(store.state.composition?.metadata.title).toBe('Test Song')
    expect(store.state.dirty).toBe(false)
  })

  it('deep-clones on load (no shared references)', () => {
    const store = createStore()
    store.load(testComposition)
    testComposition.metadata.title = 'Mutated'
    expect(store.state.composition?.metadata.title).toBe('Test Song')
    // Restore for other tests
    testComposition.metadata.title = 'Test Song'
  })

  it('clears composition and history', () => {
    const store = createStore()
    store.load(testComposition)
    store.dispatch(createSetTitleCommand('New', 'Test Song'))
    store.clear()
    expect(store.state.composition).toBeNull()
    expect(store.state.undoStack).toEqual([])
    expect(store.state.dirty).toBe(false)
  })

  it('dispatches a command', () => {
    const store = createStore()
    store.load(testComposition)
    store.dispatch(createSetTitleCommand('Renamed', 'Test Song'))

    expect(store.state.composition?.metadata.title).toBe('Renamed')
    expect(store.state.undoStack).toHaveLength(1)
    expect(store.state.redoStack).toHaveLength(0)
    expect(store.state.dirty).toBe(true)
  })

  it('does nothing when dispatching without a composition', () => {
    const store = createStore()
    const cmd = createSetTitleCommand('X', 'Y')
    store.dispatch(cmd)
    expect(store.state.undoStack).toHaveLength(0)
  })

  it('undoes a command', () => {
    const store = createStore()
    store.load(testComposition)
    store.dispatch(createSetTitleCommand('Renamed', 'Test Song'))
    store.undo()

    expect(store.state.composition?.metadata.title).toBe('Test Song')
    expect(store.state.undoStack).toHaveLength(0)
    expect(store.state.redoStack).toHaveLength(1)
  })

  it('redoes a command', () => {
    const store = createStore()
    store.load(testComposition)
    store.dispatch(createSetTitleCommand('Renamed', 'Test Song'))
    store.undo()
    store.redo()

    expect(store.state.composition?.metadata.title).toBe('Renamed')
    expect(store.state.undoStack).toHaveLength(1)
    expect(store.state.redoStack).toHaveLength(0)
  })

  it('clears redo stack on new dispatch', () => {
    const store = createStore()
    store.load(testComposition)
    store.dispatch(createSetTitleCommand('First', 'Test Song'))
    store.undo()
    expect(store.canRedo).toBe(true)

    store.dispatch(createSetTitleCommand('Second', 'Test Song'))
    expect(store.canRedo).toBe(false)
    expect(store.state.composition?.metadata.title).toBe('Second')
  })

  it('supports multiple undo/redo steps', () => {
    const store = createStore()
    store.load(testComposition)
    store.dispatch(createSetTitleCommand('A', 'Test Song'))
    store.dispatch(createSetTitleCommand('B', 'A'))
    store.dispatch(createSetTitleCommand('C', 'B'))

    expect(store.state.composition?.metadata.title).toBe('C')

    store.undo()
    expect(store.state.composition?.metadata.title).toBe('B')

    store.undo()
    expect(store.state.composition?.metadata.title).toBe('A')

    store.redo()
    expect(store.state.composition?.metadata.title).toBe('B')
  })

  it('provides canUndo/canRedo helpers', () => {
    const store = createStore()
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(false)

    store.load(testComposition)
    store.dispatch(createSetTitleCommand('X', 'Test Song'))
    expect(store.canUndo).toBe(true)
    expect(store.canRedo).toBe(false)

    store.undo()
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(true)
  })

  it('provides command descriptions', () => {
    const store = createStore()
    expect(store.lastUndoDescription).toBeNull()
    expect(store.lastRedoDescription).toBeNull()

    store.load(testComposition)
    store.dispatch(createSetTitleCommand('X', 'Test Song'))
    expect(store.lastUndoDescription).toBe('Set title to "X"')

    store.undo()
    expect(store.lastRedoDescription).toBe('Set title to "X"')
  })

  it('does not share state between dispatch calls', () => {
    const store = createStore()
    store.load(testComposition)
    const before = store.state.composition
    store.dispatch(createSetTitleCommand('Changed', 'Test Song'))
    const after = store.state.composition

    expect(before).not.toBe(after)
    expect(before?.metadata.title).toBe('Test Song')
  })

  it('notifies subscribers on dispatch', () => {
    const store = createStore()
    store.load(testComposition)
    const listener = vi.fn()
    store.subscribe(listener)

    store.dispatch(createSetTitleCommand('New', 'Test Song'))
    expect(listener).toHaveBeenCalledOnce()
    expect(listener.mock.calls[0][0].composition.metadata.title).toBe('New')
  })

  it('notifies subscribers on undo/redo', () => {
    const store = createStore()
    store.load(testComposition)
    store.dispatch(createSetTitleCommand('New', 'Test Song'))

    const listener = vi.fn()
    store.subscribe(listener)

    store.undo()
    store.redo()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('clears undo history on new load', () => {
    const store = createStore()
    store.load(testComposition)
    store.dispatch(createSetTitleCommand('X', 'Test Song'))
    expect(store.canUndo).toBe(true)

    store.load(testComposition)
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(false)
  })
})
