import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { surface } from '../styles/components'
import './sf-transport-bar'

@customElement('sf-app')
export class SfApp extends LitElement {
  createRenderRoot() {
    return this
  }

  render() {
    return html`
      <div class="${surface.base} min-h-screen">
        <sf-transport-bar></sf-transport-bar>
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
