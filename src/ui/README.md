# UI Components

Lit web components using light DOM, Tailwind via design token abstraction, and reactive store subscriptions.

## Component Catalog

| Component | File | Store(s) | Description |
|---|---|---|---|
| `<sf-app>` | `sf-app.ts` | — | Shell: renders all components, wires engine events |
| `<sf-transport-bar>` | `sf-transport-bar.ts` | TransportStore | Play/pause/stop, position display, BPM |
| `<sf-arrangement>` | `sf-arrangement.ts` | CompositionStore, TransportStore | Canvas timeline: sections, playhead, click-to-seek, double-click-to-loop |
| `<sf-mixer>` | `sf-mixer.ts` | MixerStore | Channel strip container with master volume |
| `<sf-channel-strip>` | `sf-channel-strip.ts` | — (props) | Per-instrument volume, pan, mute, solo |
| `<sf-sample-explorer>` | `sf-sample-explorer.ts` | UIStore | Browse GM instruments by category, search, velocity, embedded keyboard |
| `<sf-keyboard>` | `sf-keyboard.ts` | UIStore | Computer keyboard → note input, octave control |
| `<sf-sample-picker>` | `sf-sample-picker.ts` | — | Modal overlay for inline instrument swap |
| `<sf-composition-loader>` | `sf-composition-loader.ts` | CompositionStore | Paste JSON, upload file, drag-and-drop with validation |

## Conventions

- **Prefix**: All components use `<sf-*>` prefix
- **Light DOM**: Override `createRenderRoot() { return this }`
- **Styles**: Import semantic maps from `../styles/components` — no raw Tailwind in templates
- **Stores**: Subscribe in `connectedCallback`, unsubscribe in `disconnectedCallback`
- **Events**: Dispatch `CustomEvent` with `bubbles: true` for parent communication
- **Tests**: Co-located `sf-*.test.ts` files using Vitest
