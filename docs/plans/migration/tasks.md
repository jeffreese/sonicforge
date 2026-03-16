# Migration: Vanilla DOM → Lit Web Components

## Foundation

- [ ] Add Lit, Tailwind, PostCSS to project — update `vite.config.ts` for Lit + Tailwind
- [ ] Add Biome config — add `pnpm lint` and `pnpm format` scripts
- [ ] Add Vitest config — add `pnpm test` script, write one smoke test to verify setup
- [ ] Switch package manager from npm to pnpm (remove `package-lock.json`, generate `pnpm-lock.yaml`)
- [ ] Create design token layer: `src/styles/tokens.css` (CSS custom properties) + `src/styles/components.ts` (semantic style maps) — carry forward existing indigo/purple dark theme
- [ ] Create store infrastructure: base `Store` class with subscribe/notify pattern in `src/stores/`
- [ ] Create `<sf-app>` shell component — register as custom element, wire into `main.ts` alongside existing code
- [ ] Add husky + lint-staged — pre-commit hook runs Biome check and Vitest on staged files

## Reactive Stores

- [ ] Implement `TransportStore` + tests — playback state, position, BPM, time signature, loop region; wire to Engine transport callbacks
- [ ] Implement `MixerStore` + tests — per-channel volume, pan, mute, solo; bidirectional binding with MixBus
- [ ] Implement `UIStore` + tests — active panel, selected instrument, keyboard octave, zoom, snap; pure UI state
- [ ] Implement `CompositionStore` + tests — loaded composition JSON, metadata, instruments, sections, tracks, notes; wire to Engine load/schedule; implement `dispatch(command)` pattern for mutations
- [ ] Integration verification — console-log all store state changes, verify correct flow with existing engine during playback

## Component Migration

- [ ] `<sf-composition-loader>` + tests — paste JSON, upload file, drag-and-drop, schema validation, writes to CompositionStore
- [ ] `<sf-transport-bar>` + tests — play/pause/stop buttons, position display (bar:beat), BPM display; subscribes to TransportStore
- [ ] `<sf-mixer>` + `<sf-channel-strip>` + tests — container with per-instrument channel strips, volume slider, pan knob, mute/solo; bidirectional binding to MixerStore
- [ ] `<sf-sample-explorer>` + `<sf-keyboard>` + tests — browse GM instruments by category, preview via SampleAuditioner, computer keyboard play mode
- [ ] `<sf-sample-picker>` + tests — modal/dropdown for inline instrument swap from mixer, category-filtered with preview, hot-swaps in CompositionStore and Engine
- [ ] `<sf-arrangement>` + tests — migrate current timeline as-is: section grid, playhead, click-to-seek, section looping; canvas-based, subscribes to TransportStore + CompositionStore
- [ ] Wire all components into `<sf-app>` shell — end-to-end integration test: load → play → mix → seek → loop

## Cleanup

- [ ] Delete old vanilla UI files from `src/ui/`, remove old `styles.css`, update `main.ts` entry point
- [ ] Update `composition-format` rule to reference `src/schema/composition.ts` canonical location
- [ ] Review and update `/compose`, `/iterate`, `/explain`, `/play` skills for compatibility with new architecture
- [ ] Create `src/ui/README.md` — component catalog table (referenced by CLAUDE.md)
