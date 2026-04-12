# Sample Prep Pipeline — Tasks

## Phase 1: Trim + Normalize

- [ ] Create `scripts/prep-oneshot-samples.py` with onset detection, trim, and peak normalization
- [ ] Add dependencies to `scripts/requirements.txt` (pydub or librosa, soundfile, numpy)
- [ ] Process all files under `public/samples/oneshots/` (kicks, snares, hats, claps, fx)
- [ ] Log before/after metrics per file (onset latency, peak dB, trim amount)
- [ ] Verify idempotency — running twice produces identical output
- [ ] Commit the trimmed+normalized sample files (replacing originals)

## Phase 2: Extract Metadata

- [ ] Extend the script to measure and emit `public/samples/oneshots/metadata.json` (onset latency, peak dBFS, duration, RMS, spectral centroid per sample)
- [ ] Verify metadata accuracy against a few manually-inspected samples

## Phase 3: Enrich Skill Reference

- [ ] Update `.claude/skills/compose/oneshot-hits.md` with Duration, RMS, and Spectral Centroid columns
- [ ] Add "Sample prep" note at the top pointing to the pipeline script and metadata.json
- [ ] Optionally: `scripts/generate-oneshot-docs.ts` to regenerate the .md from metadata.json

## Phase 4 (stretch): Engine Onset Compensation

- [ ] Wire `metadata.json` into `OneShotInstrument` — read `onsetLatencyMs` per sample and schedule triggers early by that amount
- [ ] Test with a composition that uses oneshot drums alongside synth bass to verify timing improvement

## Validation

- [ ] Restore oneshot drums on the Goldberg Aria bass-techno composition (swap source back from 'drums' to 'oneshot') and verify timing is now tight
- [ ] Compare two kicks at the same defaultVolume — verify similar perceived loudness
- [ ] Run `pnpm test` to confirm no regressions
