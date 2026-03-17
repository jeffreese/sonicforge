import { afterEach, describe, expect, it, vi } from 'vitest'
import { uiStore } from '../stores/UIStore'
import './sf-keyboard'
import { SfKeyboard } from './sf-keyboard'

function createElement(opts: Partial<{ enabled: boolean; activeSample: string }> = {}): SfKeyboard {
  const el = document.createElement('sf-keyboard') as SfKeyboard
  if (opts.enabled !== undefined) el.enabled = opts.enabled
  if (opts.activeSample !== undefined) el.activeSample = opts.activeSample
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
  uiStore.clear()
})

describe('sf-keyboard', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('sf-keyboard')).toBe(SfKeyboard)
  })

  it('renders with light DOM', () => {
    const el = createElement()
    expect(el.shadowRoot).toBeNull()
  })

  it('renders 10 white keys and 5 black keys', async () => {
    const el = createElement()
    await el.updateComplete
    const allKeys = el.querySelectorAll('[data-note]')
    expect(allKeys.length).toBe(15)
  })

  it('shows octave display from UIStore default', async () => {
    const el = createElement()
    await el.updateComplete
    const octaveUp = el.querySelector('[aria-label="Octave up"]')
    // The display is between the two buttons
    const display = octaveUp?.previousElementSibling
    expect(display?.textContent).toBe('C4')
  })

  it('octave up button updates via UIStore', async () => {
    const el = createElement()
    await el.updateComplete
    const upBtn = el.querySelector('[aria-label="Octave up"]') as HTMLButtonElement
    upBtn.click()
    await el.updateComplete
    expect(uiStore.state.keyboardOctave).toBe(5)
    const display = upBtn.previousElementSibling
    expect(display?.textContent).toBe('C5')
  })

  it('octave down button updates via UIStore', async () => {
    uiStore.setKeyboardOctave(3)
    const el = createElement()
    await el.updateComplete
    const downBtn = el.querySelector('[aria-label="Octave down"]') as HTMLButtonElement
    downBtn.click()
    await el.updateComplete
    expect(uiStore.state.keyboardOctave).toBe(2)
  })

  it('shows status text', async () => {
    const el = createElement()
    await el.updateComplete
    expect(el.textContent).toContain('Select an instrument above')
  })

  it('shows instrument name when enabled with activeSample', async () => {
    const el = createElement({ enabled: true, activeSample: 'acoustic_grand_piano' })
    await el.updateComplete
    expect(el.textContent).toContain('Acoustic Grand Piano')
  })

  it('has reduced opacity when disabled', async () => {
    const el = createElement()
    await el.updateComplete
    expect(el.innerHTML).toContain('opacity-50')
  })

  it('has full opacity when enabled', async () => {
    const el = createElement({ enabled: true })
    await el.updateComplete
    expect(el.innerHTML).toContain('opacity-100')
  })

  it('updates note labels when octave changes', async () => {
    const el = createElement()
    await el.updateComplete
    const firstNote = el.querySelector('[data-note]') as HTMLElement
    expect(firstNote?.dataset.note).toBe('C4')

    uiStore.setKeyboardOctave(5)
    await el.updateComplete
    const updatedNote = el.querySelector('[data-note]') as HTMLElement
    expect(updatedNote?.dataset.note).toBe('C5')
  })

  it('plays note on keydown when enabled with auditioner', async () => {
    const mockAuditioner = { play: vi.fn() }
    const el = createElement({ enabled: true })
    el.auditioner = mockAuditioner as unknown as SfKeyboard['auditioner']
    await el.updateComplete

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }))
    expect(mockAuditioner.play).toHaveBeenCalledWith('C4', '8n', 0.8)
  })

  it('does not play when disabled', async () => {
    const mockAuditioner = { play: vi.fn() }
    const el = createElement()
    el.auditioner = mockAuditioner as unknown as SfKeyboard['auditioner']
    await el.updateComplete

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }))
    expect(mockAuditioner.play).not.toHaveBeenCalled()
  })

  it('does not play when typing in input', async () => {
    const mockAuditioner = { play: vi.fn() }
    const el = createElement({ enabled: true })
    el.auditioner = mockAuditioner as unknown as SfKeyboard['auditioner']
    await el.updateComplete

    const inp = document.createElement('input')
    document.body.appendChild(inp)
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }))
    expect(mockAuditioner.play).not.toHaveBeenCalled()
  })

  it('ignores non-mapped keys', async () => {
    const mockAuditioner = { play: vi.fn() }
    const el = createElement({ enabled: true })
    el.auditioner = mockAuditioner as unknown as SfKeyboard['auditioner']
    await el.updateComplete

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' }))
    expect(mockAuditioner.play).not.toHaveBeenCalled()
  })

  it('does not repeat on held key', async () => {
    const mockAuditioner = { play: vi.fn() }
    const el = createElement({ enabled: true })
    el.auditioner = mockAuditioner as unknown as SfKeyboard['auditioner']
    await el.updateComplete

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }))
    expect(mockAuditioner.play).toHaveBeenCalledTimes(1)
  })

  it('clears held keys on disconnect', async () => {
    const mockAuditioner = { play: vi.fn() }
    const el = createElement({ enabled: true })
    el.auditioner = mockAuditioner as unknown as SfKeyboard['auditioner']
    await el.updateComplete

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }))
    el.remove()
    // No error — graceful cleanup
  })
})
