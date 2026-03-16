---
paths:
  - "src/ui/**"
  - "src/stores/**"
---

# No Direct Tone.js Imports Outside Engine

UI components and stores must never import from `tone` or `Tone`. All audio interaction goes through the engine layer in `src/engine/`.

## Why

The engine layer is the single boundary between the application and Tone.js. This isolation means the UI framework can change without touching audio code, and Tone.js lifecycle management (audio context, samplers, effects) stays in one place rather than scattered across components.

## Correct

```ts
// In a UI component or store
import { engine } from '../engine/engine.js';
engine.play();
```

## Incorrect

```ts
// In a UI component — don't do this
import * as Tone from 'tone';
Tone.Transport.start();
```
