import * as Tone from 'tone'
import type { Metadata, Section } from '../schema/composition'
import { sectionTotalBars } from '../util/timing'

export interface TransportCallbacks {
  onBeat?: (bar: number, beat: number) => void
  onSection?: (sectionIndex: number) => void
  onStop?: () => void
  onLoopChange?: (loopIndex: number | null) => void
}

export interface SectionOffset {
  section: Section
  index: number
  startBar: number
  endBar: number
}

export class Transport {
  private sectionOffsets: SectionOffset[] = []
  private callbacks: TransportCallbacks = {}
  private beatEventId: number | null = null
  private totalBars = 0
  private metadata: Metadata | null = null
  private loopSectionIndex: number | null = null

  get position(): string {
    return Tone.getTransport().position as string
  }

  get playing(): boolean {
    return Tone.getTransport().state === 'started'
  }

  /** Current playback position as an absolute beat number (float). */
  getPositionBeats(): number {
    const beatsPerBar = this.metadata?.timeSignature[0] ?? 4
    const pos = Tone.getTransport().position as string
    const parts = pos.split(':').map(Number)
    return (parts[0] ?? 0) * beatsPerBar + (parts[1] ?? 0) + (parts[2] ?? 0) / 4
  }

  configure(metadata: Metadata, sections: Section[]): void {
    this.metadata = metadata
    const transport = Tone.getTransport()
    transport.stop()
    transport.cancel()
    transport.position = 0
    transport.bpm.value = metadata.bpm
    transport.timeSignature = metadata.timeSignature

    // Build section offset map
    this.sectionOffsets = []
    let barCursor = 0
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      const totalBars = sectionTotalBars(section.bars, section.repeat)
      this.sectionOffsets.push({
        section,
        index: i,
        startBar: barCursor,
        endBar: barCursor + totalBars,
      })
      barCursor += totalBars
    }
    this.totalBars = barCursor

    // Set loop length so transport stops at end
    transport.loop = false

    // Schedule auto-stop at the end using bar notation
    transport.scheduleOnce(() => {
      this.stop()
    }, `${this.totalBars}:0:0`)
  }

  setCallbacks(callbacks: TransportCallbacks): void {
    this.callbacks = callbacks
  }

  startBeatTracking(): void {
    if (this.beatEventId !== null) {
      Tone.getTransport().clear(this.beatEventId)
    }

    this.beatEventId = Tone.getTransport().scheduleRepeat(() => {
      if (!this.metadata) return

      const pos = Tone.getTransport().position as string
      const parts = pos.split(':').map(Number)
      const currentBar = parts[0]
      const currentBeat = Math.floor(parts[1])

      this.callbacks.onBeat?.(currentBar, currentBeat)

      // Check section transitions
      for (const offset of this.sectionOffsets) {
        if (currentBar === offset.startBar && currentBeat === 0) {
          this.callbacks.onSection?.(offset.index)
          break
        }
      }
    }, '4n')
  }

  async play(): Promise<void> {
    await Tone.start()
    this.startBeatTracking()
    Tone.getTransport().start()
  }

  pause(): void {
    Tone.getTransport().pause()
  }

  stop(): void {
    Tone.getTransport().stop()
    Tone.getTransport().position = 0
    this.callbacks.onStop?.()
  }

  seekToSection(index: number): void {
    const offset = this.sectionOffsets[index]
    if (!offset) return
    Tone.getTransport().position = `${offset.startBar}:0:0`
  }

  seekToBeat(beat: number): void {
    const beatsPerBar = this.metadata?.timeSignature[0] ?? 4
    const bar = Math.floor(beat / beatsPerBar)
    const remainder = beat - bar * beatsPerBar
    const beatPart = Math.floor(remainder)
    const sixteenth = Math.round((remainder - beatPart) * 4)
    Tone.getTransport().position = `${bar}:${beatPart}:${sixteenth}`
  }

  /** Toggle looping on a single section. Pass null to clear the loop. */
  setLoopSection(index: number | null): void {
    const transport = Tone.getTransport()

    if (index === null || index === this.loopSectionIndex) {
      // Clear loop
      transport.loop = false
      this.loopSectionIndex = null
      this.callbacks.onLoopChange?.(null)
      return
    }

    const offset = this.sectionOffsets[index]
    if (!offset) return

    transport.loop = true
    transport.loopStart = `${offset.startBar}:0:0`
    transport.loopEnd = `${offset.endBar}:0:0`
    transport.position = `${offset.startBar}:0:0`
    this.loopSectionIndex = index
    this.callbacks.onLoopChange?.(index)
  }

  getLoopSectionIndex(): number | null {
    return this.loopSectionIndex
  }

  getSectionOffsets(): SectionOffset[] {
    return this.sectionOffsets
  }

  getTotalBars(): number {
    return this.totalBars
  }

  getCurrentSectionIndex(): number {
    const pos = Tone.getTransport().position as string
    const currentBar = Number.parseInt(pos.split(':')[0], 10)

    for (let i = this.sectionOffsets.length - 1; i >= 0; i--) {
      if (currentBar >= this.sectionOffsets[i].startBar) {
        return i
      }
    }
    return 0
  }

  dispose(): void {
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    if (this.beatEventId !== null) {
      Tone.getTransport().clear(this.beatEventId)
      this.beatEventId = null
    }
  }
}
