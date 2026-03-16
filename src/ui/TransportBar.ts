import type { Engine, EngineState } from '../engine/Engine'

export class TransportBar {
  readonly el: HTMLElement
  private playBtn: HTMLButtonElement
  private pauseBtn: HTMLButtonElement
  private stopBtn: HTMLButtonElement
  private positionDisplay: HTMLElement
  private statusDisplay: HTMLElement

  constructor(private engine: Engine) {
    this.el = document.createElement('div')
    this.el.className = 'transport-bar'

    this.playBtn = this.createButton('▶ Play', () => this.engine.play())
    this.pauseBtn = this.createButton('⏸ Pause', () => this.engine.pause())
    this.stopBtn = this.createButton('⏹ Stop', () => this.engine.stop())

    this.positionDisplay = document.createElement('span')
    this.positionDisplay.className = 'transport-position'
    this.positionDisplay.textContent = '0:0:0'

    this.statusDisplay = document.createElement('span')
    this.statusDisplay.className = 'transport-status'
    this.statusDisplay.textContent = 'Empty'

    const controls = document.createElement('div')
    controls.className = 'transport-controls'
    controls.append(this.playBtn, this.pauseBtn, this.stopBtn)

    const info = document.createElement('div')
    info.className = 'transport-info'
    info.append(this.positionDisplay, this.statusDisplay)

    this.el.append(controls, info)

    this.updateButtons('empty')
  }

  private createButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.addEventListener('click', onClick)
    return btn
  }

  updateState(state: EngineState): void {
    this.updateButtons(state)

    const labels: Record<EngineState, string> = {
      empty: 'No composition loaded',
      loading: 'Loading samples...',
      ready: 'Ready',
      playing: 'Playing',
      paused: 'Paused',
    }
    this.statusDisplay.textContent = labels[state]
  }

  private updateButtons(state: EngineState): void {
    this.playBtn.disabled = state !== 'ready' && state !== 'paused'
    this.pauseBtn.disabled = state !== 'playing'
    this.stopBtn.disabled = state !== 'playing' && state !== 'paused'
  }

  updatePosition(bar: number, beat: number, sectionName?: string): void {
    let text = `Bar ${bar + 1} | Beat ${beat + 1}`
    if (sectionName) {
      text = `${sectionName} | ${text}`
    }
    this.positionDisplay.textContent = text
  }
}
