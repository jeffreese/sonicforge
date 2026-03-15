import { Engine } from "../engine/Engine";
import { TransportBar } from "./TransportBar";
import { CompositionLoader } from "./CompositionLoader";
import { Timeline } from "./Timeline";
import { Mixer } from "./Mixer";
import { SampleExplorer } from "./SampleExplorer";

export class App {
  private engine = new Engine();
  private transportBar: TransportBar;
  private loader: CompositionLoader;
  private timeline: Timeline;
  private mixer: Mixer;
  private sampleExplorer: SampleExplorer;

  constructor(private root: HTMLElement) {
    // Header
    const header = document.createElement("header");
    header.className = "app-header";
    const title = document.createElement("h1");
    title.textContent = "SonicForge";
    const subtitle = document.createElement("p");
    subtitle.textContent = "Browser-based music engine";
    header.append(title, subtitle);

    // Transport
    this.transportBar = new TransportBar(this.engine);

    // Timeline
    this.timeline = new Timeline();
    this.timeline.setOnSeek((index) => {
      this.engine.seekToSection(index);
    });

    // Mixer
    this.mixer = new Mixer();

    // Sample Explorer
    this.sampleExplorer = new SampleExplorer();

    // Wire auditioner into mixer for inline sample picking
    this.mixer.setAuditioner(this.sampleExplorer.getAuditioner());
    this.mixer.setCallbacks({
      onSampleChange: (instrumentId, newSample) => {
        this.engine.swapSample(instrumentId, newSample);
      },
    });

    // Loader
    this.loader = new CompositionLoader({
      onLoad: (json) => this.handleLoad(json),
      onError: (err) => this.loader.showError(err.message),
    });

    // Composition info display
    const compositionInfo = document.createElement("div");
    compositionInfo.className = "composition-info";
    compositionInfo.id = "composition-info";

    // Assemble
    root.append(
      header,
      this.transportBar.el,
      this.timeline.el,
      compositionInfo,
      this.mixer.el,
      this.sampleExplorer.el,
      this.loader.el
    );

    // Engine callbacks
    this.engine.setCallbacks({
      onStateChange: (state) => {
        this.transportBar.updateState(state);
      },
      onBeat: (bar, beat) => {
        const transport = this.engine.getTransport();
        const sectionIndex = transport.getCurrentSectionIndex();
        const offsets = transport.getSectionOffsets();
        const section = offsets[sectionIndex];

        const sectionName = section?.section.name;
        const localBar = section ? bar - section.startBar : bar;
        this.transportBar.updatePosition(localBar, beat, sectionName);
        this.timeline.updatePlayhead(bar, beat);
      },
      onStop: () => {
        this.transportBar.updatePosition(0, 0);
        this.timeline.updatePlayhead(0, 0);
      },
      onError: (err) => {
        this.loader.showError(err.message);
      },
    });

    // Keyboard shortcut: spacebar = play/pause
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        if (this.engine.state === "playing") {
          this.engine.pause();
        } else if (this.engine.state === "ready" || this.engine.state === "paused") {
          this.engine.play();
        }
      }
    });
  }

  private async handleLoad(json: string): Promise<void> {
    try {
      await this.engine.load(json);
      this.showCompositionInfo();
      this.loader.clearError();

      // Load timeline
      const comp = this.engine.getComposition()!;
      const transport = this.engine.getTransport();
      this.timeline.load(comp, transport.getSectionOffsets(), transport.getTotalBars());

      // Load mixer with sample map
      this.mixer.load(this.engine.getMixBus(), this.engine.getSampleMap());
    } catch {
      // Error already handled via callback
    }
  }

  private showCompositionInfo(): void {
    const comp = this.engine.getComposition();
    if (!comp) return;

    const info = document.getElementById("composition-info")!;
    const { metadata, instruments, sections } = comp;

    info.innerHTML = `
      <h2>${metadata.title}</h2>
      <div class="info-row">
        <span class="info-label">BPM:</span> ${metadata.bpm}
        <span class="info-label">Key:</span> ${metadata.key}
        <span class="info-label">Time:</span> ${metadata.timeSignature[0]}/${metadata.timeSignature[1]}
      </div>
      ${metadata.description ? `<p class="info-desc">${metadata.description}</p>` : ""}
      <div class="info-row">
        <span class="info-label">Instruments:</span> ${instruments.map((i) => i.name).join(", ")}
      </div>
      <div class="info-row">
        <span class="info-label">Sections:</span> ${sections.map((s) => s.name).join(" → ")}
      </div>
    `;
  }
}
