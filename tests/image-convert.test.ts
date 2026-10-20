import { describe, expect, it } from 'vitest'

import { suggestFilename } from '@/core/imageConvert/filename'
import { jpegToPdf } from '@/core/imageConvert/pdf'

describe('image convert filename', () => {
  it('uses page title when available', () => {
    expect(suggestFilename('png', { pageTitle: 'My Page' })).toBe('My-Page.png')
  })

  it('derives from image URL', () => {
    expect(suggestFilename('jpg', { imageUrl: 'https://cdn.example.com/photos/cat.png?v=1' })).toBe('cat.jpg')
  })

  it('falls back to timestamped name', () => {
    expect(suggestFilename('pdf', {})).toMatch(/^image-\d+\.pdf$/)
  })
})

describe('jpegToPdf', () => {
  it('produces a valid PDF header and eof', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
    const pdf = jpegToPdf(jpeg, 100, 50)
    const text = new TextDecoder().decode(pdf.slice(0, 8))
    expect(text).toBe('%PDF-1.4')
    expect(new TextDecoder().decode(pdf.slice(-6))).toBe('%%EOF\n')
    expect(pdf.length).toBeGreaterThan(200)
  })
})
