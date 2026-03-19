import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import type { SectionOffset } from '../engine/Transport'
import type { InstrumentDef, SonicForgeComposition } from '../schema/composition'
import { compositionStore } from '../stores/CompositionStore'
import type { Unsubscribe } from '../stores/Store'
import { transportStore } from '../stores/TransportStore'
import { arrangement } from '../styles/components'
import { noteToMidi } from '../util/music'
import { durationToBeats, timeToBeats } from '../util/timing'

// ── Constants ────────────────────────────────────────────────────────

const COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#14b8a6',
]

const SECTION_HEADER_HEIGHT = 28
const BAR_NUMBER_HEIGHT = 20
const HEADER_HEIGHT = SECTION_HEADER_HEIGHT + BAR_NUMBER_HEIGHT
const PITCH_RULER_WIDTH = 48
const NOTE_ROW_HEIGHT = 8
const MIN_BEAT_PX = 12
const MAX_BEAT_PX = 80
const DEFAULT_BEAT_PX = 24
const MIN_NOTE_ROW_PX = 4
const MAX_NOTE_ROW_PX = 20
const BLACK_KEY_INDICES = new Set([1, 3, 6, 8, 10])
const FOLLOW_THRESHOLD = 0.75 // scroll when playhead reaches 75% of viewport width
const FOLLOW_TARGET = 0.2 // scroll to put playhead at 20% from left

// ── Types ────────────────────────────────────────────────────────────

export interface RenderNote {
  midiNote: number
  startBeat: number
  durationBeats: number
  instrumentIndex: number
  velocity: number
}

// ── Component ────────────────────────────────────────────────────────

@customElement('sf-arrangement')
export class SfArrangement extends LitElement {
  @state() private composition: SonicForgeComposition | null = null
  @state() private sectionOffsets: SectionOffset[] = []
  @state() private totalBars = 0
  @state() private playheadBar = 0
  @state() private playheadBeat = 0
  @state() private loopSectionIndex: number | null = null
  @state() private focusedTrack: number | null = null

  @state() private instruments: InstrumentDef[] = []
  private renderNotes: RenderNote[] = []
  private pitchMin = 0
  private pitchMax = 127
  private totalBeats = 0
  private beatsPerBar = 4

  // View transform
  private beatPx = DEFAULT_BEAT_PX
  private noteRowPx = NOTE_ROW_HEIGHT
  private scrollX = 0
  private scrollY = 0

  // Playhead interpolation & follow
  private interpolatedBeat = 0
  private followMode = true
  private isPlaying = false
  private rafId: number | null = null
  private getPositionBeats: (() => number) | null = null

  private canvas?: HTMLCanvasElement
  private ctx?: CanvasRenderingContext2D
  private resizeObserver?: ResizeObserver
  private unsubComposition?: Unsubscribe
  private unsubTransport?: Unsubscribe

  createRenderRoot() {
    return this
  }

  connectedCallback(): void {
    super.connectedCallback()

    const cs = compositionStore.state
    this.composition = cs.composition

    const ts = transportStore.state
    this.playheadBar = ts.bar
    this.playheadBeat = ts.beat
    this.loopSectionIndex = ts.loopSectionIndex

    this.unsubComposition = compositionStore.subscribe((s) => {
      this.composition = s.composition
    })

    this.unsubTransport = transportStore.subscribe((s) => {
      this.playheadBar = s.bar
      this.playheadBeat = s.beat
      this.loopSectionIndex = s.loopSectionIndex

      const wasPlaying = this.isPlaying
      this.isPlaying = s.playbackState === 'playing'

      if (this.isPlaying && !wasPlaying) {
        this.followMode = true
        this.startPlayheadAnimation()
      } else if (!this.isPlaying && wasPlaying) {
        this.stopPlayheadAnimation()
        if (s.playbackState === 'stopped') {
          this.followMode = true
        }
      }
    })
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unsubComposition?.()
    this.unsubTransport?.()
    this.resizeObserver?.disconnect()
    this.stopPlayheadAnimation()
  }

  /** Load section offset data (provided by engine after composition load). */
  loadSections(sectionOffsets: SectionOffset[], totalBars: number): void {
    this.sectionOffsets = sectionOffsets
    this.totalBars = totalBars
  }

  /** Set the focused track index (null = show all). Exposed for track selector. */
  setFocusedTrack(index: number | null): void {
    this.focusedTrack = index
  }

  /** Provide a function that returns the current playback position in beats (for smooth interpolation). */
  setPositionSource(fn: () => number): void {
    this.getPositionBeats = fn
  }

  /** Snap the viewport so the playhead is visible. */
  scrollToPlayhead(): void {
    const grid = this.gridRect()
    const visibleBeats = grid.width / this.beatPx
    this.scrollX = Math.max(0, this.interpolatedBeat - visibleBeats * FOLLOW_TARGET)
    this.clampScroll()
    this.resize()
  }

  /** Toggle follow mode. Returns the new state. */
  toggleFollow(): boolean {
    this.followMode = !this.followMode
    if (this.followMode && this.isPlaying) {
      this.scrollToPlayhead()
    }
    return this.followMode
  }

  get isFollowing(): boolean {
    return this.followMode
  }

  // ── Playhead animation ─────────────────────────────────────────────

  private startPlayheadAnimation(): void {
    if (this.rafId !== null) return
    const tick = () => {
      if (this.getPositionBeats) {
        this.interpolatedBeat = this.getPositionBeats()
      } else {
        this.interpolatedBeat = this.playheadBar * this.beatsPerBar + this.playheadBeat
      }

      if (this.followMode) {
        this.autoScroll()
      }

      this.resize()
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  private stopPlayheadAnimation(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    // Final position sync from store
    this.interpolatedBeat = this.playheadBar * this.beatsPerBar + this.playheadBeat
    this.resize()
  }

  private autoScroll(): void {
    const grid = this.gridRect()
    if (grid.width === 0) return

    const visibleBeats = grid.width / this.beatPx
    const playheadViewBeat = this.interpolatedBeat - this.scrollX
    const threshold = visibleBeats * FOLLOW_THRESHOLD

    if (playheadViewBeat > threshold || playheadViewBeat < 0) {
      this.scrollX = Math.max(0, this.interpolatedBeat - visibleBeats * FOLLOW_TARGET)
      this.clampScroll()
    }
  }

  protected willUpdate(): void {
    if (this.composition) {
      this.instruments = this.buildInstrumentList(this.composition)
      this.beatsPerBar = this.composition.metadata.timeSignature[0]
      this.totalBeats = this.totalBars * this.beatsPerBar
      this.buildNoteRenderList()
    } else {
      this.instruments = []
      this.renderNotes = []
      this.totalBeats = 0
    }
  }

  protected updated(): void {
    if (!this.canvas) {
      this.canvas = this.querySelector('canvas') as HTMLCanvasElement | undefined
      if (this.canvas) {
        this.ctx = this.canvas.getContext('2d') ?? undefined
        if (typeof ResizeObserver !== 'undefined') {
          this.resizeObserver = new ResizeObserver(() => this.resize())
          this.resizeObserver.observe(this)
        }
      }
    }

    this.resize()
  }

  // ── Data preparation ───────────────────────────────────────────────

  private buildInstrumentList(comp: SonicForgeComposition): InstrumentDef[] {
    const seen = new Set<string>()
    const result: InstrumentDef[] = []
    for (const inst of comp.instruments) {
      if (!seen.has(inst.id)) {
        seen.add(inst.id)
        result.push(inst)
      }
    }
    return result
  }

  private buildNoteRenderList(): void {
    const notes: RenderNote[] = []
    let minPitch = 127
    let maxPitch = 0
    const instrumentIndexMap = new Map<string, number>()
    for (let i = 0; i < this.instruments.length; i++) {
      instrumentIndexMap.set(this.instruments[i].id, i)
    }

    for (const so of this.sectionOffsets) {
      for (const track of so.section.tracks) {
        const instIdx = instrumentIndexMap.get(track.instrumentId)
        if (instIdx === undefined) continue

        for (const note of track.notes) {
          const midi = noteToMidi(note.pitch)
          if (midi === null) continue

          const startBeat = timeToBeats(note.time, this.beatsPerBar, so.startBar)
          const durBeats = durationToBeats(note.duration, this.beatsPerBar)

          notes.push({
            midiNote: midi,
            startBeat,
            durationBeats: durBeats,
            instrumentIndex: instIdx,
            velocity: note.velocity ?? 80,
          })

          if (midi < minPitch) minPitch = midi
          if (midi > maxPitch) maxPitch = midi
        }
      }
    }

    // Pad pitch range by an octave on each side, clamped to 0–127
    this.pitchMin = Math.max(0, minPitch - 12)
    this.pitchMax = Math.min(127, maxPitch + 12)
    if (notes.length === 0) {
      this.pitchMin = 48 // C3
      this.pitchMax = 84 // C6
    }

    this.renderNotes = notes
  }

  // ── View transform ─────────────────────────────────────────────────

  /** Convert absolute beat to pixel X relative to canvas origin. */
  private beatToX(beat: number): number {
    return PITCH_RULER_WIDTH + (beat - this.scrollX) * this.beatPx
  }

  /** Convert MIDI note number to pixel Y relative to canvas origin. Higher pitch = higher on screen. */
  private pitchToY(midi: number): number {
    return HEADER_HEIGHT + (this.pitchMax - midi - this.scrollY) * this.noteRowPx
  }

  /** Convert pixel X to beat position. */
  private xToBeat(px: number): number {
    return (px - PITCH_RULER_WIDTH) / this.beatPx + this.scrollX
  }

  /** Grid area dimensions in pixels. */
  private gridRect(): { left: number; top: number; width: number; height: number } {
    if (!this.canvas) return { left: 0, top: 0, width: 0, height: 0 }
    const dpr = window.devicePixelRatio || 1
    const w = this.canvas.width / dpr
    const h = this.canvas.height / dpr
    return {
      left: PITCH_RULER_WIDTH,
      top: HEADER_HEIGHT,
      width: w - PITCH_RULER_WIDTH,
      height: h - HEADER_HEIGHT,
    }
  }

  // ── Canvas sizing ──────────────────────────────────────────────────

  private resize(): void {
    if (!this.canvas || !this.ctx) return

    const width = this.canvas.clientWidth || 860
    const height = this.canvas.clientHeight || 300

    const dpr = window.devicePixelRatio || 1
    this.canvas.width = width * dpr
    this.canvas.height = height * dpr
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    this.draw()
  }

  // ── Drawing ────────────────────────────────────────────────────────

  private draw(): void {
    if (!this.canvas || !this.ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = this.canvas.width / dpr
    const h = this.canvas.height / dpr
    const ctx = this.ctx

    ctx.clearRect(0, 0, w, h)

    if (!this.composition || this.totalBars === 0) {
      ctx.fillStyle = '#555'
      ctx.font = '13px -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Load a composition to see the timeline', w / 2, h / 2)
      return
    }

    this.drawPianoRollGrid(ctx, w, h)
    this.drawNotes(ctx, w, h)
    this.drawPitchRuler(ctx, h)
    this.drawBarNumbers(ctx, w)
    this.drawSectionHeaders(ctx, w)
    this.drawLoopHighlight(ctx, h)
    this.drawPlayhead(ctx, h)
  }

  private drawPianoRollGrid(ctx: CanvasRenderingContext2D, w: number, _h: number): void {
    const grid = this.gridRect()

    // Pitch rows — alternating shading for accidentals
    for (let midi = this.pitchMin; midi <= this.pitchMax; midi++) {
      const y = this.pitchToY(midi)
      if (y < HEADER_HEIGHT || y > HEADER_HEIGHT + grid.height) continue

      const semitone = midi % 12
      if (BLACK_KEY_INDICES.has(semitone)) {
        ctx.fillStyle = '#ffffff08'
        ctx.fillRect(PITCH_RULER_WIDTH, y, grid.width, this.noteRowPx)
      }

      // Subtle line at each octave boundary (C notes)
      if (semitone === 0) {
        ctx.strokeStyle = '#ffffff20'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(PITCH_RULER_WIDTH, y + this.noteRowPx)
        ctx.lineTo(w, y + this.noteRowPx)
        ctx.stroke()
      }
    }

    // Bar lines and beat lines
    const visibleStartBeat = Math.max(0, this.scrollX)
    const visibleEndBeat = Math.min(this.totalBeats, this.scrollX + grid.width / this.beatPx)

    for (let beat = Math.floor(visibleStartBeat); beat <= visibleEndBeat; beat++) {
      const x = this.beatToX(beat)
      if (x < PITCH_RULER_WIDTH || x > w) continue

      const isBarLine = beat % this.beatsPerBar === 0
      if (isBarLine) {
        ctx.strokeStyle = '#ffffff25'
        ctx.lineWidth = 1
      } else if (this.beatPx >= 20) {
        // Only show beat lines when zoomed in enough
        ctx.strokeStyle = '#ffffff0d'
        ctx.lineWidth = 0.5
      } else {
        continue
      }

      ctx.beginPath()
      ctx.moveTo(x, HEADER_HEIGHT)
      ctx.lineTo(x, HEADER_HEIGHT + grid.height)
      ctx.stroke()
    }
  }

  private drawNotes(ctx: CanvasRenderingContext2D, w: number, _h: number): void {
    const grid = this.gridRect()
    const visibleStartBeat = this.scrollX
    const visibleEndBeat = this.scrollX + grid.width / this.beatPx

    for (const note of this.renderNotes) {
      // Cull notes outside visible area
      if (note.startBeat + note.durationBeats < visibleStartBeat) continue
      if (note.startBeat > visibleEndBeat) continue
      if (note.midiNote < this.pitchMin || note.midiNote > this.pitchMax) continue

      const x = this.beatToX(note.startBeat)
      const y = this.pitchToY(note.midiNote)
      const noteW = note.durationBeats * this.beatPx
      const noteH = this.noteRowPx - 1

      if (x + noteW < PITCH_RULER_WIDTH || x > w) continue

      const color = COLORS[note.instrumentIndex % COLORS.length]
      const velocityAlpha = 0.3 + (note.velocity / 127) * 0.7

      // Dim unfocused tracks
      const isFocused = this.focusedTrack === null || this.focusedTrack === note.instrumentIndex
      const alpha = isFocused ? velocityAlpha : velocityAlpha * 0.2

      ctx.fillStyle = this.hexWithAlpha(color, alpha)
      ctx.beginPath()
      ctx.roundRect(x, y, Math.max(noteW, 2), noteH, 2)
      ctx.fill()
    }
  }

  private drawPitchRuler(ctx: CanvasRenderingContext2D, h: number): void {
    // Background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, HEADER_HEIGHT, PITCH_RULER_WIDTH, h - HEADER_HEIGHT)

    ctx.font = '9px -apple-system, sans-serif'
    ctx.textAlign = 'right'

    for (let midi = this.pitchMin; midi <= this.pitchMax; midi++) {
      const semitone = midi % 12
      if (semitone !== 0) continue // Only label C notes (octave boundaries)

      const octave = Math.floor(midi / 12) - 1
      const y = this.pitchToY(midi)
      if (y < HEADER_HEIGHT || y > h) continue

      ctx.fillStyle = '#888'
      ctx.fillText(`C${octave}`, PITCH_RULER_WIDTH - 6, y + this.noteRowPx / 2 + 3)
    }

    // Separator line
    ctx.strokeStyle = '#ffffff15'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PITCH_RULER_WIDTH, HEADER_HEIGHT)
    ctx.lineTo(PITCH_RULER_WIDTH, h)
    ctx.stroke()
  }

  private drawBarNumbers(ctx: CanvasRenderingContext2D, w: number): void {
    // Background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(PITCH_RULER_WIDTH, SECTION_HEADER_HEIGHT, w - PITCH_RULER_WIDTH, BAR_NUMBER_HEIGHT)

    ctx.font = '9px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#666'

    const grid = this.gridRect()
    const visibleStartBeat = this.scrollX
    const visibleEndBeat = this.scrollX + grid.width / this.beatPx
    const startBar = Math.floor(visibleStartBeat / this.beatsPerBar)
    const endBar = Math.ceil(visibleEndBeat / this.beatsPerBar)

    for (let bar = startBar; bar <= Math.min(endBar, this.totalBars); bar++) {
      const x = this.beatToX(bar * this.beatsPerBar)
      if (x < PITCH_RULER_WIDTH || x > w) continue

      ctx.fillText(`${bar + 1}`, x, SECTION_HEADER_HEIGHT + BAR_NUMBER_HEIGHT - 5)
    }
  }

  private drawSectionHeaders(ctx: CanvasRenderingContext2D, _w: number): void {
    ctx.font = '11px -apple-system, sans-serif'
    ctx.textAlign = 'center'

    for (let i = 0; i < this.sectionOffsets.length; i++) {
      const so = this.sectionOffsets[i]
      const x1 = this.beatToX(so.startBar * this.beatsPerBar)
      const x2 = this.beatToX(so.endBar * this.beatsPerBar)
      const sectionWidth = x2 - x1

      ctx.fillStyle = `${COLORS[i % COLORS.length]}40`
      ctx.fillRect(x1, 0, sectionWidth, SECTION_HEADER_HEIGHT)

      ctx.fillStyle = '#ddd'
      ctx.fillText(so.section.name, x1 + sectionWidth / 2, SECTION_HEADER_HEIGHT - 9)

      if (i > 0) {
        ctx.strokeStyle = '#3a3a5a'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x1, 0)
        ctx.lineTo(x1, SECTION_HEADER_HEIGHT)
        ctx.stroke()
      }
    }
  }

  private drawLoopHighlight(ctx: CanvasRenderingContext2D, h: number): void {
    if (this.loopSectionIndex === null) return
    const lo = this.sectionOffsets[this.loopSectionIndex]
    if (!lo) return

    const lx = this.beatToX(lo.startBar * this.beatsPerBar)
    const rx = this.beatToX(lo.endBar * this.beatsPerBar)
    const lw = rx - lx

    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 3])
    ctx.strokeRect(lx, 0, lw, h)
    ctx.setLineDash([])

    ctx.fillStyle = '#f59e0b'
    ctx.font = 'bold 9px -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('LOOP', lx + 4, h - 4)
  }

  private drawPlayhead(ctx: CanvasRenderingContext2D, h: number): void {
    if (!this.composition) return
    // Use interpolated position during playback, store position when stopped
    const playheadBeatPos = this.isPlaying
      ? this.interpolatedBeat
      : this.playheadBar * this.beatsPerBar + this.playheadBeat
    const x = this.beatToX(playheadBeatPos)

    const grid = this.gridRect()
    if (x < PITCH_RULER_WIDTH || x > PITCH_RULER_WIDTH + grid.width) return

    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()

    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.moveTo(x - 5, 0)
    ctx.lineTo(x + 5, 0)
    ctx.lineTo(x, 7)
    ctx.closePath()
    ctx.fill()
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private hexWithAlpha(hex: string, alpha: number): string {
    const a = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, '0')
    return `${hex}${a}`
  }

  // ── Interaction ────────────────────────────────────────────────────

  private getSectionAtX(clientX: number): number | null {
    if (!this.canvas || !this.composition || this.totalBars === 0) return null

    const rect = this.canvas.getBoundingClientRect()
    const x = clientX - rect.left

    if (x < PITCH_RULER_WIDTH) return null

    const clickedBeat = this.xToBeat(x)
    for (let i = this.sectionOffsets.length - 1; i >= 0; i--) {
      if (clickedBeat >= this.sectionOffsets[i].startBar * this.beatsPerBar) {
        return i
      }
    }
    return null
  }

  private handleClick(e: MouseEvent): void {
    if (!this.canvas) return
    const rect = this.canvas.getBoundingClientRect()
    const y = e.clientY - rect.top

    // Click in section header → section-level seek
    if (y < SECTION_HEADER_HEIGHT) {
      const index = this.getSectionAtX(e.clientX)
      if (index === null) return
      this.dispatchEvent(
        new CustomEvent('arrangement-seek', {
          bubbles: true,
          detail: { sectionIndex: index },
        }),
      )
      return
    }

    // Click in grid → beat-level seek
    const x = e.clientX - rect.left
    if (x < PITCH_RULER_WIDTH) return

    const beat = this.xToBeat(x)
    if (beat < 0 || beat > this.totalBeats) return

    this.dispatchEvent(
      new CustomEvent('arrangement-seek-beat', {
        bubbles: true,
        detail: { beat },
      }),
    )
  }

  private handleDoubleClick(e: MouseEvent): void {
    const index = this.getSectionAtX(e.clientX)
    if (index === null) return

    const newIndex = index === this.loopSectionIndex ? null : index
    this.dispatchEvent(
      new CustomEvent('arrangement-loop', {
        bubbles: true,
        detail: { sectionIndex: newIndex },
      }),
    )
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault()

    if (e.ctrlKey || e.metaKey) {
      // Horizontal zoom
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newBeatPx = Math.max(MIN_BEAT_PX, Math.min(MAX_BEAT_PX, this.beatPx * zoomFactor))

      // Zoom toward cursor position
      if (this.canvas) {
        const rect = this.canvas.getBoundingClientRect()
        const cursorX = e.clientX - rect.left
        const beatAtCursor = this.xToBeat(cursorX)
        this.beatPx = newBeatPx
        this.scrollX = beatAtCursor - (cursorX - PITCH_RULER_WIDTH) / this.beatPx
        this.clampScroll()
      } else {
        this.beatPx = newBeatPx
      }
    } else if (e.shiftKey) {
      // Vertical zoom — use deltaY, falling back to deltaX (trackpads swap axes with shift)
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX
      if (delta === 0) return
      const zoomFactor = delta > 0 ? 0.9 : 1.1
      this.noteRowPx = Math.max(
        MIN_NOTE_ROW_PX,
        Math.min(MAX_NOTE_ROW_PX, this.noteRowPx * zoomFactor),
      )
    } else {
      // Scroll: deltaY → vertical pan, deltaX → horizontal pan
      this.scrollX += e.deltaX / this.beatPx
      this.scrollY += e.deltaY / this.noteRowPx
      this.clampScroll()
      // Disengage follow when user scrolls manually during playback
      if (this.isPlaying && Math.abs(e.deltaX) > 0) {
        this.followMode = false
      }
    }

    this.resize()
  }

  private clampScroll(): void {
    this.scrollX = Math.max(0, Math.min(this.totalBeats - 1, this.scrollX))
    this.scrollY = Math.max(0, Math.min(this.pitchMax - this.pitchMin, this.scrollY))
  }

  // ── Track selector ─────────────────────────────────────────────────

  private handleTrackClick(index: number): void {
    this.focusedTrack = this.focusedTrack === index ? null : index
  }

  private renderTrackSelector() {
    if (this.instruments.length === 0) return ''

    return html`
      <div class="${arrangement.trackSelector}">
        <button
          class=${this.focusedTrack === null ? arrangement.trackBtnAllActive : arrangement.trackBtnAll}
          @click=${() => {
            this.focusedTrack = null
          }}
        >All</button>
        ${this.instruments.map(
          (inst, i) => html`
            <button
              class=${this.focusedTrack === i ? arrangement.trackBtnActive : arrangement.trackBtn}
              @click=${() => this.handleTrackClick(i)}
            >${inst.name}</button>
          `,
        )}
      </div>
    `
  }

  // ── Render ─────────────────────────────────────────────────────────

  render() {
    return html`
      <div class="${arrangement.container}">
        <h2 class="${arrangement.heading}">Timeline</h2>
        <canvas
          class="${arrangement.canvas}"
          @click=${this.handleClick}
          @dblclick=${this.handleDoubleClick}
          @wheel=${this.handleWheel}
        ></canvas>
        ${this.renderTrackSelector()}
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sf-arrangement': SfArrangement
  }
}
