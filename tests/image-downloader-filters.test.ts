import { describe, expect, it } from 'vitest'

import {
  dedupePageImages,
  filterPageImages,
  normalizeImageUrl,
  type PageImage,
} from '@/core/engines/imageDownloader'

const sample = (url: string, w = 100, h = 100): PageImage => ({
  url,
  source: 'img',
  width: w,
  height: h,
  alt: null,
  ext: 'jpg',
})

describe('normalizeImageUrl', () => {
  it('strips hash and size query params', () => {
    expect(normalizeImageUrl('https://cdn.test/a.jpg?w=100&token=1#x')).toBe(
      'https://cdn.test/a.jpg?token=1',
    )
  })
})

describe('dedupePageImages', () => {
  it('keeps the largest dimensions for the same normalized url', () => {
    const list = dedupePageImages([
      sample('https://x.test/p.jpg?w=50', 50, 50),
      sample('https://x.test/p.jpg?w=200', 200, 180),
    ])
    expect(list).toHaveLength(1)
    expect(list[0].width).toBe(200)
  })
})

describe('filterPageImages', () => {
  it('filters by minimum size and url query', () => {
    const images = [sample('https://a.test/big.jpg', 400, 300), sample('https://a.test/small.jpg', 80, 80)]
    const filtered = filterPageImages(images, {
      minWidth: 200,
      minHeight: 0,
      maxWidth: 99_999,
      maxHeight: 99_999,
      types: [],
      sources: [],
      urlQuery: 'big',
      hideDuplicates: true,
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].url).toContain('big')
  })
})
