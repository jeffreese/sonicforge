---
name: export
description: "Export a SonicForge composition to a WAV audio file. Explains the workflow and MP3 conversion."
allowed-tools: Read
---

# /export — Export a Composition to Audio

## How it works

SonicForge exports audio by playing the composition from the beginning while capturing raw PCM audio from the master bus. When playback reaches the end, the captured samples are encoded as a 16-bit stereo WAV file and downloaded to the browser.

The output is lossless WAV — no compressed intermediate format, no external dependencies. Plays everywhere.

## In the browser

1. Load a composition in the SonicForge player
2. Click the **⬇ export button** in the transport bar (or press **E**)
3. The composition plays from the beginning — you hear it as a progress indicator
4. The browser downloads `<title>.wav` when playback ends

## Converting to MP3

FFmpeg is already a project dependency:

```bash
ffmpeg -i track.wav -acodec libmp3lame -b:a 320k track.mp3
```

## Limitations

- **Real-time export.** The composition plays at normal speed during capture, so a 1-minute track takes 1 minute to export. A future upgrade to `Tone.Offline()` rendering would make this faster-than-real-time.
- **No stem export yet.** The capture collects the master bus output (all instruments mixed). Per-instrument stem export is a stretch goal.
