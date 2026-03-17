import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { engine } from '../engine/instance'
import { surface } from '../styles/components'
import './sf-arrangement'
import './sf-composition-loader'
import './sf-mixer'
import './sf-sample-explorer'
import './sf-sample-picker'
import './sf-transport-bar'

@customElement('sf-app')
export class SfApp extends LitElement {
  createRenderRoot() {
    return this
  }

  private handleSeek(e: CustomEvent<{ sectionIndex: number }>): void {
    engine.seekToSection(e.detail.sectionIndex)
  }

  private handleLoop(e: CustomEvent<{ sectionIndex: number | null }>): void {
    engine.setLoopSection(e.detail.sectionIndex)
  }

  private handleSampleSelect(e: CustomEvent<{ instrumentId: string; sample: string }>): void {
    engine.swapSample(e.detail.instrumentId, e.detail.sample)
  }

  private handleSamplePreview(e: CustomEvent<{ sample: string }>): void {
    const explorer = this.querySelector('sf-sample-explorer')
    const auditioner = explorer?.getAuditioner()
    if (auditioner) {
      auditioner.loadSample(e.detail.sample).then(() => {
        auditioner.play('C4', '8n', 0.8)
      })
    }
  }

  render() {
    return html`
      <div
        class="${surface.base} min-h-screen"
        @arrangement-seek=${this.handleSeek}
        @arrangement-loop=${this.handleLoop}
        @sample-select=${this.handleSampleSelect}
        @sample-preview=${this.handleSamplePreview}
      >
        <sf-transport-bar></sf-transport-bar>
        <sf-arrangement></sf-arrangement>
        <slot></slot>
        <sf-mixer></sf-mixer>
        <sf-sample-explorer></sf-sample-explorer>
        <sf-sample-picker></sf-sample-picker>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sf-app': SfApp
  }
}
