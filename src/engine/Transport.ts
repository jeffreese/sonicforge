import * as Tone from "tone";
import type { Metadata, Section } from "../schema/composition";
import { sectionTotalBars } from "../util/timing";

export interface TransportCallbacks {
  onBeat?: (bar: number, beat: number) => void;
  onSection?: (sectionIndex: number) => void;
  onStop?: () => void;
}

export interface SectionOffset {
  section: Section;
  index: number;
  startBar: number;
  endBar: number;
}

export class Transport {
  private sectionOffsets: SectionOffset[] = [];
  private callbacks: TransportCallbacks = {};
  private beatEventId: number | null = null;
  private totalBars = 0;
  private metadata: Metadata | null = null;

  get position(): string {
    return Tone.getTransport().position as string;
  }

  get playing(): boolean {
    return Tone.getTransport().state === "started";
  }

  configure(metadata: Metadata, sections: Section[]): void {
    this.metadata = metadata;
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    transport.position = 0;
    transport.bpm.value = metadata.bpm;
    transport.timeSignature = metadata.timeSignature;

    // Build section offset map
    this.sectionOffsets = [];
    let barCursor = 0;
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const totalBars = sectionTotalBars(section.bars, section.repeat);
      this.sectionOffsets.push({
        section,
        index: i,
        startBar: barCursor,
        endBar: barCursor + totalBars,
      });
      barCursor += totalBars;
    }
    this.totalBars = barCursor;

    // Set loop length so transport stops at end
    transport.loop = false;

    // Schedule auto-stop at the end using bar notation
    transport.scheduleOnce(() => {
      this.stop();
    }, `${this.totalBars}:0:0`);
  }

  setCallbacks(callbacks: TransportCallbacks): void {
    this.callbacks = callbacks;
  }

  startBeatTracking(): void {
    if (this.beatEventId !== null) {
      Tone.getTransport().clear(this.beatEventId);
    }

    this.beatEventId = Tone.getTransport().scheduleRepeat(() => {
      if (!this.metadata) return;

      const pos = Tone.getTransport().position as string;
      const parts = pos.split(":").map(Number);
      const currentBar = parts[0];
      const currentBeat = Math.floor(parts[1]);

      this.callbacks.onBeat?.(currentBar, currentBeat);

      // Check section transitions
      for (const offset of this.sectionOffsets) {
        if (currentBar === offset.startBar && currentBeat === 0) {
          this.callbacks.onSection?.(offset.index);
          break;
        }
      }
    }, "4n");
  }

  async play(): Promise<void> {
    await Tone.start();
    this.startBeatTracking();
    Tone.getTransport().start();
  }

  pause(): void {
    Tone.getTransport().pause();
  }

  stop(): void {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    this.callbacks.onStop?.();
  }

  seekToSection(index: number): void {
    const offset = this.sectionOffsets[index];
    if (!offset) return;
    Tone.getTransport().position = `${offset.startBar}:0:0`;
  }

  getSectionOffsets(): SectionOffset[] {
    return this.sectionOffsets;
  }

  getTotalBars(): number {
    return this.totalBars;
  }

  getCurrentSectionIndex(): number {
    const pos = Tone.getTransport().position as string;
    const currentBar = parseInt(pos.split(":")[0], 10);

    for (let i = this.sectionOffsets.length - 1; i >= 0; i--) {
      if (currentBar >= this.sectionOffsets[i].startBar) {
        return i;
      }
    }
    return 0;
  }

  dispose(): void {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    if (this.beatEventId !== null) {
      Tone.getTransport().clear(this.beatEventId);
      this.beatEventId = null;
    }
  }
}
