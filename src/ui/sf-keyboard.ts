import { LitElement, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import type { SampleAuditioner } from '../engine/SampleAuditioner'
import type { Unsubscribe } from '../stores/Store'
import { uiStore } from '../stores/UIStore'
import { keyboard } from '../styles/components'

const WHITE_KEYS = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
const BLACK_KEYS: Record<string, number> = {
  s: 1, // C#
  d: 3, // D#
  g: 6, // F#
  h: 8, // G#
  j: 10, // A#
}

const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16]
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function semitoneToNote(semitone: number, octave: number): string {
  const adjustedOctave = octave + Math.floor(semitone / 12)
  const noteIndex = ((semitone % 12) + 12) % 12
  return NOTE_NAMES[noteIndex] + adjustedOctave
}

function getBlackKeyPosition(semitone: number): number {
  for (let i = 0; i < WHITE_SEMITONES.length - 1; i++) {
    if (semitone > WHITE_SEMITONES[i] && semitone < WHITE_SEMITONES[i + 1]) {
      return i
    }
  }
  return 0
}

@customElement('sf-keyboard')
export class SfKeyboard extends LitElement {
  @property({ attribute: false }) auditioner?: SampleAuditioner
  @property({ type: Boolean }) enabled = false
  @property({ type: String }) activeSample: string | null = null

  @state() private octave = 4
  @state() private pressedKeys = new Set<string>()

  private unsubscribe?: Unsubscribe
  private boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e)
  private boundKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e)

  createRenderRoot() {
    return this
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.octave = uiStore.state.keyboardOctave

    this.unsubscribe = uiStore.subscribe((state) => {
      this.octave = state.keyboardOctave
    })

    document.addEventListener('keydown', this.boundKeyDown)
    document.addEventListener('keyup', this.boundKeyUp)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unsubscribe?.()
    document.removeEventListener('keydown', this.boundKeyDown)
    document.removeEventListener('keyup', this.boundKeyUp)
    this.clearHeld()
  }

  private get displayName(): string {
    if (!this.activeSample) return 'Select an instrument above'
    return this.activeSample
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  private handleOctaveDown(): void {
    uiStore.setKeyboardOctave(this.octave - 1)
  }

  private handleOctaveUp(): void {
    uiStore.setKeyboardOctave(this.octave + 1)
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.enabled || !this.auditioner) return
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    const key = e.key.toLowerCase()
    if (this.pressedKeys.has(key)) return

    const isWhite = WHITE_KEYS.includes(key)
    const isBlack = key in BLACK_KEYS
    if (!isWhite && !isBlack) return

    e.preventDefault()
    const semitone = isBlack ? BLACK_KEYS[key] : WHITE_SEMITONES[WHITE_KEYS.indexOf(key)]
    const note = semitoneToNote(semitone, this.octave)

    this.pressedKeys = new Set([...this.pressedKeys, key])
    this.auditioner.play(note, '8n', 0.8)
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase()
    if (!this.pressedKeys.has(key)) return

    const next = new Set(this.pressedKeys)
    next.delete(key)
    this.pressedKeys = next
  }

  private clearHeld(): void {
    this.pressedKeys = new Set()
  }

  render() {
    const sectionClass = this.enabled ? keyboard.sectionEnabled : keyboard.section
    const statusClass = this.enabled ? keyboard.statusActive : keyboard.status

    return html`
      <div class="${sectionClass}">
        <div class="${keyboard.header}">
          <span class="${keyboard.label}">Keyboard</span>
          <div class="${keyboard.octaveControls}">
            <button
              class="${keyboard.octaveBtn}"
              @click=${this.handleOctaveDown}
              ?disabled=${this.octave <= 1}
              aria-label="Octave down"
            >-</button>
            <span class="${keyboard.octaveDisplay}">C${this.octave}</span>
            <button
              class="${keyboard.octaveBtn}"
              @click=${this.handleOctaveUp}
              ?disabled=${this.octave >= 7}
              aria-label="Octave up"
            >+</button>
          </div>
          <span class="${statusClass}">${this.displayName}</span>
        </div>
        <div class="${keyboard.piano}">
          ${this.renderWhiteKeys()}
          ${this.renderBlackKeys()}
        </div>
      </div>
    `
  }

  private renderWhiteKeys() {
    return WHITE_KEYS.map((keyChar, i) => {
      const semitone = WHITE_SEMITONES[i]
      const note = semitoneToNote(semitone, this.octave)
      const pressed = this.pressedKeys.has(keyChar)
      const cls = pressed ? keyboard.whiteKeyPressed : keyboard.whiteKey

      return html`
        <div class="${cls}" data-note="${note}" data-key-bind="${keyChar.toUpperCase()}">
          <span class="${keyboard.keyNote}">${note}</span>
          <span class="${keyboard.keyLabel}">${keyChar.toUpperCase()}</span>
        </div>
      `
    })
  }

  private renderBlackKeys() {
    return Object.entries(BLACK_KEYS).map(([keyChar, semitone]) => {
      const note = semitoneToNote(semitone, this.octave)
      const pressed = this.pressedKeys.has(keyChar)
      const cls = pressed ? keyboard.blackKeyPressed : keyboard.blackKey
      const whiteIndex = getBlackKeyPosition(semitone)
      const leftPercent = (whiteIndex + 0.65) * 10

      return html`
        <div
          class="${cls}"
          style="left: ${leftPercent}%"
          data-note="${note}"
          data-key-bind="${keyChar.toUpperCase()}"
        >
          <span class="${keyboard.keyLabel}">${keyChar.toUpperCase()}</span>
        </div>
      `
    })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sf-keyboard': SfKeyboard
  }
}
