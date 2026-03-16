/**
 * Base reactive store with subscribe/notify pattern.
 * Concrete stores extend this with their own state shape.
 * See ADR-004 for rationale.
 */
export type Listener<T> = (state: T) => void
export type Unsubscribe = () => void

export class Store<T extends object> {
  private listeners = new Set<Listener<T>>()
  private _state: T

  constructor(initialState: T) {
    this._state = { ...initialState }
  }

  get state(): T {
    return this._state
  }

  subscribe(listener: Listener<T>): Unsubscribe {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  protected setState(partial: Partial<T>): void {
    this._state = { ...this._state, ...partial }
    for (const listener of this.listeners) {
      listener(this._state)
    }
  }
}
