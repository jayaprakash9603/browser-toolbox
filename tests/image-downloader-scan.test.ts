import { describe, expect, it } from 'vitest'

import { scanPageImages } from '@/core/engines/imageDownloader'

describe('scanPageImages', () => {
  it('collects img, lazy src, srcset, links, and meta images', () => {
    document.body.innerHTML = `
      <img src="https://example.com/a.jpg" width="10" height="10" alt="A" />
      <img data-src="https://example.com/lazy.png" />
      <img srcset="https://example.com/small.jpg 100w, https://example.com/large.jpg 800w" />
      <a href="https://example.com/full.webp">link</a>
      <meta property="og:image" content="https://example.com/og.jpg" />
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>
    `
    const images = scanPageImages(document, 'https://example.com/page')
    const urls = images.map((img) => img.url)
    expect(urls.some((u) => u.includes('a.jpg'))).toBe(true)
    expect(urls.some((u) => u.includes('lazy.png'))).toBe(true)
    expect(urls.some((u) => u.includes('large.jpg'))).toBe(true)
    expect(urls.some((u) => u.includes('full.webp'))).toBe(true)
    expect(urls.some((u) => u.includes('og.jpg'))).toBe(true)
    expect(urls.some((u) => u.startsWith('data:image/svg+xml'))).toBe(true)
  })
})
