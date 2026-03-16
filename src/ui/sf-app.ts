import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { surface } from '../styles/components'

@customElement('sf-app')
export class SfApp extends LitElement {
  createRenderRoot() {
    return this
  }

  render() {
    return html`
      <div class="${surface.base} min-h-screen">
        <slot></slot>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sf-app': SfApp
  }
}
