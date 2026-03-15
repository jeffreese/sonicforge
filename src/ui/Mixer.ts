import type { MixBus, ChannelState } from "../engine/MixBus";

export class Mixer {
  readonly el: HTMLElement;
  private channelEls = new Map<string, HTMLElement>();
  private mixBus: MixBus | null = null;

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "mixer";

    const heading = document.createElement("h2");
    heading.textContent = "Mixer";
    heading.className = "mixer-heading";
    this.el.append(heading);
  }

  load(mixBus: MixBus): void {
    this.mixBus = mixBus;
    this.render();

    mixBus.setOnChange(() => this.updateAll());
  }

  reset(): void {
    this.mixBus = null;
    this.channelEls.clear();
    // Remove everything except heading
    while (this.el.children.length > 1) {
      this.el.removeChild(this.el.lastChild!);
    }
  }

  private render(): void {
    if (!this.mixBus) return;

    // Clear old channels
    this.channelEls.clear();
    while (this.el.children.length > 1) {
      this.el.removeChild(this.el.lastChild!);
    }

    const strip = document.createElement("div");
    strip.className = "mixer-strip";

    for (const state of this.mixBus.getStates()) {
      const ch = this.createChannel(state);
      this.channelEls.set(state.id, ch);
      strip.append(ch);
    }

    this.el.append(strip);
  }

  private createChannel(state: ChannelState): HTMLElement {
    const ch = document.createElement("div");
    ch.className = "mixer-channel";
    ch.dataset.id = state.id;

    // Name
    const name = document.createElement("div");
    name.className = "channel-name";
    name.textContent = state.name;

    // Volume slider
    const volRow = document.createElement("div");
    volRow.className = "channel-control";

    const volLabel = document.createElement("span");
    volLabel.className = "control-label";
    volLabel.textContent = "Vol";

    const volSlider = document.createElement("input");
    volSlider.type = "range";
    volSlider.min = "0";
    volSlider.max = "100";
    volSlider.value = String(state.volume);
    volSlider.className = "channel-slider";
    volSlider.addEventListener("input", () => {
      this.mixBus?.setVolume(state.id, Number(volSlider.value));
      volValue.textContent = volSlider.value;
    });

    const volValue = document.createElement("span");
    volValue.className = "control-value";
    volValue.textContent = String(state.volume);

    volRow.append(volLabel, volSlider, volValue);

    // Pan slider
    const panRow = document.createElement("div");
    panRow.className = "channel-control";

    const panLabel = document.createElement("span");
    panLabel.className = "control-label";
    panLabel.textContent = "Pan";

    const panSlider = document.createElement("input");
    panSlider.type = "range";
    panSlider.min = "-100";
    panSlider.max = "100";
    panSlider.value = String(Math.round(state.pan * 100));
    panSlider.className = "channel-slider";
    panSlider.addEventListener("input", () => {
      const val = Number(panSlider.value) / 100;
      this.mixBus?.setPan(state.id, val);
      panValue.textContent = this.formatPan(val);
    });

    const panValue = document.createElement("span");
    panValue.className = "control-value";
    panValue.textContent = this.formatPan(state.pan);

    panRow.append(panLabel, panSlider, panValue);

    // Mute / Solo buttons
    const btnRow = document.createElement("div");
    btnRow.className = "channel-buttons";

    const muteBtn = document.createElement("button");
    muteBtn.textContent = "M";
    muteBtn.className = "channel-btn mute-btn";
    if (state.muted) muteBtn.classList.add("active");
    muteBtn.addEventListener("click", () => {
      const s = this.mixBus?.getState(state.id);
      if (s) this.mixBus?.setMuted(state.id, !s.muted);
    });

    const soloBtn = document.createElement("button");
    soloBtn.textContent = "S";
    soloBtn.className = "channel-btn solo-btn";
    if (state.soloed) soloBtn.classList.add("active");
    soloBtn.addEventListener("click", () => {
      const s = this.mixBus?.getState(state.id);
      if (s) this.mixBus?.setSoloed(state.id, !s.soloed);
    });

    btnRow.append(muteBtn, soloBtn);

    ch.append(name, volRow, panRow, btnRow);
    return ch;
  }

  private updateAll(): void {
    if (!this.mixBus) return;

    for (const state of this.mixBus.getStates()) {
      const ch = this.channelEls.get(state.id);
      if (!ch) continue;

      const muteBtn = ch.querySelector(".mute-btn");
      const soloBtn = ch.querySelector(".solo-btn");
      if (muteBtn) muteBtn.classList.toggle("active", state.muted);
      if (soloBtn) soloBtn.classList.toggle("active", state.soloed);
    }
  }

  private formatPan(pan: number): string {
    if (Math.abs(pan) < 0.01) return "C";
    return pan < 0 ? `L${Math.round(Math.abs(pan) * 100)}` : `R${Math.round(pan * 100)}`;
  }
}
