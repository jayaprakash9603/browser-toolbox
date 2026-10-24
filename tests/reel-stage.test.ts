import { describe, expect, it } from 'vitest'

import { isOpenReel, reelShift } from '@/chrome/content/sites/instagram/reelStage'

describe('reel stage', () => {
  const viewport = { width: 1100, height: 800 }

  it('treats a tall video inset from the left as an open reel', () => {
    expect(isOpenReel({ left: 180, width: 420, height: 760 }, viewport)).toBe(true)
  })

  it('ignores feed thumbnails and videos already against the edge', () => {
    expect(isOpenReel({ left: 180, width: 200, height: 200 }, viewport)).toBe(false)
    expect(isOpenReel({ left: 12, width: 420, height: 760 }, viewport)).toBe(false)
  })

  it('shifts the reel to a 12px inset', () => {
    expect(reelShift(180)).toBe(168)
    expect(reelShift(8)).toBe(0)
  })
})
