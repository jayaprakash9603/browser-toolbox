import { describe, expect, it } from 'vitest'

import { findUncoveredScrollTarget, selectionSlicesCoverRegion } from '@/chrome/background/screenshot/capture'

describe('findUncoveredScrollTarget', () => {
  const region = { x: 0, y: 1000, width: 400, height: 1800 }

  it('accepts slices captured at arbitrary scroll positions when they overlap', () => {
    const slices = [{ scrollY: 950 }, { scrollY: 1700 }, { scrollY: 2250 }]
    expect(findUncoveredScrollTarget(slices, region, 900)).toBeNull()
  })

  it('reports the first gap so only that part is captured again', () => {
    const slices = [{ scrollY: 1000 }, { scrollY: 2400 }]
    expect(findUncoveredScrollTarget(slices, region, 900)).toBe(1900)
  })

  it('asks for the region start when nothing was captured', () => {
    expect(findUncoveredScrollTarget([], region, 900)).toBe(1000)
  })
})

describe('selectionSlicesCoverRegion', () => {
  const region = { x: 0, y: 1000, width: 400, height: 1800 }

  it('requires a slice at each scroll step for tall regions', () => {
    expect(
      selectionSlicesCoverRegion(
        [{ dataUrl: 'a', scrollY: 1000 }],
        region,
        900,
      ),
    ).toBe(false)
    expect(
      selectionSlicesCoverRegion(
        [
          { dataUrl: 'a', scrollY: 1000 },
          { dataUrl: 'b', scrollY: 1900 },
        ],
        region,
        900,
      ),
    ).toBe(true)
  })

  it('accepts a single slice for a one-screen selection', () => {
    expect(
      selectionSlicesCoverRegion([{ dataUrl: 'a', scrollY: 200 }], { x: 0, y: 200, width: 300, height: 400 }, 900),
    ).toBe(true)
  })
})
