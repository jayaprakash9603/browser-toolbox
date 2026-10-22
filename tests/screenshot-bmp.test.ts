import { describe, expect, it } from 'vitest'

import { encodeBmp } from '@/core/screenshot/export/bmp'

describe('BMP encoder', () => {
  it('writes BM header and 2x1 RGB', () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255])
    const bmp = encodeBmp(rgba, 2, 1)
    expect(bmp[0]).toBe(0x42)
    expect(bmp[1]).toBe(0x4d)
    expect(bmp.length).toBeGreaterThan(50)
  })
})
