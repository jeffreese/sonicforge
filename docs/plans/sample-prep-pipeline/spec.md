# Sample Prep Pipeline

## Overview

A sample preparation pipeline that trims leading silence, normalizes loudness, and extracts metadata for all oneshot samples in `public/samples/oneshots/`. Addresses two classes of friction observed during composition authoring that each required multiple debug iterations to identify:

1. **Timing drift.** Oneshot drum samples with pre-attack silence (dead audio frames before the transient) sound late when scheduled alongside synthesized instruments (synth bass, synth pads) or sampled instruments (piano) that have near-zero onset latency. During the Goldberg Aria bass-techno session, we spent three `/iterate` cycles on "the drums feel wrong" before identifying that the issue was sample-level pre-attack silence, not note timing, velocity patterns, or grid alignment. The fix was swapping to the synthesized DrumKit — which works but sacrifices the timbral character of the oneshot samples.

2. **Loudness imbalance.** Different oneshot samples and synth presets have different inherent loudness levels. The `reese_bass` preset was "overpowering even at low volume" because its peak amplitude was much higher than the piano's. The `acid_bass` preset had the same issue. Adjusting `defaultVolume` is a workaround — it compensates rather than addresses, because the volume control is fighting against an uneven baseline rather than scaling from a consistent one.

Both problems have the same root cause: the oneshot samples from Freesound were committed as-is, without normalization or quality control. The GM instrument samples went through `scripts/extract-samples.py` which has its own extraction pipeline, but the oneshots bypassed that.

## Why now

The timing issue is a playback-quality problem that affects every composition using oneshot drums. The current workaround (use synthesized DrumKit instead) trades timing accuracy for timbral variety — composers can't use the acoustic Ludwig kick or the brass snare without accepting timing drift. As the oneshot library grows (the sampled-drums plan in the backlog adds GM soundfont drum samples), the problem compounds: more samples, more latency variance, more debugging sessions like the one that motivated this spec.

## Requirements

### Phase 1: Trim + Normalize (destructive, modifies sample files)

For every `.wav`, `.ogg`, `.m4a`, `.aiff` file under `public/samples/oneshots/`:

1. **Detect onset.** Find the first audio frame whose absolute amplitude exceeds a threshold (e.g., -40 dBFS). This is the "true start" of the sound.

2. **Trim leading silence.** Crop everything before the onset, leaving a small guard margin (~1ms / ~44 samples at 44.1kHz) to avoid cutting into the transient's attack phase. The guard margin prevents an audible click from starting playback mid-waveform.

3. **Peak-normalize.** Scale the entire file so the peak amplitude hits a consistent target (e.g., -1 dBFS). This establishes a uniform loudness baseline across all oneshot samples, so `defaultVolume` values in compositions are meaningful relative comparisons rather than compensation for per-sample recording levels.

4. **Re-encode** to the file's original format at the same sample rate and bit depth. Preserve the original filename — the composition JSON references these paths, so renaming would break existing compositions.

5. **Log the before/after metrics** for each file: original onset latency (ms), trimmed amount, original peak (dBFS), normalized peak, file size delta. This log serves as an audit trail and helps validate the pipeline's behavior.

### Phase 2: Extract Metadata (additive, new file)

After trim+normalize, measure and record per-sample metadata in a machine-readable format:

**File:** `public/samples/oneshots/metadata.json`

```json
{
  "samples": {
    "kicks/400707__mattc90__subby-kick-drum.wav": {
      "onsetLatencyMs": 0.8,
      "peakDbfs": -1.0,
      "durationMs": 342,
      "rmsDbfs": -14.2,
      "spectralCentroidHz": 82
    }
  },
  "generatedAt": "2026-04-12T...",
  "pipelineVersion": "1.0"
}
```

Fields:
- **`onsetLatencyMs`** — residual onset latency after trimming (should be ≤1ms if the trim worked correctly; non-zero due to the guard margin). Useful for engine-level compensation if ever needed.
- **`peakDbfs`** — peak amplitude in dBFS. Should be -1.0 for all files after normalization. Included as a validation check.
- **`durationMs`** — total duration in milliseconds. Useful for composition skills choosing between samples (e.g., a 50ms hat click vs a 400ms hat wash).
- **`rmsDbfs`** — RMS loudness in dBFS. More perceptually relevant than peak for comparing "how loud does this sample sound." A punchy kick and a sustained pad can have the same peak but very different RMS.
- **`spectralCentroidHz`** — frequency centroid (center of mass of the spectrum). A single number that captures "is this sample bassy, middy, or trebly." Helps the composition skills make mix-aware decisions (e.g., "this kick has a centroid at 82 Hz, it'll compete with a sub bass at the same frequency").

### Phase 3: Enrich Skill Reference (documentation)

Update `.claude/skills/compose/oneshot-hits.md` to include metadata from Phase 2:

- Add **Duration**, **RMS**, and **Spectral centroid** columns to each sample table
- Add a brief **"Sample prep"** section at the top noting that all samples have been trimmed and normalized, with a pointer to the pipeline script and `metadata.json`
- Optionally: regenerate the table FROM `metadata.json` so the .md and the JSON stay in sync automatically (a small `scripts/generate-oneshot-docs.ts` script)

### Phase 4 (stretch): Engine-Level Onset Compensation

Wire `metadata.json` into the engine so `OneShotInstrument` reads each sample's `onsetLatencyMs` and schedules the trigger that many milliseconds early. This would make trimmed-but-not-perfect samples play in time without requiring composers to choose between oneshot and synthesized drums.

**Why this is a stretch goal:** Phase 1's trimming should reduce onset latency to ≤1ms for all samples, which is imperceptible. Engine compensation is only needed if samples are added later that can't be trimmed cleanly (e.g., samples with intentional soft attacks that shouldn't be cropped). Defer until the need is demonstrated.

## Architecture

### Script location and language

**`scripts/prep-oneshot-samples.py`** — Python, alongside the existing `scripts/extract-samples.py`. Python because:
- The existing sample extraction pipeline is Python
- `pydub` (or `librosa` + `soundfile`) handles all the audio analysis and manipulation needed
- FFmpeg integration for format-preserving re-encoding is already proven in the extraction pipeline
- The metadata extraction (RMS, spectral centroid) is straightforward with `librosa`

Dependencies: `pydub` or `librosa`, `numpy`, `soundfile`. Add to `scripts/requirements.txt` (already exists for the extraction pipeline).

### Idempotency

The script must be safe to run multiple times:
- Trimming an already-trimmed file should be a no-op (onset is already at the start)
- Normalizing an already-normalized file should be a no-op (peak is already at target)
- `metadata.json` is overwritten each run (generated artifact, not hand-edited)
- The pipeline log should distinguish "modified" from "already clean" entries

### What about the GM instrument samples?

The GM samples in `public/samples/{instrument}/` went through `scripts/extract-samples.py` which uses FluidSynth for rendering. Those samples are already clean — FluidSynth produces audio with zero pre-attack silence and consistent levels. This pipeline targets ONLY the `public/samples/oneshots/` directory (Freesound CC0 samples committed as-is).

### What about synth presets?

Synth presets (`src/engine/synth-presets.ts`) have their own loudness characteristics but can't be "normalized" the same way — they're synthesized at runtime, not pre-recorded files. The relative loudness of synth presets is a separate concern best addressed by:
1. Documenting each preset's typical loudness in `synth-presets.md` (qualitative: "hot", "moderate", "quiet")
2. Adjusting the preset definitions themselves if a preset is consistently too loud/quiet
3. Neither of these is in scope for this plan — flag for a future "synth preset audit"

## Non-goals

- **Format conversion.** Don't convert .wav to .ogg or vice versa. Preserve original formats.
- **Resampling.** Don't change sample rates or bit depths. The engine handles rate conversion at playback.
- **Creative processing.** No EQ, compression, saturation, or other timbral changes. The pipeline makes samples "correct" (trimmed, normalized), not "better-sounding."
- **GM instrument samples.** Already clean from FluidSynth extraction.
- **Synth preset loudness.** Different mechanism, different plan.
- **New sample sourcing.** This plan processes existing samples, not adding new ones. The `sampled-drums` backlog entry handles that.

## Success metrics

1. **Timing:** oneshot drums scheduled alongside synth bass and sampled piano should sound in sync without requiring the synthesized DrumKit workaround. Verified by playing the Goldberg Aria bass-techno composition with oneshot drums restored.
2. **Loudness:** switching between different oneshot kicks (e.g., subby-kick-drum vs big-vintage-kick) at the same `defaultVolume` should produce similar perceived loudness. No "some samples are way louder than others" surprise.
3. **Metadata available:** `public/samples/oneshots/metadata.json` exists and is accurate. `/compose` skill reference (`oneshot-hits.md`) reflects the measured characteristics.
4. **Idempotent:** running the pipeline twice produces identical output.
5. **Non-destructive to existing compositions:** all composition JSON files reference samples by path; paths are unchanged; playback is identical-or-better.

## Origin

Surfaced during the Goldberg Aria bass-techno composition session (April 2026). Three consecutive `/iterate` cycles failed to fix "the drums feel staggered" before the root cause (oneshot sample pre-attack silence) was identified. The fix (swapping to synthesized DrumKit) solved timing but sacrificed timbral variety. Separately, the reese_bass and acid_bass "too loud" issues in the same session revealed that per-sample loudness normalization is a prerequisite for meaningful volume controls. Both problems trace to the same gap: the oneshot samples were committed as-is from Freesound without a preparation pipeline.
