import { describe, expect, it } from 'vitest'

import { selectionSlicesCoverRegion } from '@/chrome/background/screenshot/capture'

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
