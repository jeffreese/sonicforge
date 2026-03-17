---
title: "ADR-007: WAV + OGG for Audio Export"
phase: 2
project: sonicforge
date: 2026-03-15
status: accepted
---

# ADR-007: WAV + OGG for Audio Export

## Status

Accepted

## Context

SonicForge needs audio export capability — render a composition to a downloadable audio file. The choice of formats affects whether external encoding libraries are needed, file sizes, and compatibility with users' downstream workflows.

## Decision

We will support **WAV** (lossless) and **OGG** (compressed) export. Both can be implemented using browser-native APIs with no external encoding libraries.

- WAV: Raw PCM encoding from Tone.js `Tone.Offline` AudioBuffer output
- OGG: Browser-native `MediaRecorder` with Opus codec

## Alternatives Considered

### WAV + MP3
- **Pros:** MP3 is universally compatible
- **Cons:** MP3 encoding requires an external library (`lamejs` — unmaintained JavaScript port of LAME). Adds dependency weight and maintenance risk.

### WAV only
- **Pros:** Simplest implementation, no compression complexity
- **Cons:** Large file sizes for longer compositions. Users would need to compress externally.

### MP3 only
- **Pros:** Small files, universal playback
- **Cons:** Lossy, requires external library, licensing considerations (though patents have expired)

## Consequences

### Positive
- Zero external encoding dependencies — both formats use browser-native APIs
- WAV provides lossless quality for users who want to import into a DAW
- OGG provides compressed format for sharing and casual use
- Samples are already OGG — consistent format throughout the pipeline

### Negative
- OGG playback support varies (not supported in Safari without codec). Users on Safari would rely on WAV.
- No MP3 option for maximum compatibility (can be added later if needed via `lamejs`)
- Browser MediaRecorder API behavior can vary across browsers

## Related Decisions

None currently.
