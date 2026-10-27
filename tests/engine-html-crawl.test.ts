import { describe, expect, it } from 'vitest'

import {
  crawlKey,
  crawlSite,
  extractPageLinks,
  isInCrawlScope,
  looksClientRendered,
  looksLikePageUrl,
  parseExcludeList,
  type CrawlSource,
  type FetchedPage,
} from '@/core/engines/htmlArchive/crawl'

const ORIGIN = 'https://site.example.com'

function links(...hrefs: string[]) {
  return `<html><body>${hrefs.map((href) => `<a href="${href}">${href}</a>`).join('')}</body></html>`
}

function fakeSite(pages: Record<string, string>, delayMs = 0) {
  const fetched: string[] = []
  let active = 0
  let peak = 0
  const source: CrawlSource = {
    fetchPage: async (url): Promise<FetchedPage> => {
      fetched.push(url)
      active += 1
      peak = Math.max(peak, active)
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs))
      active -= 1
      const html = pages[url]
      return html == null ? null : { kind: 'html', html, url }
    },
  }
  return { source, fetched, peak: () => peak }
}

describe('crawl helpers', () => {
  it('treats folder, slash and index.html spellings as one page', () => {
    expect(crawlKey(`${ORIGIN}/docs`)).toBe(crawlKey(`${ORIGIN}/docs/`))
    expect(crawlKey(`${ORIGIN}/docs/index.html`)).toBe(crawlKey(`${ORIGIN}/docs`))
    expect(crawlKey(`${ORIGIN}/docs?page=2#top`)).toBe(crawlKey(`${ORIGIN}/docs`))
    expect(crawlKey(`${ORIGIN}/docs`)).not.toBe(crawlKey(`${ORIGIN}/docs/intro`))
  })

  it('keeps folder scope under the start folder and site scope on the origin', () => {
    const start = `${ORIGIN}/guide/start.html`
    expect(isInCrawlScope(`${ORIGIN}/guide/next.html`, start, 'folder')).toBe(true)
    expect(isInCrawlScope(`${ORIGIN}/blog/post`, start, 'folder')).toBe(false)
    expect(isInCrawlScope(`${ORIGIN}/blog/post`, start, 'site')).toBe(true)
    expect(isInCrawlScope('https://other.example.com/guide/x', start, 'site')).toBe(false)
  })

  it('recognises page urls and skips files', () => {
    expect(looksLikePageUrl(`${ORIGIN}/about`)).toBe(true)
    expect(looksLikePageUrl(`${ORIGIN}/docs/`)).toBe(true)
    expect(looksLikePageUrl(`${ORIGIN}/page.php`)).toBe(true)
    expect(looksLikePageUrl(`${ORIGIN}/manual.pdf`)).toBe(false)
    expect(looksLikePageUrl(`${ORIGIN}/logo.png`)).toBe(false)
  })

  it('extracts links, honouring base href and skipping downloads and fragments', () => {
    const html =
      '<base href="/app/"><a href="next">n</a><a href="#top">t</a><a download href="file.zip">d</a>' +
      '<a href="list?a=1&amp;b=2">l</a><area href="/map"><a href="mailto:x@y.z">m</a>'
    expect(extractPageLinks(html, `${ORIGIN}/start`)).toEqual([
      `${ORIGIN}/app/next`,
      `${ORIGIN}/app/list?a=1&b=2`,
      `${ORIGIN}/map`,
    ])
  })

  it('detects app shells that only render with javascript', () => {
    expect(looksClientRendered('<body><div id="root"></div><script type="module" src="/main.js"></script></body>')).toBe(
      true,
    )
    expect(looksClientRendered(`<body><main><h1>Docs</h1><p>${'Real content. '.repeat(30)}</p></main></body>`)).toBe(
      false,
    )
  })

  it('parses the skip list from commas and new lines', () => {
    expect(parseExcludeList(' logout, /admin \n\nprint ')).toEqual(['logout', '/admin', 'print'])
  })
})

describe('crawlSite', () => {
  it('fetches every page once even when pages link back to each other', async () => {
    const site = fakeSite({
      [`${ORIGIN}/`]: links('/a', '/b', '/', '/index.html'),
      [`${ORIGIN}/a`]: links('/b', '/', '/a#again', '/a?sort=1'),
      [`${ORIGIN}/b`]: links('/a/', '/c'),
      [`${ORIGIN}/c`]: links('/', '/a', '/b'),
    })
    const { pages, summary } = await crawlSite(`${ORIGIN}/`, { scope: 'site', maxDepth: 10 }, site.source)
    expect(pages.map((page) => page.url).sort()).toEqual([`${ORIGIN}/`, `${ORIGIN}/a`, `${ORIGIN}/b`, `${ORIGIN}/c`])
    expect(site.fetched).toHaveLength(4)
    expect(summary).toMatchObject({ saved: 4, found: 4, reason: 'complete', depth: 2 })
  })

  it('stops following links past the depth limit', async () => {
    const site = fakeSite({
      [`${ORIGIN}/p0`]: links('/p1'),
      [`${ORIGIN}/p1`]: links('/p2'),
      [`${ORIGIN}/p2`]: links('/p3'),
      [`${ORIGIN}/p3`]: links('/p4'),
    })
    const { pages } = await crawlSite(`${ORIGIN}/p0`, { scope: 'site', maxDepth: 2 }, site.source)
    expect(pages.map((page) => [page.url, page.depth])).toEqual([
      [`${ORIGIN}/p0`, 0],
      [`${ORIGIN}/p1`, 1],
      [`${ORIGIN}/p2`, 2],
    ])
    expect(site.fetched).not.toContain(`${ORIGIN}/p3`)
  })

  it('never fetches more pages than the limit and reports why it stopped', async () => {
    const children = Array.from({ length: 12 }, (_, index) => `/page-${index}`)
    const pages: Record<string, string> = { [`${ORIGIN}/`]: links(...children) }
    for (const child of children) pages[`${ORIGIN}${child}`] = links()
    const site = fakeSite(pages, 2)
    const result = await crawlSite(`${ORIGIN}/`, { scope: 'site', maxPages: 5, concurrency: 4 }, site.source)
    expect(result.pages).toHaveLength(5)
    expect(site.fetched).toHaveLength(5)
    expect(result.summary).toMatchObject({ saved: 5, found: 13, reason: 'limit' })
  })

  it('runs parallel lanes up to the requested concurrency', async () => {
    const children = Array.from({ length: 8 }, (_, index) => `/item-${index}`)
    const pages: Record<string, string> = { [`${ORIGIN}/`]: links(...children) }
    for (const child of children) pages[`${ORIGIN}${child}`] = links()
    const site = fakeSite(pages, 5)
    await crawlSite(`${ORIGIN}/`, { scope: 'site', concurrency: 3 }, site.source)
    expect(site.peak()).toBe(3)
  })

  it('keeps folder scope, skips files, other sites and excluded links', async () => {
    const site = fakeSite({
      [`${ORIGIN}/docs/`]: links('intro', '/blog/', 'guide.pdf', 'https://other.example.com/docs/x', 'account/logout'),
      [`${ORIGIN}/docs/intro`]: links(),
    })
    const { pages, summary } = await crawlSite(
      `${ORIGIN}/docs/`,
      { scope: 'folder', exclude: ['logout'] },
      site.source,
    )
    expect(pages.map((page) => page.url)).toEqual([`${ORIGIN}/docs/`, `${ORIGIN}/docs/intro`])
    expect(site.fetched).toEqual([`${ORIGIN}/docs/`, `${ORIGIN}/docs/intro`])
    expect(summary.found).toBe(2)
  })

  it('stops gracefully and keeps the pages already saved', async () => {
    const children = Array.from({ length: 20 }, (_, index) => `/s-${index}`)
    const pages: Record<string, string> = { [`${ORIGIN}/`]: links(...children) }
    for (const child of children) pages[`${ORIGIN}${child}`] = links()
    const site = fakeSite(pages, 2)
    const stop = new AbortController()
    const result = await crawlSite(`${ORIGIN}/`, { scope: 'site', concurrency: 2 }, site.source, {
      stopSignal: stop.signal,
      onProgress: (progress) => {
        if (progress.saved >= 3) stop.abort()
      },
    })
    expect(result.summary.reason).toBe('stopped')
    expect(result.pages.length).toBeGreaterThanOrEqual(3)
    expect(result.pages.length).toBeLessThan(21)
  })

  it('rejects when cancelled', async () => {
    const site = fakeSite({ [`${ORIGIN}/`]: links('/a'), [`${ORIGIN}/a`]: links() }, 5)
    const cancel = new AbortController()
    const run = crawlSite(`${ORIGIN}/`, { scope: 'site' }, site.source, { signal: cancel.signal })
    cancel.abort()
    await expect(run).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('renders javascript pages and uses the open tab for the start page', async () => {
    const shell = '<body><div id="root"></div><script type="module" src="/main.js"></script></body>'
    const rendered: string[] = []
    const source: CrawlSource = {
      fetchPage: async (url) => ({ kind: 'html', html: shell, url }),
      renderPage: async (url) => {
        rendered.push(url)
        return `<body><h1>${url}</h1></body>`
      },
    }
    const { pages, summary } = await crawlSite(`${ORIGIN}/`, { scope: 'site', render: 'auto' }, source, {
      startHtml: () => links('/about'),
    })
    expect(rendered).toEqual([`${ORIGIN}/about`])
    expect(pages.map((page) => page.rendered)).toEqual([true, true])
    expect(pages[1].html).toContain(`<h1>${ORIGIN}/about</h1>`)
    expect(summary.rendered).toBe(2)
  })

  it('skips non-html responses and redirects off-site', async () => {
    const source: CrawlSource = {
      fetchPage: async (url) => {
        if (url.endsWith('/download')) return { kind: 'skip' }
        if (url.endsWith('/away')) return { kind: 'html', html: links(), url: 'https://other.example.com/' }
        return { kind: 'html', html: links('/download', '/away'), url }
      },
    }
    const { pages, summary } = await crawlSite(`${ORIGIN}/`, { scope: 'site' }, source)
    expect(pages).toHaveLength(1)
    expect(summary).toMatchObject({ skipped: 2, failed: 0, reason: 'complete' })
  })
})
