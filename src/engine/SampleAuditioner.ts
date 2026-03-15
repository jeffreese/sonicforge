import * as Tone from "tone";
import { DrumKit } from "./DrumKit";
import type { DrumHit } from "../data/gm-instruments";
import { drumHitToNote } from "../util/music";
import { loadSampleData, toFlatNoteName } from "./SampleLoader";

export type AuditionerState = "idle" | "loading" | "ready";

/**
 * Standalone sample previewer. Loads instruments on demand, caches them,
 * and plays one-shot notes through a dedicated preview channel.
 */
export class SampleAuditioner {
  private cache = new Map<string, Tone.Sampler>();
  private drumKit: DrumKit | null = null;
  private previewChannel = new Tone.Channel(0, 0).toDestination();
  private currentSample: string | null = null;
  private _state: AuditionerState = "idle";
  private onStateChange?: (state: AuditionerState, sample: string | null) => void;

  setOnStateChange(fn: (state: AuditionerState, sample: string | null) => void): void {
    this.onStateChange = fn;
  }

  get state(): AuditionerState {
    return this._state;
  }

  get activeSample(): string | null {
    return this.currentSample;
  }

  private setState(state: AuditionerState): void {
    this._state = state;
    this.onStateChange?.(state, this.currentSample);
  }

  /** Load an instrument sample (cached after first load). */
  async loadSample(sampleName: string): Promise<void> {
    this.currentSample = sampleName;

    if (this.cache.has(sampleName)) {
      this.setState("ready");
      return;
    }

    this.setState("loading");

    try {
      const sampleData = await loadSampleData(sampleName);

      await new Promise<void>((resolve, reject) => {
        const sampler = new Tone.Sampler({
          urls: sampleData.urls,
          baseUrl: sampleData.baseUrl,
          onload: () => {
            sampler.connect(this.previewChannel);
            this.cache.set(sampleName, sampler);
            resolve();
          },
          onerror: (err) => reject(err),
        });
      });

      // Only mark ready if this is still the active sample
      if (this.currentSample === sampleName) {
        this.setState("ready");
      }
    } catch (err) {
      console.warn(`SampleAuditioner: failed to load ${sampleName}`, err);
      if (this.currentSample === sampleName) {
        this.setState("idle");
      }
    }
  }

  /** Play a note on the currently loaded sample. */
  play(note: string, duration: string = "8n", velocity: number = 0.8): void {
    if (!this.currentSample) return;

    const sampler = this.cache.get(this.currentSample);
    if (!sampler) return;

    const flatNote = toFlatNoteName(note);
    sampler.triggerAttackRelease(flatNote, duration, Tone.now(), velocity);
  }

  /** Play a drum hit via the synthesized DrumKit. */
  playDrum(hit: DrumHit, velocity: number = 0.8): void {
    if (!this.drumKit) {
      this.drumKit = new DrumKit();
      this.drumKit.connect(this.previewChannel);
    }

    const note = drumHitToNote(hit);
    if (note) {
      this.drumKit.triggerAttackRelease(note, "8n", Tone.now(), velocity);
    }
  }

  /** Stop any ringing notes. */
  stop(): void {
    if (this.currentSample) {
      const sampler = this.cache.get(this.currentSample);
      if (sampler) sampler.releaseAll();
    }
  }

  /** Get the currently loaded sampler (for keyboard mode). */
  getCurrentSampler(): Tone.Sampler | null {
    if (!this.currentSample) return null;
    return this.cache.get(this.currentSample) ?? null;
  }

  dispose(): void {
    for (const [, sampler] of this.cache) {
      sampler.dispose();
    }
    this.cache.clear();
    this.drumKit?.dispose();
    this.drumKit = null;
    this.previewChannel.dispose();
    this.currentSample = null;
    this._state = "idle";
  }
}
