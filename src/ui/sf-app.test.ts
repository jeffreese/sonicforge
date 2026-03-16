import { describe, expect, it } from 'vitest'
import './sf-app'
import { SfApp } from './sf-app'

describe('sf-app', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('sf-app')).toBe(SfApp)
  })

  it('renders with light DOM', () => {
    const el = document.createElement('sf-app') as SfApp
    document.body.appendChild(el)
    // Light DOM — createRenderRoot returns `this`
    expect(el.shadowRoot).toBeNull()
    document.body.removeChild(el)
  })

  it('renders a container div after update', async () => {
    const el = document.createElement('sf-app') as SfApp
    document.body.appendChild(el)
    await el.updateComplete
    const container = el.querySelector('div')
    expect(container).not.toBeNull()
    document.body.removeChild(el)
  })
})
