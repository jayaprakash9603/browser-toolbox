import { describe, expect, it } from 'vitest'

import {
  cleanUrl,
  htmlLink,
  markdownLink,
  nextZoom,
  pageInfo,
  screenshotFilename,
} from '@/tools/browser/browser-toolkit/formats'

describe('browser toolkit formats', () => {
  it('strips tracking parameters and keeps the rest', () => {
    expect(cleanUrl('https://a.com/p?id=7&utm_source=x&UTM_Medium=y&fbclid=z#top')).toEqual({
      url: 'https://a.com/p?id=7#top',
      removed: 3,
    })
    expect(cleanUrl('https://a.com/p?id=7')).toEqual({ url: 'https://a.com/p?id=7', removed: 0 })
    expect(cleanUrl('not a url')).toEqual({ url: 'not a url', removed: 0 })
  })

  it('builds escaped markdown and HTML links', () => {
    expect(markdownLink('A [b] c', 'https://x.com/a_(b)')).toBe('[A \\[b\\] c](https://x.com/a_%28b%29)')
    expect(markdownLink('', 'https://x.com')).toBe('[https://x.com](https://x.com)')
    expect(htmlLink('<Tom & "Jerry">', 'https://x.com/?a=1&b=2')).toBe(
      '<a href="https://x.com/?a=1&amp;b=2">&lt;Tom &amp; &quot;Jerry&quot;&gt;</a>',
    )
  })

  it('classifies pages', () => {
    expect(pageInfo('https://quickcalci.com/x')).toMatchObject({
      host: 'quickcalci.com',
      secure: true,
      scriptable: true,
    })
    expect(pageInfo('http://localhost:5173/')).toMatchObject({ host: 'localhost:5173', secure: false, scriptable: true })
    expect(pageInfo('chrome://extensions/')).toMatchObject({ scriptable: false, protocol: 'chrome' })
    expect(pageInfo('https://chromewebstore.google.com/detail/x').scriptable).toBe(false)
    expect(pageInfo('').scriptable).toBe(false)
  })

  it('steps through zoom levels like the browser', () => {
    expect(nextZoom(1, 1)).toBe(1.1)
    expect(nextZoom(1, -1)).toBe(0.9)
    expect(nextZoom(1.17, 1)).toBe(1.25)
    expect(nextZoom(5, 1)).toBe(5)
    expect(nextZoom(0.25, -1)).toBe(0.25)
  })

  it('names screenshots after the host and time', () => {
    expect(screenshotFilename('a.com', new Date('2026-10-24T08:16:05Z'))).toBe('a.com-2026-10-24-08-16-05.png')
    expect(screenshotFilename('')).toMatch(/^page-/)
  })
})
