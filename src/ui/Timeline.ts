import type { SonicForgeComposition, Section, InstrumentDef } from "../schema/composition";
import type { SectionOffset } from "../engine/Transport";

const COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ef4444", // red
  "#14b8a6", // teal
];

export class Timeline {
  readonly el: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private composition: SonicForgeComposition | null = null;
  private sectionOffsets: SectionOffset[] = [];
  private instruments: InstrumentDef[] = [];
  private totalBars = 0;
  private playheadBar = 0;
  private playheadBeat = 0;
  private onSeek?: (sectionIndex: number) => void;

  // Layout constants
  private readonly HEADER_HEIGHT = 28;
  private readonly ROW_HEIGHT = 32;
  private readonly LABEL_WIDTH = 100;

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "timeline";

    const heading = document.createElement("h2");
    heading.textContent = "Timeline";
    heading.className = "timeline-heading";

    this.canvas = document.createElement("canvas");
    this.canvas.className = "timeline-canvas";
    this.ctx = this.canvas.getContext("2d")!;

    this.el.append(heading, this.canvas);

    this.canvas.addEventListener("click", (e) => this.handleClick(e));

    // Resize observer
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(this.el);
  }

  setOnSeek(fn: (sectionIndex: number) => void): void {
    this.onSeek = fn;
  }

  load(
    composition: SonicForgeComposition,
    sectionOffsets: SectionOffset[],
    totalBars: number
  ): void {
    this.composition = composition;
    this.sectionOffsets = sectionOffsets;
    this.totalBars = totalBars;

    // Build unique instrument list preserving order
    const seen = new Set<string>();
    this.instruments = [];
    for (const inst of composition.instruments) {
      if (!seen.has(inst.id)) {
        seen.add(inst.id);
        this.instruments.push(inst);
      }
    }

    this.resize();
  }

  updatePlayhead(bar: number, beat: number): void {
    this.playheadBar = bar;
    this.playheadBeat = beat;
    this.draw();
  }

  reset(): void {
    this.composition = null;
    this.sectionOffsets = [];
    this.instruments = [];
    this.totalBars = 0;
    this.playheadBar = 0;
    this.playheadBeat = 0;
    this.draw();
  }

  private resize(): void {
    // Use clientWidth of the canvas (excludes container padding) to avoid overflow
    const width = this.canvas.clientWidth || this.el.clientWidth || 860;
    const height =
      this.HEADER_HEIGHT +
      Math.max(this.instruments.length, 1) * this.ROW_HEIGHT +
      4;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.draw();
  }

  private draw(): void {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    if (!this.composition || this.totalBars === 0) {
      ctx.fillStyle = "#555";
      ctx.font = "13px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Load a composition to see the timeline", w / 2, h / 2);
      return;
    }

    const gridLeft = this.LABEL_WIDTH;
    const gridWidth = w - gridLeft - 8;
    const barWidth = gridWidth / this.totalBars;

    // Draw section headers
    ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i < this.sectionOffsets.length; i++) {
      const so = this.sectionOffsets[i];
      const x = gridLeft + so.startBar * barWidth;
      const sectionWidth = (so.endBar - so.startBar) * barWidth;

      ctx.fillStyle = COLORS[i % COLORS.length] + "40";
      ctx.fillRect(x, 0, sectionWidth, this.HEADER_HEIGHT);

      ctx.fillStyle = "#ddd";
      ctx.fillText(
        so.section.name,
        x + sectionWidth / 2,
        this.HEADER_HEIGHT - 9
      );

      // Section divider
      if (i > 0) {
        ctx.strokeStyle = "#3a3a5a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }

    // Draw instrument labels and track rows
    ctx.textAlign = "right";
    ctx.font = "12px -apple-system, sans-serif";
    for (let r = 0; r < this.instruments.length; r++) {
      const y = this.HEADER_HEIGHT + r * this.ROW_HEIGHT;

      // Alternating row background
      if (r % 2 === 0) {
        ctx.fillStyle = "#ffffff06";
        ctx.fillRect(0, y, w, this.ROW_HEIGHT);
      }

      // Label
      ctx.fillStyle = "#aaa";
      ctx.fillText(
        this.instruments[r].name,
        gridLeft - 8,
        y + this.ROW_HEIGHT / 2 + 4
      );

      // Draw cells per section
      for (let s = 0; s < this.sectionOffsets.length; s++) {
        const so = this.sectionOffsets[s];
        const hasTrack = so.section.tracks.some(
          (t) => t.instrumentId === this.instruments[r].id
        );

        if (hasTrack) {
          const x = gridLeft + so.startBar * barWidth;
          const sectionWidth = (so.endBar - so.startBar) * barWidth;
          ctx.fillStyle = COLORS[s % COLORS.length] + "60";
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 3, sectionWidth - 4, this.ROW_HEIGHT - 6, 4);
          ctx.fill();
        }
      }
    }

    // Draw playhead
    const beatsPerBar = this.composition.metadata.timeSignature[0];
    const playheadPos =
      gridLeft +
      (this.playheadBar + this.playheadBeat / beatsPerBar) * barWidth;

    if (playheadPos >= gridLeft && playheadPos <= gridLeft + gridWidth) {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadPos, 0);
      ctx.lineTo(playheadPos, h);
      ctx.stroke();

      // Playhead triangle
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(playheadPos - 5, 0);
      ctx.lineTo(playheadPos + 5, 0);
      ctx.lineTo(playheadPos, 7);
      ctx.closePath();
      ctx.fill();
    }
  }

  private handleClick(e: MouseEvent): void {
    if (!this.composition || this.totalBars === 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const gridLeft = this.LABEL_WIDTH;
    const gridWidth = rect.width - gridLeft - 8;
    const barWidth = gridWidth / this.totalBars;

    if (x < gridLeft) return;

    const clickedBar = (x - gridLeft) / barWidth;

    for (let i = this.sectionOffsets.length - 1; i >= 0; i--) {
      if (clickedBar >= this.sectionOffsets[i].startBar) {
        this.onSeek?.(i);
        break;
      }
    }
  }
}
