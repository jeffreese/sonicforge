import * as Tone from "tone";
import { DRUM_MAP, midiToNoteName } from "../util/music";

/**
 * Reverse map: MIDI note name → drum hit name.
 * TrackPlayer converts hit names to MIDI notes via drumHitToNote();
 * DrumKit maps them back to route to the correct synth.
 */
const NOTE_TO_HIT: Record<string, string> = {};
for (const [hit, midi] of Object.entries(DRUM_MAP)) {
  NOTE_TO_HIT[midiToNoteName(midi)] = hit;
}

function makeMetalSynth(
  freq: number,
  decay: number,
  release: number,
  modIndex: number,
  resonance: number
): Tone.MetalSynth {
  const synth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay, release },
    harmonicity: 5.1,
    modulationIndex: modIndex,
    resonance,
    octaves: 1.5,
  });
  synth.frequency.value = freq;
  return synth;
}

/**
 * Synthesized drum kit using Tone.js synths.
 * Extends Tone.Gain so it plugs into the EffectsChain as a ToneAudioNode.
 */
export class DrumKit extends Tone.Gain {
  private kick: Tone.MembraneSynth;
  private snareNoise: Tone.NoiseSynth;
  private snareBody: Tone.MembraneSynth;
  private hihat: Tone.MetalSynth;
  private hihatOpen: Tone.MetalSynth;
  private crash: Tone.MetalSynth;
  private ride: Tone.MetalSynth;
  private tomLow: Tone.MembraneSynth;
  private tomMid: Tone.MembraneSynth;
  private tomHigh: Tone.MembraneSynth;

  constructor() {
    super(1);

    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
    }).connect(this);

    this.snareNoise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
    }).connect(this);

    this.snareBody = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 4,
      oscillator: { type: "triangle" },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
    }).connect(this);

    this.hihat = makeMetalSynth(400, 0.05, 0.01, 32, 4000).connect(this);
    this.hihatOpen = makeMetalSynth(400, 0.3, 0.08, 32, 4000).connect(this);
    this.crash = makeMetalSynth(300, 1.0, 0.3, 40, 3500).connect(this);
    this.ride = makeMetalSynth(350, 0.6, 0.15, 28, 3800).connect(this);

    this.tomLow = new Tone.MembraneSynth({
      pitchDecay: 0.03,
      octaves: 5,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
    }).connect(this);

    this.tomMid = new Tone.MembraneSynth({
      pitchDecay: 0.03,
      octaves: 5,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 },
    }).connect(this);

    this.tomHigh = new Tone.MembraneSynth({
      pitchDecay: 0.03,
      octaves: 5,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
    }).connect(this);
  }

  /**
   * Trigger a drum hit by MIDI note name.
   * The note name is the output of drumHitToNote() (e.g. "C2" for kick).
   */
  triggerAttackRelease(
    note: string,
    duration: number | string,
    time?: number,
    velocity?: number
  ): void {
    const hit = NOTE_TO_HIT[note];
    if (!hit) return;
    const vel = velocity ?? 0.8;
    const t = time ?? Tone.now();

    switch (hit) {
      case "kick":
        this.kick.triggerAttackRelease("C1", duration, t, vel);
        break;
      case "snare":
        this.snareNoise.triggerAttackRelease(duration, t, vel * 0.8);
        this.snareBody.triggerAttackRelease("E2", duration, t, vel * 0.5);
        break;
      case "hihat":
        this.hihat.triggerAttackRelease(0.03, t, vel * 0.6);
        break;
      case "hihat-open":
        this.hihatOpen.triggerAttackRelease(0.15, t, vel * 0.6);
        break;
      case "crash":
        this.crash.triggerAttackRelease(0.8, t, vel * 0.5);
        break;
      case "ride":
        this.ride.triggerAttackRelease(0.4, t, vel * 0.5);
        break;
      case "tom-low":
        this.tomLow.triggerAttackRelease("G1", duration, t, vel);
        break;
      case "tom-mid":
        this.tomMid.triggerAttackRelease("C2", duration, t, vel);
        break;
      case "tom-high":
        this.tomHigh.triggerAttackRelease("E2", duration, t, vel);
        break;
    }
  }

  dispose(): this {
    this.kick.dispose();
    this.snareNoise.dispose();
    this.snareBody.dispose();
    this.hihat.dispose();
    this.hihatOpen.dispose();
    this.crash.dispose();
    this.ride.dispose();
    this.tomLow.dispose();
    this.tomMid.dispose();
    this.tomHigh.dispose();
    super.dispose();
    return this;
  }
}
