import { describe, expect, it } from 'vitest'

import type { CrawlProgress } from '@/core/engines/htmlArchive/crawl'
import {
  checkTargetKey,
  discoverSiteLinks,
  parseRobotsSitemaps,
  parseSitemapLocs,
  type DiscoverSource,
} from '@/core/engines/linkChecker/discover'
import { collectPageLinksFromHtml, mergePageLinkSnapshots } from '@/core/engines/links/collectFromHtml'

function page(hrefs: string[]): string {
  return `<html><body>${hrefs.map((href) => `<a href="${href}">x</a>`).join('')}</body></html>`
}

function source(
  pages: Record<string, string>,
  extras: Partial<DiscoverSource> = {},
): { fetchOrder: string[]; impl: DiscoverSource } {
  const fetchOrder: string[] = []
  return {
    fetchOrder,
    impl: {
      fetchPage: async (url) => {
        fetchOrder.push(url)
        const parsed = new URL(url)
        const html = pages[parsed.pathname] ?? pages[url]
        if (html == null) return null
        return { kind: 'html', html, url }
      },
      ...extras,
    },
  }
}

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

describe('checkTargetKey', () => {
  it('drops the fragment and keeps the query', () => {
    expect(checkTargetKey('https://x.test/docs?sort=1#top')).toBe('https://x.test/docs?sort=1')
  })
})

describe('discoverSiteLinks', () => {
  it('enqueues /docs, /docs/ and /docs?sort=1 as one page fetch', async () => {
    const { fetchOrder, impl } = source({
      '/docs': page(['/docs/', '/docs?sort=1', '/other']),
      '/other': page([]),
    })
    const result = await discoverSiteLinks(
      'https://x.test/docs',
      { maxDepth: 2, maxPages: 10, concurrency: 1, scope: 'site' },
      impl,
    )
    const fetchedPaths = fetchOrder.map((url) => new URL(url).pathname)
    expect(fetchedPaths.filter((path) => path === '/docs' || path === '/docs/')).toHaveLength(1)
    expect(result.pageCount).toBe(2)
    const hrefs = result.snapshot.links.map((link) => link.href)
    expect(hrefs).toEqual(expect.arrayContaining(['https://x.test/docs', 'https://x.test/other']))
  })

  it('never stacks more page fetches than the remaining page budget', async () => {
    const hrefs = Array.from({ length: 80 }, (_, i) => `/p${i}`)
    const pages: Record<string, string> = { '/': page(hrefs) }
    for (const href of hrefs) pages[href] = page([])
    const queued: number[] = []
    const { fetchOrder, impl } = source(pages)
    await discoverSiteLinks(
      'https://x.test/',
      { maxDepth: 3, maxPages: 3, concurrency: 1, scope: 'site' },
      impl,
      {
        onProgress: (progress: CrawlProgress) => {
          queued.push(progress.queued)
        },
      },
    )
    expect(Math.max(0, ...queued)).toBeLessThanOrEqual(3)
    expect(fetchOrder.length).toBeLessThanOrEqual(3)
  })

  it('follows DFS: a child is fetched before leftover siblings when concurrency is 1', async () => {
    const { fetchOrder, impl } = source({
      '/': page(['/a', '/b']),
      '/a': page(['/a/child']),
      '/a/child': page([]),
      '/b': page([]),
    })
    await discoverSiteLinks(
      'https://x.test/',
      { maxDepth: 5, maxPages: 10, concurrency: 1, scope: 'site' },
      impl,
    )
    const paths = fetchOrder.map((url) => new URL(url).pathname)
    expect(paths[0]).toBe('/')
    expect(paths.indexOf('/a')).toBeLessThan(paths.indexOf('/a/child'))
    expect(paths.indexOf('/a/child')).toBeLessThan(paths.indexOf('/b'))
  })

  it('collects external and file hrefs for checking without crawling them', async () => {
    const { fetchOrder, impl } = source({
      '/': page(['https://cdn.example/lib.js', '/file.pdf', '/about']),
      '/about': page([]),
    })
    const result = await discoverSiteLinks(
      'https://x.test/',
      { maxDepth: 2, maxPages: 10, concurrency: 1, scope: 'site' },
      impl,
    )
    expect(fetchOrder.some((url) => url.includes('cdn.example'))).toBe(false)
    expect(fetchOrder.some((url) => url.endsWith('.pdf'))).toBe(false)
    const hrefs = result.snapshot.links.map((link) => link.href)
    expect(hrefs).toEqual(
      expect.arrayContaining(['https://cdn.example/lib.js', 'https://x.test/file.pdf', 'https://x.test/about']),
    )
  })

  it('seeds same-origin sitemap loc URLs when fetchText is provided', async () => {
    const { impl } = source(
      {
        '/': page([]),
        '/from-map': page([]),
      },
      {
        fetchText: async (url) => {
          if (url.endsWith('/robots.txt')) return 'Sitemap: https://x.test/sitemap.xml\n'
          if (url.endsWith('/sitemap.xml')) {
            return '<urlset><loc>https://x.test/from-map</loc></urlset>'
          }
          return null
        },
      },
    )
    const result = await discoverSiteLinks(
      'https://x.test/',
      { maxDepth: 2, maxPages: 10, concurrency: 1, scope: 'site' },
      impl,
    )
    expect(result.snapshot.links.some((link) => link.href === 'https://x.test/from-map')).toBe(true)
  })
})

describe('sitemap parsers', () => {
  it('reads Sitemap lines from robots.txt', () => {
    expect(parseRobotsSitemaps('User-agent: *\nSitemap: https://x.test/sitemap.xml\n')).toEqual([
      'https://x.test/sitemap.xml',
    ])
  })

  it('reads loc entries from a urlset', () => {
    expect(parseSitemapLocs('<urlset><loc>https://x.test/a</loc><loc>https://x.test/b</loc></urlset>')).toEqual([
      'https://x.test/a',
      'https://x.test/b',
    ])
  })
})
