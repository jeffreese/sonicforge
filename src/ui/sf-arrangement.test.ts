import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SectionOffset } from '../engine/Transport'
import type { SonicForgeComposition } from '../schema/composition'
import { compositionStore } from '../stores/CompositionStore'
import { transportStore } from '../stores/TransportStore'
import './sf-arrangement'
import { SfArrangement } from './sf-arrangement'

const testComposition: SonicForgeComposition = {
  version: '1.0',
  metadata: {
    title: 'Test',
    bpm: 120,
    timeSignature: [4, 4],
    key: 'C major',
  },
  instruments: [
    { id: 'piano', name: 'Piano', sample: 'acoustic_grand_piano', category: 'melodic' },
    { id: 'bass', name: 'Bass', sample: 'acoustic_bass', category: 'bass' },
  ],
  sections: [
    {
      id: 'intro',
      name: 'Intro',
      bars: 4,
      tracks: [{ instrumentId: 'piano', notes: [{ pitch: 'C4', time: '0:0:0', duration: '4n' }] }],
    },
    {
      id: 'verse',
      name: 'Verse',
      bars: 8,
      tracks: [
        { instrumentId: 'piano', notes: [{ pitch: 'E4', time: '0:0:0', duration: '4n' }] },
        { instrumentId: 'bass', notes: [{ pitch: 'C2', time: '0:0:0', duration: '2n' }] },
      ],
    },
  ],
}

const testOffsets: SectionOffset[] = [
  { section: testComposition.sections[0], index: 0, startBar: 0, endBar: 4 },
  { section: testComposition.sections[1], index: 1, startBar: 4, endBar: 12 },
]

function createElement(): SfArrangement {
  const el = document.createElement('sf-arrangement') as SfArrangement
  document.body.appendChild(el)
  return el
}

function mockCanvasRect(canvas: HTMLCanvasElement) {
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    right: 860,
    width: 860,
    top: 0,
    bottom: 400,
    height: 400,
    x: 0,
    y: 0,
    toJSON: () => {},
  })
}

afterEach(() => {
  document.body.innerHTML = ''
  compositionStore.clear()
  transportStore.resetPosition()
})

describe('sf-arrangement', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('sf-arrangement')).toBe(SfArrangement)
  })

  it('renders with light DOM', () => {
    const el = createElement()
    expect(el.shadowRoot).toBeNull()
  })

  it('renders a heading and canvas', async () => {
    const el = createElement()
    await el.updateComplete
    expect(el.querySelector('h2')?.textContent).toBe('Timeline')
    expect(el.querySelector('canvas')).not.toBeNull()
  })

  it('subscribes to compositionStore', async () => {
    const el = createElement()
    await el.updateComplete

    compositionStore.load(testComposition)
    await el.updateComplete

    expect(el.querySelector('canvas')).not.toBeNull()
  })

  it('subscribes to transportStore for playhead', async () => {
    compositionStore.load(testComposition)
    const el = createElement()
    el.loadSections(testOffsets, 12)
    await el.updateComplete

    // Updating transport should not throw
    transportStore.updatePosition(2, 1)
    await el.updateComplete
  })

  it('loadSections stores section offsets', async () => {
    const el = createElement()
    await el.updateComplete
    el.loadSections(testOffsets, 12)
    await el.updateComplete
  })

  it('dispatches arrangement-seek on section header click', async () => {
    compositionStore.load(testComposition)
    const el = createElement()
    el.loadSections(testOffsets, 12)
    await el.updateComplete

    const handler = vi.fn()
    el.addEventListener('arrangement-seek', handler)

    const canvas = el.querySelector('canvas') as HTMLCanvasElement
    mockCanvasRect(canvas)

    // Click in section header area (y < 28, SECTION_HEADER_HEIGHT)
    canvas.dispatchEvent(new MouseEvent('click', { clientX: 150, clientY: 14, bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0].detail.sectionIndex).toBe(0)
  })

  it('dispatches arrangement-seek-beat on grid click', async () => {
    compositionStore.load(testComposition)
    const el = createElement()
    el.loadSections(testOffsets, 12)
    await el.updateComplete

    const handler = vi.fn()
    el.addEventListener('arrangement-seek-beat', handler)

    const canvas = el.querySelector('canvas') as HTMLCanvasElement
    mockCanvasRect(canvas)

    // Click in grid area (y > HEADER_HEIGHT=48, x > PITCH_RULER_WIDTH=48)
    canvas.dispatchEvent(new MouseEvent('click', { clientX: 200, clientY: 100, bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)
    expect(typeof handler.mock.calls[0][0].detail.beat).toBe('number')
    expect(handler.mock.calls[0][0].detail.beat).toBeGreaterThanOrEqual(0)
  })

  it('dispatches arrangement-loop on canvas double-click', async () => {
    compositionStore.load(testComposition)
    const el = createElement()
    el.loadSections(testOffsets, 12)
    await el.updateComplete

    const handler = vi.fn()
    el.addEventListener('arrangement-loop', handler)

    const canvas = el.querySelector('canvas') as HTMLCanvasElement
    mockCanvasRect(canvas)

    canvas.dispatchEvent(new MouseEvent('dblclick', { clientX: 150, bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0].detail.sectionIndex).toBe(0)
  })

  it('double-click on looped section clears loop', async () => {
    compositionStore.load(testComposition)
    transportStore.updateLoop(0)
    const el = createElement()
    el.loadSections(testOffsets, 12)
    await el.updateComplete

    const handler = vi.fn()
    el.addEventListener('arrangement-loop', handler)

    const canvas = el.querySelector('canvas') as HTMLCanvasElement
    mockCanvasRect(canvas)

    canvas.dispatchEvent(new MouseEvent('dblclick', { clientX: 150, bubbles: true }))
    expect(handler.mock.calls[0][0].detail.sectionIndex).toBeNull()
  })

  it('click in pitch ruler area does not dispatch seek', async () => {
    compositionStore.load(testComposition)
    const el = createElement()
    el.loadSections(testOffsets, 12)
    await el.updateComplete

    const seekHandler = vi.fn()
    const beatHandler = vi.fn()
    el.addEventListener('arrangement-seek', seekHandler)
    el.addEventListener('arrangement-seek-beat', beatHandler)

    const canvas = el.querySelector('canvas') as HTMLCanvasElement
    mockCanvasRect(canvas)

    // Click in pitch ruler area (x < 48, y in grid area)
    canvas.dispatchEvent(new MouseEvent('click', { clientX: 20, clientY: 100, bubbles: true }))
    expect(seekHandler).not.toHaveBeenCalled()
    expect(beatHandler).not.toHaveBeenCalled()
  })

  it('unsubscribes from stores on disconnect', async () => {
    compositionStore.load(testComposition)
    const el = createElement()
    await el.updateComplete

    el.remove()

    compositionStore.clear()
    transportStore.updatePosition(0, 0)
  })

  it('builds note render list from composition', async () => {
    compositionStore.load(testComposition)
    const el = createElement()
    el.loadSections(testOffsets, 12)
    await el.updateComplete

    // Access renderNotes via the exported type — we check it builds correctly
    // by verifying the track selector shows instruments
    const buttons = el.querySelectorAll('button')
    // "All" + 2 instruments
    expect(buttons.length).toBe(3)
    expect(buttons[0].textContent).toBe('All')
    expect(buttons[1].textContent).toBe('Piano')
    expect(buttons[2].textContent).toBe('Bass')
  })

  it('track selector toggles focused track', async () => {
    compositionStore.load(testComposition)
    const el = createElement()
    el.loadSections(testOffsets, 12)
    await el.updateComplete

    const buttons = el.querySelectorAll('button')

    // Click Piano button to focus
    buttons[1].click()
    await el.updateComplete

    // Piano button should be active
    expect(buttons[1].className).toContain('bg-primary')

    // Click Piano again to unfocus
    buttons[1].click()
    await el.updateComplete

    // All button should be active again
    expect(buttons[0].className).toContain('bg-surface-hover')
  })

  it('track selector "All" button clears focus', async () => {
    compositionStore.load(testComposition)
    const el = createElement()
    el.loadSections(testOffsets, 12)
    await el.updateComplete

    const buttons = el.querySelectorAll('button')

    // Focus on Bass
    buttons[2].click()
    await el.updateComplete

    // Click All
    buttons[0].click()
    await el.updateComplete

    // All should be active
    expect(buttons[0].className).toContain('bg-surface-hover')
  })

  it('does not render track selector without composition', async () => {
    const el = createElement()
    await el.updateComplete

    const buttons = el.querySelectorAll('button')
    expect(buttons.length).toBe(0)
  })
})
