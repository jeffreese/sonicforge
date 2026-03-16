import type { SampleAuditioner } from '../engine/SampleAuditioner'

/**
 * Computer-keyboard key → note mapping.
 * Bottom row (Z-M) = white keys, top row = black keys.
 */
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

export class Keyboard {
  readonly el: HTMLElement
  private auditioner: SampleAuditioner
  private octave = 4
  private enabled = false
  private activeSample: string | null = null
  private heldKeys = new Set<string>()
  private keyElements = new Map<string, HTMLElement>()

  private boundKeyDown: (e: KeyboardEvent) => void
  private boundKeyUp: (e: KeyboardEvent) => void

  constructor(auditioner: SampleAuditioner) {
    this.auditioner = auditioner

    this.el = document.createElement('div')
    this.el.className = 'keyboard-section'

    // Header row
    const header = document.createElement('div')
    header.className = 'keyboard-header'

    const label = document.createElement('span')
    label.className = 'keyboard-label'
    label.textContent = 'Keyboard'

    // Octave controls
    const octaveControls = document.createElement('div')
    octaveControls.className = 'octave-controls'

    const octDown = document.createElement('button')
    octDown.className = 'octave-btn'
    octDown.textContent = '-'
    octDown.addEventListener('click', () => {
      if (this.octave > 1) {
        this.octave--
        octDisplay.textContent = `C${this.octave}`
        this.updateVisualKeys()
      }
    })

    const octDisplay = document.createElement('span')
    octDisplay.className = 'octave-display'
    octDisplay.textContent = `C${this.octave}`

    const octUp = document.createElement('button')
    octUp.className = 'octave-btn'
    octUp.textContent = '+'
    octUp.addEventListener('click', () => {
      if (this.octave < 7) {
        this.octave++
        octDisplay.textContent = `C${this.octave}`
        this.updateVisualKeys()
      }
    })

    octaveControls.append(octDown, octDisplay, octUp)

    const status = document.createElement('span')
    status.className = 'keyboard-status'
    status.id = 'keyboard-status'
    status.textContent = 'Select an instrument above'

    header.append(label, octaveControls, status)

    // Visual keyboard
    const piano = document.createElement('div')
    piano.className = 'piano-keys'
    piano.id = 'piano-keys'
    this.buildPianoKeys(piano)

    this.el.append(header, piano)

    // Key handlers
    this.boundKeyDown = (e) => this.handleKeyDown(e)
    this.boundKeyUp = (e) => this.handleKeyUp(e)
    document.addEventListener('keydown', this.boundKeyDown)
    document.addEventListener('keyup', this.boundKeyUp)
  }

  enable(sample: string): void {
    this.enabled = true
    this.activeSample = sample
    const status = document.getElementById('keyboard-status')
    if (status) {
      const displayName = sample
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
      status.textContent = displayName
      status.classList.add('active')
    }
    this.el.classList.add('enabled')
  }

  disable(): void {
    this.enabled = false
    this.activeSample = null
    const status = document.getElementById('keyboard-status')
    if (status) {
      status.textContent = 'Select an instrument above'
      status.classList.remove('active')
    }
    this.el.classList.remove('enabled')
    this.clearHeld()
  }

  private buildPianoKeys(container: HTMLElement): void {
    // Build 10 white keys + black keys overlaid
    for (let i = 0; i < WHITE_KEYS.length; i++) {
      const key = document.createElement('div')
      key.className = 'piano-key white-key'
      const semitone = WHITE_SEMITONES[i]
      const note = semitoneToNote(semitone, this.octave)
      key.dataset.note = note
      key.dataset.keyBind = WHITE_KEYS[i].toUpperCase()

      const label = document.createElement('span')
      label.className = 'key-label'
      label.textContent = WHITE_KEYS[i].toUpperCase()

      const noteLabel = document.createElement('span')
      noteLabel.className = 'key-note'
      noteLabel.textContent = note

      key.append(noteLabel, label)
      this.keyElements.set(WHITE_KEYS[i], key)
      container.append(key)
    }

    // Black keys
    const blackKeyData = Object.entries(BLACK_KEYS)
    for (const [keyChar, semitone] of blackKeyData) {
      const key = document.createElement('div')
      key.className = 'piano-key black-key'
      const note = semitoneToNote(semitone, this.octave)
      key.dataset.note = note
      key.dataset.keyBind = keyChar.toUpperCase()

      // Position black keys between white keys
      const whiteIndex = this.getBlackKeyPosition(semitone)
      key.style.left = `${(whiteIndex + 0.65) * 10}%`

      const label = document.createElement('span')
      label.className = 'key-label'
      label.textContent = keyChar.toUpperCase()

      key.append(label)
      this.keyElements.set(keyChar, key)
      container.append(key)
    }
  }

  private getBlackKeyPosition(semitone: number): number {
    // Find which white key this black key sits after
    for (let i = 0; i < WHITE_SEMITONES.length - 1; i++) {
      if (semitone > WHITE_SEMITONES[i] && semitone < WHITE_SEMITONES[i + 1]) {
        return i
      }
    }
    return 0
  }

  private updateVisualKeys(): void {
    for (const [keyChar, el] of this.keyElements) {
      const isBlack = keyChar in BLACK_KEYS
      const semitone = isBlack ? BLACK_KEYS[keyChar] : WHITE_SEMITONES[WHITE_KEYS.indexOf(keyChar)]
      if (semitone !== undefined) {
        const note = semitoneToNote(semitone, this.octave)
        el.dataset.note = note
        const noteLabel = el.querySelector('.key-note')
        if (noteLabel) noteLabel.textContent = note
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return
    // Don't capture if user is typing in an input
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    const key = e.key.toLowerCase()
    if (this.heldKeys.has(key)) return

    const el = this.keyElements.get(key)
    if (!el) return

    e.preventDefault()
    this.heldKeys.add(key)
    el.classList.add('pressed')

    const note = el.dataset.note
    if (!note) return
    this.auditioner.play(note, '8n', 0.8)
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase()
    if (!this.heldKeys.has(key)) return

    this.heldKeys.delete(key)
    const el = this.keyElements.get(key)
    if (el) el.classList.remove('pressed')
  }

  private clearHeld(): void {
    for (const key of this.heldKeys) {
      const el = this.keyElements.get(key)
      if (el) el.classList.remove('pressed')
    }
    this.heldKeys.clear()
  }

  dispose(): void {
    document.removeEventListener('keydown', this.boundKeyDown)
    document.removeEventListener('keyup', this.boundKeyUp)
  }
}
