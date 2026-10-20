import { describe, expect, it } from 'vitest'

import { applyFilenameTemplate, buildDownloadPath } from '@/core/engines/imageDownloader'

const ctx = {
  index: 2,
  url: 'https://cdn.example.com/photos/sunset.jpg',
  pageUrl: 'https://www.example.com/gallery',
  pageTitle: 'Gallery',
  ext: 'jpg',
}

describe('applyFilenameTemplate', () => {
  it('replaces tokens and appends extension', () => {
    const name = applyFilenameTemplate('{host}-{index}-{name}', ctx, new Date('2026-01-15T12:00:00Z'))
    expect(name).toMatch(/example\.com-002-sunset\.jpg$/)
  })

  it('sanitizes invalid characters', () => {
    const name = applyFilenameTemplate('bad<>name', ctx)
    expect(name).not.toMatch(/[<>]/)
    expect(name.endsWith('.jpg')).toBe(true)
  })
})

describe('buildDownloadPath', () => {
  it('builds nested folder paths', () => {
    const path = buildDownloadPath('Images/{host}', 'photo.jpg', ctx)
    expect(path).toBe('Images/example.com/photo.jpg')
  })
})
