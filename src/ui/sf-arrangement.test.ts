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

    // Component should have picked up the composition
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
    // No error — data loaded successfully
  })

  it('dispatches arrangement-seek on canvas click', async () => {
    compositionStore.load(testComposition)
    const el = createElement()
    el.loadSections(testOffsets, 12)
    await el.updateComplete

    const handler = vi.fn()
    el.addEventListener('arrangement-seek', handler)

    const canvas = el.querySelector('canvas') as HTMLCanvasElement
    // Simulate click in the grid area (past LABEL_WIDTH=100)
    // Need to mock getBoundingClientRect
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 860,
      width: 860,
      top: 0,
      bottom: 200,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => {},
    })

    canvas.dispatchEvent(new MouseEvent('click', { clientX: 150, bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0].detail.sectionIndex).toBe(0)
  })

  it('dispatches arrangement-loop on canvas double-click', async () => {
    compositionStore.load(testComposition)
    const el = createElement()
    el.loadSections(testOffsets, 12)
    await el.updateComplete

    const handler = vi.fn()
    el.addEventListener('arrangement-loop', handler)

    const canvas = el.querySelector('canvas') as HTMLCanvasElement
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 860,
      width: 860,
      top: 0,
      bottom: 200,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => {},
    })

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
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 860,
      width: 860,
      top: 0,
      bottom: 200,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => {},
    })

    canvas.dispatchEvent(new MouseEvent('dblclick', { clientX: 150, bubbles: true }))
    expect(handler.mock.calls[0][0].detail.sectionIndex).toBeNull()
  })

  it('click in label area does not dispatch seek', async () => {
    compositionStore.load(testComposition)
    const el = createElement()
    el.loadSections(testOffsets, 12)
    await el.updateComplete

    const handler = vi.fn()
    el.addEventListener('arrangement-seek', handler)

    const canvas = el.querySelector('canvas') as HTMLCanvasElement
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 860,
      width: 860,
      top: 0,
      bottom: 200,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => {},
    })

    // Click in label area (x < 100)
    canvas.dispatchEvent(new MouseEvent('click', { clientX: 50, bubbles: true }))
    expect(handler).not.toHaveBeenCalled()
  })

  it('click dispatches correct section for second section', async () => {
    compositionStore.load(testComposition)
    const el = createElement()
    el.loadSections(testOffsets, 12)
    await el.updateComplete

    const handler = vi.fn()
    el.addEventListener('arrangement-seek', handler)

    const canvas = el.querySelector('canvas') as HTMLCanvasElement
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 860,
      width: 860,
      top: 0,
      bottom: 200,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => {},
    })

    // Click well into the second section area
    // gridWidth = 860 - 100 - 8 = 752, barWidth = 752/12 ≈ 62.7
    // Section 1 starts at bar 4 → x = 100 + 4*62.7 = 350.8
    canvas.dispatchEvent(new MouseEvent('click', { clientX: 500, bubbles: true }))
    expect(handler.mock.calls[0][0].detail.sectionIndex).toBe(1)
  })

  it('unsubscribes from stores on disconnect', async () => {
    compositionStore.load(testComposition)
    const el = createElement()
    await el.updateComplete

    el.remove()

    // Further store updates should not cause errors
    compositionStore.clear()
    transportStore.updatePosition(0, 0)
  })
})
