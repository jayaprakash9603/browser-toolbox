import { describe, expect, it } from 'vitest'

import { collectPageLinksFromHtml, mergePageLinkSnapshots } from '@/core/engines/links/collectFromHtml'

describe('collectPageLinksFromHtml', () => {
  it('resolves relative links and classifies internal vs external', () => {
    const html = `<!doctype html><html><head><title>Docs</title></head><body>
      <a href="/about">About</a>
      <a href="https://example.org/out">Out</a>
    </body></html>`
    const snap = collectPageLinksFromHtml(html, 'https://docs.test/guide', 'Docs')
    expect(snap.title).toBe('Docs')
    expect(snap.links).toHaveLength(2)
    expect(snap.links[0].href).toBe('https://docs.test/about')
    expect(snap.links[0].kind).toBe('internal')
    expect(snap.links[1].kind).toBe('external')
  })
})

describe('mergePageLinkSnapshots', () => {
  it('concatenates links with fresh indices', () => {
    const a = collectPageLinksFromHtml('<a href="/a">A</a>', 'https://x.test/1')
    const b = collectPageLinksFromHtml('<a href="/b">B</a>', 'https://x.test/2')
    const merged = mergePageLinkSnapshots([a, b])
    expect(merged?.links).toHaveLength(2)
    expect(merged?.links.map((link) => link.index)).toEqual([0, 1])
  })
})
