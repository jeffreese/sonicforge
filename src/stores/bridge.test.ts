import { describe, expect, it, vi } from 'vitest'
import type { SonicForgeComposition } from '../schema/composition'
import { CompositionStore } from './CompositionStore'
import { MixerStore } from './MixerStore'
import { TransportStore } from './TransportStore'
import { createMixerSink } from './bridge'

const testComposition: SonicForgeComposition = {
  version: '1.0',
  metadata: { title: 'Test', bpm: 140, timeSignature: [3, 4], key: 'G major' },
  instruments: [
    { id: 'piano', name: 'Piano', sample: 'acoustic_grand_piano', category: 'melodic' },
  ],
  sections: [
    { id: 'intro', name: 'Intro', bars: 4, tracks: [{ instrumentId: 'piano', notes: [] }] },
  ],
}

describe('bridge', () => {
  describe('createMixerSink', () => {
    it('forwards setVolume to MixBus', () => {
      const mixBus = {
        setVolume: vi.fn(),
        setPan: vi.fn(),
        setMuted: vi.fn(),
        setSoloed: vi.fn(),
        setMasterVolume: vi.fn(),
      }
      const sink = createMixerSink(mixBus as never)

      sink({ type: 'setVolume', id: 'piano', volume: 60 })
      expect(mixBus.setVolume).toHaveBeenCalledWith('piano', 60)
    })

    it('forwards setPan to MixBus', () => {
      const mixBus = {
        setVolume: vi.fn(),
        setPan: vi.fn(),
        setMuted: vi.fn(),
        setSoloed: vi.fn(),
        setMasterVolume: vi.fn(),
      }
      const sink = createMixerSink(mixBus as never)

      sink({ type: 'setPan', id: 'bass', pan: -0.5 })
      expect(mixBus.setPan).toHaveBeenCalledWith('bass', -0.5)
    })

    it('forwards setMuted to MixBus', () => {
      const mixBus = {
        setVolume: vi.fn(),
        setPan: vi.fn(),
        setMuted: vi.fn(),
        setSoloed: vi.fn(),
        setMasterVolume: vi.fn(),
      }
      const sink = createMixerSink(mixBus as never)

      sink({ type: 'setMuted', id: 'piano', muted: true })
      expect(mixBus.setMuted).toHaveBeenCalledWith('piano', true)
    })

    it('forwards setSoloed to MixBus', () => {
      const mixBus = {
        setVolume: vi.fn(),
        setPan: vi.fn(),
        setMuted: vi.fn(),
        setSoloed: vi.fn(),
        setMasterVolume: vi.fn(),
      }
      const sink = createMixerSink(mixBus as never)

      sink({ type: 'setSoloed', id: 'piano', soloed: true })
      expect(mixBus.setSoloed).toHaveBeenCalledWith('piano', true)
    })

    it('forwards setMasterVolume to MixBus', () => {
      const mixBus = {
        setVolume: vi.fn(),
        setPan: vi.fn(),
        setMuted: vi.fn(),
        setSoloed: vi.fn(),
        setMasterVolume: vi.fn(),
      }
      const sink = createMixerSink(mixBus as never)

      sink({ type: 'setMasterVolume', volume: 50 })
      expect(mixBus.setMasterVolume).toHaveBeenCalledWith(50)
    })
  })

  describe('store integration', () => {
    it('TransportStore reflects playback state changes', () => {
      const store = new TransportStore()
      store.updatePlayback('playing')
      expect(store.state.playbackState).toBe('playing')

      store.resetPosition()
      expect(store.state.playbackState).toBe('stopped')
      expect(store.state.bar).toBe(0)
    })

    it('CompositionStore loads and provides composition data', () => {
      const store = new CompositionStore()
      store.load(testComposition)

      expect(store.state.composition?.metadata.bpm).toBe(140)
      expect(store.state.composition?.instruments).toHaveLength(1)
    })

    it('MixerStore channels sync with loaded state', () => {
      const store = new MixerStore()
      store.loadChannels([
        { id: 'piano', name: 'Piano', volume: 80, pan: 0, muted: false, soloed: false },
      ])

      expect(store.state.channels).toHaveLength(1)
      store.setVolume('piano', 50)
      expect(store.state.channels[0].volume).toBe(50)
    })
  })
})
