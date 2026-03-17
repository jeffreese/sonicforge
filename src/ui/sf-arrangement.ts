import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import type { SectionOffset } from '../engine/Transport'
import type { InstrumentDef, SonicForgeComposition } from '../schema/composition'
import { compositionStore } from '../stores/CompositionStore'
import type { Unsubscribe } from '../stores/Store'
import { transportStore } from '../stores/TransportStore'
import { arrangement } from '../styles/components'

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

const HEADER_HEIGHT = 28
const ROW_HEIGHT = 32
const LABEL_WIDTH = 100

@customElement('sf-arrangement')
export class SfArrangement extends LitElement {
  @state() private composition: SonicForgeComposition | null = null
  @state() private sectionOffsets: SectionOffset[] = []
  @state() private totalBars = 0
  @state() private playheadBar = 0
  @state() private playheadBeat = 0
  @state() private loopSectionIndex: number | null = null

  private instruments: InstrumentDef[] = []
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
    })
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unsubComposition?.()
    this.unsubTransport?.()
    this.resizeObserver?.disconnect()
  }

  /** Load section offset data (provided by engine after composition load). */
  loadSections(sectionOffsets: SectionOffset[], totalBars: number): void {
    this.sectionOffsets = sectionOffsets
    this.totalBars = totalBars
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

    if (this.composition) {
      this.instruments = this.buildInstrumentList(this.composition)
    } else {
      this.instruments = []
    }

    this.resize()
  }

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

  private resize(): void {
    if (!this.canvas || !this.ctx) return

    const width = this.canvas.clientWidth || 860
    const height = HEADER_HEIGHT + Math.max(this.instruments.length, 1) * ROW_HEIGHT + 4

    const dpr = window.devicePixelRatio || 1
    this.canvas.width = width * dpr
    this.canvas.height = height * dpr
    this.canvas.style.height = `${height}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    this.draw()
  }

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

    const gridLeft = LABEL_WIDTH
    const gridWidth = w - gridLeft - 8
    const barWidth = gridWidth / this.totalBars

    // Section headers
    ctx.font = '11px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    for (let i = 0; i < this.sectionOffsets.length; i++) {
      const so = this.sectionOffsets[i]
      const x = gridLeft + so.startBar * barWidth
      const sectionWidth = (so.endBar - so.startBar) * barWidth

      ctx.fillStyle = `${COLORS[i % COLORS.length]}40`
      ctx.fillRect(x, 0, sectionWidth, HEADER_HEIGHT)

      ctx.fillStyle = '#ddd'
      ctx.fillText(so.section.name, x + sectionWidth / 2, HEADER_HEIGHT - 9)

      if (i > 0) {
        ctx.strokeStyle = '#3a3a5a'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
    }

    // Instrument rows
    ctx.textAlign = 'right'
    ctx.font = '12px -apple-system, sans-serif'
    for (let r = 0; r < this.instruments.length; r++) {
      const y = HEADER_HEIGHT + r * ROW_HEIGHT

      if (r % 2 === 0) {
        ctx.fillStyle = '#ffffff06'
        ctx.fillRect(0, y, w, ROW_HEIGHT)
      }

      ctx.fillStyle = '#aaa'
      ctx.fillText(this.instruments[r].name, gridLeft - 8, y + ROW_HEIGHT / 2 + 4)

      for (let s = 0; s < this.sectionOffsets.length; s++) {
        const so = this.sectionOffsets[s]
        const hasTrack = so.section.tracks.some((t) => t.instrumentId === this.instruments[r].id)

        if (hasTrack) {
          const x = gridLeft + so.startBar * barWidth
          const sectionWidth = (so.endBar - so.startBar) * barWidth
          ctx.fillStyle = `${COLORS[s % COLORS.length]}60`
          ctx.beginPath()
          ctx.roundRect(x + 2, y + 3, sectionWidth - 4, ROW_HEIGHT - 6, 4)
          ctx.fill()
        }
      }
    }

    // Loop highlight
    if (this.loopSectionIndex !== null) {
      const lo = this.sectionOffsets[this.loopSectionIndex]
      if (lo) {
        const lx = gridLeft + lo.startBar * barWidth
        const lw = (lo.endBar - lo.startBar) * barWidth
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
    }

    // Playhead
    const beatsPerBar = this.composition.metadata.timeSignature[0]
    const playheadPos = gridLeft + (this.playheadBar + this.playheadBeat / beatsPerBar) * barWidth

    if (playheadPos >= gridLeft && playheadPos <= gridLeft + gridWidth) {
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playheadPos, 0)
      ctx.lineTo(playheadPos, h)
      ctx.stroke()

      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.moveTo(playheadPos - 5, 0)
      ctx.lineTo(playheadPos + 5, 0)
      ctx.lineTo(playheadPos, 7)
      ctx.closePath()
      ctx.fill()
    }
  }

  private getSectionAtX(clientX: number): number | null {
    if (!this.canvas || !this.composition || this.totalBars === 0) return null

    const rect = this.canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const gridWidth = rect.width - LABEL_WIDTH - 8
    const barWidth = gridWidth / this.totalBars

    if (x < LABEL_WIDTH) return null

    const clickedBar = (x - LABEL_WIDTH) / barWidth
    for (let i = this.sectionOffsets.length - 1; i >= 0; i--) {
      if (clickedBar >= this.sectionOffsets[i].startBar) {
        return i
      }
    }
    return null
  }

  private handleClick(e: MouseEvent): void {
    const index = this.getSectionAtX(e.clientX)
    if (index === null) return

    this.dispatchEvent(
      new CustomEvent('arrangement-seek', {
        bubbles: true,
        detail: { sectionIndex: index },
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

  render() {
    return html`
      <div class="${arrangement.container}">
        <h2 class="${arrangement.heading}">Timeline</h2>
        <canvas
          class="${arrangement.canvas}"
          @click=${this.handleClick}
          @dblclick=${this.handleDoubleClick}
        ></canvas>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sf-arrangement': SfArrangement
  }
}
