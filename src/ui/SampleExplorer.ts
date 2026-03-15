import {
  GM_INSTRUMENTS,
  GM_CATEGORIES,
  DRUM_HITS,
  type GMCategory,
  type GMInstrument,
  type DrumHit,
} from "../data/gm-instruments";
import { SampleAuditioner } from "../engine/SampleAuditioner";
import { Keyboard } from "./Keyboard";

export class SampleExplorer {
  readonly el: HTMLElement;
  private auditioner = new SampleAuditioner();
  private keyboard: Keyboard;
  private contentEl: HTMLElement;
  private searchInput: HTMLInputElement;
  private velocitySlider: HTMLInputElement;
  private velocityValue: HTMLSpanElement;
  private collapsed = true;
  private activeBtn: HTMLElement | null = null;

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "sample-explorer";

    // Header with toggle
    const header = document.createElement("div");
    header.className = "explorer-header";

    const heading = document.createElement("h2");
    heading.className = "explorer-heading";
    heading.textContent = "Sample Explorer";

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "explorer-toggle";
    toggleBtn.textContent = "Show";
    toggleBtn.addEventListener("click", () => {
      this.collapsed = !this.collapsed;
      this.contentEl.classList.toggle("collapsed", this.collapsed);
      toggleBtn.textContent = this.collapsed ? "Show" : "Hide";
    });

    header.append(heading, toggleBtn);

    // Content (collapsible)
    this.contentEl = document.createElement("div");
    this.contentEl.className = "explorer-content collapsed";

    // Controls row: search + velocity
    const controls = document.createElement("div");
    controls.className = "explorer-controls";

    this.searchInput = document.createElement("input");
    this.searchInput.type = "text";
    this.searchInput.placeholder = "Search instruments...";
    this.searchInput.className = "explorer-search";
    this.searchInput.addEventListener("input", () => this.filterInstruments());

    const velRow = document.createElement("div");
    velRow.className = "explorer-vel";

    const velLabel = document.createElement("span");
    velLabel.textContent = "Vel";
    velLabel.className = "control-label";

    this.velocitySlider = document.createElement("input");
    this.velocitySlider.type = "range";
    this.velocitySlider.min = "1";
    this.velocitySlider.max = "127";
    this.velocitySlider.value = "100";
    this.velocitySlider.className = "channel-slider";
    this.velocitySlider.addEventListener("input", () => {
      this.velocityValue.textContent = this.velocitySlider.value;
    });

    this.velocityValue = document.createElement("span");
    this.velocityValue.className = "control-value";
    this.velocityValue.textContent = "100";

    velRow.append(velLabel, this.velocitySlider, this.velocityValue);
    controls.append(this.searchInput, velRow);

    // Instrument grid
    const grid = document.createElement("div");
    grid.className = "explorer-grid";
    grid.id = "explorer-grid";

    this.renderCategories(grid);

    // Keyboard
    this.keyboard = new Keyboard(this.auditioner);

    this.contentEl.append(controls, grid, this.keyboard.el);
    this.el.append(header, this.contentEl);

    // Wire up auditioner state changes
    this.auditioner.setOnStateChange((state, sample) => {
      if (state === "ready" && sample) {
        this.keyboard.enable(sample);
      } else if (state === "loading") {
        this.keyboard.disable();
      }
    });
  }

  private getVelocity(): number {
    return Number(this.velocitySlider.value) / 127;
  }

  private renderCategories(grid: HTMLElement): void {
    // Melodic categories
    for (const category of GM_CATEGORIES) {
      const section = this.createCategorySection(category, getByCategory(category));
      grid.append(section);
    }

    // Drums section
    const drumSection = document.createElement("div");
    drumSection.className = "explorer-category";
    drumSection.dataset.category = "Drums";

    const drumHeading = document.createElement("h3");
    drumHeading.className = "category-heading";
    drumHeading.textContent = "Drums";
    drumSection.append(drumHeading);

    const drumList = document.createElement("div");
    drumList.className = "instrument-list";

    for (const hit of DRUM_HITS) {
      const btn = document.createElement("button");
      btn.className = "instrument-btn drum-btn";
      btn.textContent = hit;
      btn.dataset.drumHit = hit;
      btn.addEventListener("click", () => {
        this.setActive(btn);
        this.auditioner.playDrum(hit as DrumHit, this.getVelocity());
        this.keyboard.disable();
      });
      drumList.append(btn);
    }

    drumSection.append(drumList);
    grid.append(drumSection);
  }

  private createCategorySection(category: GMCategory, instruments: GMInstrument[]): HTMLElement {
    const section = document.createElement("div");
    section.className = "explorer-category";
    section.dataset.category = category;

    const heading = document.createElement("h3");
    heading.className = "category-heading";
    heading.textContent = category;
    section.append(heading);

    const list = document.createElement("div");
    list.className = "instrument-list";

    for (const inst of instruments) {
      const btn = document.createElement("button");
      btn.className = "instrument-btn";
      btn.textContent = inst.name;
      btn.dataset.sample = inst.sample;
      btn.addEventListener("click", () => this.handleInstrumentClick(btn, inst));
      list.append(btn);
    }

    section.append(list);
    return section;
  }

  private async handleInstrumentClick(btn: HTMLElement, inst: GMInstrument): Promise<void> {
    this.setActive(btn);
    btn.classList.add("loading");

    await this.auditioner.loadSample(inst.sample);

    btn.classList.remove("loading");

    if (this.auditioner.activeSample === inst.sample) {
      this.auditioner.play("C4", "8n", this.getVelocity());
    }
  }

  private setActive(btn: HTMLElement): void {
    this.activeBtn?.classList.remove("active");
    btn.classList.add("active");
    this.activeBtn = btn;
  }

  private filterInstruments(): void {
    const query = this.searchInput.value.toLowerCase().trim();
    const grid = document.getElementById("explorer-grid")!;
    const categories = grid.querySelectorAll<HTMLElement>(".explorer-category");

    for (const cat of categories) {
      const buttons = cat.querySelectorAll<HTMLElement>(".instrument-btn");
      let anyVisible = false;

      for (const btn of buttons) {
        const text = btn.textContent!.toLowerCase();
        const sample = btn.dataset.sample?.toLowerCase() ?? "";
        const match = !query || text.includes(query) || sample.includes(query);
        btn.style.display = match ? "" : "none";
        if (match) anyVisible = true;
      }

      // Also check category name
      const catName = cat.dataset.category?.toLowerCase() ?? "";
      if (!query || catName.includes(query)) anyVisible = true;

      cat.style.display = anyVisible ? "" : "none";
    }
  }

  /** Provide the auditioner to the inline sample picker. */
  getAuditioner(): SampleAuditioner {
    return this.auditioner;
  }

  dispose(): void {
    this.auditioner.dispose();
    this.keyboard.dispose();
  }
}

function getByCategory(category: GMCategory): GMInstrument[] {
  return GM_INSTRUMENTS.filter((i) => i.category === category);
}
