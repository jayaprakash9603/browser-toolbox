import { describe, expect, it } from 'vitest'

import { classifyFile, isLikelyDirectFileUrl } from '@/core/download-manager'
import { isDownloadableUrl, normalizeResourceUrl } from '@/core/download-manager'
import { buildOrganizedPath, DEFAULT_DOWNLOAD_MANAGER_SETTINGS } from '@/core/download-manager'
import { mapChromeDownloadStatus } from '@/core/download-manager'

describe('download manager classify', () => {
  it('classifies by mime then extension', () => {
    expect(classifyFile('image/png', 'file')).toBe('images')
    expect(classifyFile('', 'https://x.test/doc.pdf')).toBe('pdfs')
    expect(classifyFile('', 'https://x.test/app.exe')).toBe('executables')
  })

  it('detects direct file urls', () => {
    expect(isLikelyDirectFileUrl('https://cdn.test/a.zip')).toBe(true)
    expect(isLikelyDirectFileUrl('https://cdn.test/page')).toBe(false)
  })

  it('validates http(s) urls', () => {
    expect(isDownloadableUrl('https://example.com/a.pdf')).toBe(true)
    expect(isDownloadableUrl('javascript:alert(1)')).toBe(false)
  })

  it('normalizes tracking params', () => {
    expect(normalizeResourceUrl('https://a.test/f.jpg?utm_source=x&keep=1')).toBe('https://a.test/f.jpg?keep=1')
  })

  it('builds organized paths when enabled', () => {
    const path = buildOrganizedPath(DEFAULT_DOWNLOAD_MANAGER_SETTINGS, {
      url: 'https://example.com/photo.jpg',
      mime: 'image/jpeg',
    })
    expect(path).toMatch(/^Images\//)
  })

  it('maps chrome states', () => {
    expect(
      mapChromeDownloadStatus({
        state: 'in_progress',
        paused: true,
      } as chrome.downloads.DownloadItem),
    ).toBe('paused')
  })
})
