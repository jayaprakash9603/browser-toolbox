import { describe, expect, it } from 'vitest'

import { downloadPath, suggestFilename } from '@/core/imageConvert/filename'
import { fitWithin, formatFromMenuId, imageSaveMenuId } from '@/core/imageConvert'
import { jpegToPdf } from '@/core/imageConvert/pdf'
import { normalizeSaveImageAsState, sanitizeFolder } from '@/core/imageConvert/service'

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

  it('supports image-name and site naming modes', () => {
    const source = { pageTitle: 'Gallery', imageUrl: 'https://cdn.example.com/IMG_1.png', pageUrl: 'https://www.example.com/a' }
    expect(suggestFilename('webp', source, 'image')).toBe('IMG_1.webp')
    expect(suggestFilename('jpg', source, 'site', new Date(2026, 9, 26, 8, 5, 9))).toBe('example.com-20261026-080509.jpg')
    expect(suggestFilename('png', { pageTitle: 'Only title' }, 'image')).toBe('Only-title.png')
  })

  it('builds safe Downloads subpaths', () => {
    expect(sanitizeFolder('  ../My Images\\2026//shots: ')).toBe('My Images/2026/shots')
    expect(sanitizeFolder('C:/Windows')).toBe('C/Windows')
    expect(downloadPath('', 'a.png')).toBe('a.png')
    expect(downloadPath('Images', 'a.png')).toBe('Images/a.png')
  })
})

describe('save image as settings', () => {
  it('normalizes stored state and drops invalid values', () => {
    const state = normalizeSaveImageAsState({
      formats: ['webp', 'bogus', 'jpg', 'webp'],
      quality: 5,
      quickFormat: 'tiff',
      maxSize: 1234,
      background: 'red',
      naming: 'site',
      folder: 'a/../b',
    })
    expect(state.formats).toEqual(['webp', 'jpg'])
    expect(state.quality).toBe(1)
    expect(state.quickFormat).toBeNull()
    expect(state.maxSize).toBe(0)
    expect(state.background).toBe('#ffffff')
    expect(state.naming).toBe('site')
    expect(state.folder).toBe('a/b')
  })

  it('downscales by the longest edge without enlarging', () => {
    expect(fitWithin(4000, 2000, 1920)).toEqual({ width: 1920, height: 960 })
    expect(fitWithin(800, 600, 1920)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(800, 600, 0)).toEqual({ width: 800, height: 600 })
  })

  it('maps one-click and submenu ids back to formats', () => {
    expect(formatFromMenuId(imageSaveMenuId('png', true))).toBe('png')
    expect(formatFromMenuId(imageSaveMenuId('pdf'))).toBe('pdf')
    expect(formatFromMenuId('toolbox.save-image-as.parent')).toBeNull()
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
