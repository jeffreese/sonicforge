---
name: scaffold-feature
description: "Generate boilerplate for a new Lit component, store, or engine module following established patterns."
allowed-tools: Read, Write, Glob
---

# /scaffold-feature — Generate Feature Boilerplate

## Steps

1. **Parse the request.** Determine what's being scaffolded:
   - `component <name>` — New Lit component (e.g., `/scaffold-feature component export-panel`)
   - `store <name>` — New reactive store
   - `engine <name>` — New engine module

2. **Read existing patterns.** Before generating, read an existing file of the same type to match the established pattern:
   - Components: read any `src/ui/sf-*.ts` file. If none exist yet, use the canonical template below.
   - Stores: read any `src/stores/*.ts` file. If none exist yet, use the canonical template below.
   - Engine: read any `src/engine/*.ts` file

3. **Generate the files:**

   **For a component** (`src/ui/sf-<name>.ts`):
   - Import `LitElement`, `html`, `customElement`, `property`
   - Import style maps from `../styles/components.js`
   - Light DOM (`createRenderRoot() { return this; }`)
   - `<sf-name>` custom element tag
   - Store subscriptions in `connectedCallback` / `disconnectedCallback`
   - Co-located test file: `src/ui/sf-<name>.test.ts`

   Canonical first-component template (use when no existing components to reference):
   ```ts
   import { LitElement, html } from 'lit'
   import { customElement, property } from 'lit/decorators.js'
   import { surface } from '../styles/components.js'

   @customElement('sf-<name>')
   export class Sf<PascalName> extends LitElement {
     createRenderRoot() { return this }

     @property({ type: String })
     label = ''

     render() {
       return html`
         <div class=${surface.base}>
           <slot></slot>
         </div>
       `
     }
   }
   ```

   **For a store** (`src/stores/<name>-store.ts`):
   - Extend base `Store` class
   - Typed state interface
   - Subscribe/notify pattern
   - Co-located test file: `src/stores/<name>-store.test.ts`

   Canonical first-store template (use when no existing stores to reference):
   ```ts
   type Listener = () => void

   interface <PascalName>State {
     // Define state shape
   }

   export class <PascalName>Store {
     private listeners = new Set<Listener>()
     private _state: <PascalName>State = { /* defaults */ }

     get state(): Readonly<<PascalName>State> { return this._state }

     subscribe(listener: Listener): () => void {
       this.listeners.add(listener)
       return () => this.listeners.delete(listener)
     }

     protected notify() {
       this.listeners.forEach(l => l())
     }

     protected update(partial: Partial<<PascalName>State>) {
       this._state = { ...this._state, ...partial }
       this.notify()
     }
   }

   export const <camelName>Store = new <PascalName>Store()
   ```

   **For an engine module** (`src/engine/<name>.ts`):
   - No Tone.js imports in the scaffold — add when wiring
   - Co-located test file: `src/engine/<name>.test.ts`

4. **Report** what was created and suggest next steps.
