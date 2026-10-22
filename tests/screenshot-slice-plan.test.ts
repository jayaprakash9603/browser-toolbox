import { describe, expect, it } from 'vitest'

import { fullPageScrollOffsets, tileHeights } from '@/core/screenshot/slicePlan'
import { fullPageOffsets } from '@/core/engines/capture/pageActions'

describe('fullPageScrollOffsets', () => {
  it('returns single offset for short pages', () => {
    expect(fullPageScrollOffsets(400, 800)).toEqual([0])
  })

  it('steps with overlap', () => {
    const offsets = fullPageScrollOffsets(2000, 800, 50)
    expect(offsets[0]).toBe(0)
    expect(offsets.at(-1)).toBe(1200)
    expect(offsets.length).toBeGreaterThan(2)
  })

  it('matches legacy fullPageOffsets when overlap is 0', () => {
    const h = 5000
    const vh = 900
    expect(fullPageScrollOffsets(h, vh, 0)).toEqual(fullPageOffsets(h, vh))
  })
})

describe('tileHeights', () => {
  it('splits beyond 16384', () => {
    expect(tileHeights(20000, 16384)).toEqual([16384, 3616])
  })
})
