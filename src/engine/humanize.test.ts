import { describe, expect, it } from 'vitest'
import { hashString, humanizeNote } from './humanize'

describe('humanize', () => {
  describe('humanizeNote', () => {
    it('returns zero offsets when amount is 0', () => {
      const result = humanizeNote(0, 'piano', 0, { amount: 0 })
      expect(result.timingOffset).toBe(0)
      expect(result.velocityMultiplier).toBe(1.0)
    })

    it('returns non-zero offsets when amount > 0', () => {
      const result = humanizeNote(5, 'piano', 0, { amount: 50 })
      // Should produce some offset (not zero for most seeds)
      expect(result.timingOffset).not.toBe(0)
    })

    it('is deterministic — same inputs produce same outputs', () => {
      const a = humanizeNote(3, 'strings', 1, { amount: 80 })
      const b = humanizeNote(3, 'strings', 1, { amount: 80 })
      expect(a.timingOffset).toBe(b.timingOffset)
      expect(a.velocityMultiplier).toBe(b.velocityMultiplier)
    })

    it('produces different offsets for different note indices', () => {
      const a = humanizeNote(0, 'piano', 0, { amount: 50 })
      const b = humanizeNote(1, 'piano', 0, { amount: 50 })
      // Different seeds should produce different offsets
      expect(a.timingOffset).not.toBe(b.timingOffset)
    })

    it('produces different offsets for different tracks', () => {
      const a = humanizeNote(0, 'piano', 0, { amount: 50 })
      const b = humanizeNote(0, 'bass', 0, { amount: 50 })
      expect(a.timingOffset).not.toBe(b.timingOffset)
    })

    it('produces different offsets for different repeat indices', () => {
      const a = humanizeNote(0, 'piano', 0, { amount: 50 })
      const b = humanizeNote(0, 'piano', 1, { amount: 50 })
      expect(a.timingOffset).not.toBe(b.timingOffset)
    })

    it('timing offset stays within ±15ms at amount=100', () => {
      for (let i = 0; i < 100; i++) {
        const result = humanizeNote(i, 'piano', 0, { amount: 100 })
        expect(Math.abs(result.timingOffset)).toBeLessThanOrEqual(0.015)
      }
    })

    it('velocity multiplier stays within ±10% at amount=100', () => {
      for (let i = 0; i < 100; i++) {
        const result = humanizeNote(i, 'piano', 0, { amount: 100 })
        expect(result.velocityMultiplier).toBeGreaterThanOrEqual(0.9)
        expect(result.velocityMultiplier).toBeLessThanOrEqual(1.1)
      }
    })

    it('scales linearly with amount', () => {
      const full = humanizeNote(7, 'piano', 0, { amount: 100 })
      const half = humanizeNote(7, 'piano', 0, { amount: 50 })
      // Half amount should produce half the offset (same seed, same random value)
      expect(Math.abs(half.timingOffset)).toBeCloseTo(Math.abs(full.timingOffset) / 2, 6)
    })

    it('clamps amount to 100', () => {
      const at100 = humanizeNote(7, 'piano', 0, { amount: 100 })
      const at200 = humanizeNote(7, 'piano', 0, { amount: 200 })
      expect(at100.timingOffset).toBe(at200.timingOffset)
      expect(at100.velocityMultiplier).toBe(at200.velocityMultiplier)
    })

    describe('articulation sensitivity', () => {
      it('ghost notes have more velocity variance', () => {
        const normal = humanizeNote(3, 'piano', 0, { amount: 100 })
        const ghost = humanizeNote(3, 'piano', 0, { amount: 100 }, 'ghost')
        // Ghost multiplier is 1.5x for velocity, so the deviation from 1.0 should be larger
        const normalDev = Math.abs(normal.velocityMultiplier - 1.0)
        const ghostDev = Math.abs(ghost.velocityMultiplier - 1.0)
        expect(ghostDev).toBeCloseTo(normalDev * 1.5, 6)
      })

      it('accented notes have less timing variance', () => {
        const normal = humanizeNote(3, 'piano', 0, { amount: 100 })
        const accent = humanizeNote(3, 'piano', 0, { amount: 100 }, 'accent')
        // Accent multiplier is 0.3x for timing
        expect(Math.abs(accent.timingOffset)).toBeCloseTo(Math.abs(normal.timingOffset) * 0.3, 6)
      })

      it('accented notes have less velocity variance', () => {
        const normal = humanizeNote(3, 'piano', 0, { amount: 100 })
        const accent = humanizeNote(3, 'piano', 0, { amount: 100 }, 'accent')
        const normalDev = Math.abs(normal.velocityMultiplier - 1.0)
        const accentDev = Math.abs(accent.velocityMultiplier - 1.0)
        expect(accentDev).toBeCloseTo(normalDev * 0.5, 6)
      })
    })
  })

  describe('hashString', () => {
    it('produces consistent hashes', () => {
      expect(hashString('piano')).toBe(hashString('piano'))
    })

    it('produces different hashes for different strings', () => {
      expect(hashString('piano')).not.toBe(hashString('bass'))
    })
  })
})
