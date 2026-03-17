import { Store } from './Store'

export type Panel = 'mixer' | 'explorer' | 'arrangement'

export interface UIState {
  activePanel: Panel
  selectedInstrumentId: string | null
  keyboardOctave: number
  explorerCollapsed: boolean
  zoom: number // 1 = default, higher = zoomed in
  snapEnabled: boolean
}

const initialState: UIState = {
  activePanel: 'mixer',
  selectedInstrumentId: null,
  keyboardOctave: 4,
  explorerCollapsed: true,
  zoom: 1,
  snapEnabled: true,
}

export class UIStore extends Store<UIState> {
  constructor() {
    super(initialState)
  }

  setActivePanel(panel: Panel): void {
    this.setState({ activePanel: panel })
  }

  selectInstrument(id: string | null): void {
    this.setState({ selectedInstrumentId: id })
  }

  setKeyboardOctave(octave: number): void {
    const clamped = Math.max(1, Math.min(7, octave))
    this.setState({ keyboardOctave: clamped })
  }

  toggleExplorer(): void {
    this.setState({ explorerCollapsed: !this.state.explorerCollapsed })
  }

  setZoom(zoom: number): void {
    this.setState({ zoom: Math.max(0.25, Math.min(4, zoom)) })
  }

  setSnap(enabled: boolean): void {
    this.setState({ snapEnabled: enabled })
  }

  clear(): void {
    this.setState({
      activePanel: 'mixer',
      selectedInstrumentId: null,
      keyboardOctave: 4,
      explorerCollapsed: true,
      zoom: 1,
      snapEnabled: true,
    })
  }
}

export const uiStore = new UIStore()
