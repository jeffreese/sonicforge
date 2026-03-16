import type { SonicForgeComposition } from '../schema/composition'
import { Store } from './Store'

/**
 * Command interface for composition mutations (ADR-006).
 * Commands operate on a mutable composition reference — the store
 * handles cloning and notification.
 */
export interface Command {
  readonly description: string
  execute(composition: SonicForgeComposition): void
  undo(composition: SonicForgeComposition): void
}

export interface CompositionState {
  composition: SonicForgeComposition | null
  undoStack: Command[]
  redoStack: Command[]
  dirty: boolean
}

const initialState: CompositionState = {
  composition: null,
  undoStack: [],
  redoStack: [],
  dirty: false,
}

export class CompositionStore extends Store<CompositionState> {
  constructor() {
    super(initialState)
  }

  /** Load a composition (replaces current, clears undo history). */
  load(composition: SonicForgeComposition): void {
    this.setState({
      composition: structuredClone(composition),
      undoStack: [],
      redoStack: [],
      dirty: false,
    })
  }

  /** Unload the current composition. */
  clear(): void {
    this.setState({
      composition: null,
      undoStack: [],
      redoStack: [],
      dirty: false,
    })
  }

  /** Dispatch a command: execute it, push to undo stack, clear redo stack. */
  dispatch(command: Command): void {
    const comp = this.state.composition
    if (!comp) return

    const cloned = structuredClone(comp)
    command.execute(cloned)

    this.setState({
      composition: cloned,
      undoStack: [...this.state.undoStack, command],
      redoStack: [],
      dirty: true,
    })
  }

  /** Undo the last command. */
  undo(): void {
    const { undoStack, composition } = this.state
    if (undoStack.length === 0 || !composition) return

    const command = undoStack[undoStack.length - 1]
    const cloned = structuredClone(composition)
    command.undo(cloned)

    this.setState({
      composition: cloned,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...this.state.redoStack, command],
      dirty: true,
    })
  }

  /** Redo the last undone command. */
  redo(): void {
    const { redoStack, composition } = this.state
    if (redoStack.length === 0 || !composition) return

    const command = redoStack[redoStack.length - 1]
    const cloned = structuredClone(composition)
    command.execute(cloned)

    this.setState({
      composition: cloned,
      undoStack: [...this.state.undoStack, command],
      redoStack: redoStack.slice(0, -1),
      dirty: true,
    })
  }

  get canUndo(): boolean {
    return this.state.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.state.redoStack.length > 0
  }

  get lastUndoDescription(): string | null {
    const stack = this.state.undoStack
    return stack.length > 0 ? stack[stack.length - 1].description : null
  }

  get lastRedoDescription(): string | null {
    const stack = this.state.redoStack
    return stack.length > 0 ? stack[stack.length - 1].description : null
  }
}

export const compositionStore = new CompositionStore()
