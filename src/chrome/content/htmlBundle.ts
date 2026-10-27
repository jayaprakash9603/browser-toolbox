import {
  basenameOf,
  buildHtmlArchive,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_PAGES,
  enrichLinkLabelsWithPageTitles,
  scanAnchorList,
  sameOrigin,
  textEncoder,
  type HtmlBundleProgress,
  type HtmlLinkCandidate,
} from '@/core/engines/htmlArchive'
import {
  clampCrawlOptions,
  crawlSite,
  type CrawlOptions,
  type CrawlSummary,
  type FetchedPage,
} from '@/core/engines/htmlArchive/crawl'

import { detectFramework, renderPageInFrame, serializeRenderedDocument } from './pageRender'

export interface ScanHtmlBundleResult {
  pageUrl: string
  pageTitle: string
  entries: HtmlLinkCandidate[]
  /** Front-end framework the page appears to use, when one is recognizable. */
  framework?: string | null
}

export interface BuildHtmlBundleRequest {
  includeCurrent: boolean
  selectedResolvedUrls: string[]
  includeAssets: boolean
  maxPages?: number
  maxBytes?: number
  crawl?: CrawlOptions
}

export interface BuildHtmlBundleStats {
  pages: number
  assets: number
  bytes: number
  missing: number
  crawl?: CrawlSummary
}

export interface BuildHtmlBundleResult {
  zipBytes: Uint8Array
  stats: BuildHtmlBundleStats
}

async function fetchLinkedHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

export async function scanHtmlBundleFromDom(
  options: { htmlOnly: boolean; sameFolderOnly: boolean },
): Promise<ScanHtmlBundleResult> {
  const pageUrl = window.location.href
  const anchors = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].map((anchor) => ({
    href: anchor.getAttribute('href') ?? '',
    label: (anchor.textContent ?? '').trim().slice(0, 160),
  }))
  const scanned = scanAnchorList(anchors, pageUrl, options)
  const entries = await enrichLinkLabelsWithPageTitles(scanned, fetchLinkedHtml)
  const pageTitle = document.title.trim() || basenameOf(pageUrl)
  return {
    pageUrl,
    pageTitle,
    entries,
    framework: detectFramework(document),
  }
}

async function fetchPageHtml(url: string, signal: AbortSignal): Promise<FetchedPage> {
  const response = await fetch(url, { credentials: 'include', signal })
  if (!response.ok) return null
  const type = response.headers.get('content-type') ?? ''
  const finalUrl = response.url || url
  if ((type && !/html|xml/i.test(type)) || !sameOrigin(finalUrl, url)) {
    void response.body?.cancel().catch(() => {})
    return { kind: 'skip' }
  }
  return { kind: 'html', html: await response.text(), url: finalUrl }
}

async function buildCrawledBundle(
  request: BuildHtmlBundleRequest & { crawl: CrawlOptions },
  onProgress: (progress: HtmlBundleProgress) => void,
  signal?: AbortSignal,
  stopSignal?: AbortSignal,
): Promise<BuildHtmlBundleResult> {
  const options = clampCrawlOptions(request.crawl)
  const startUrl = window.location.href
  const { pages, summary } = await crawlSite(
    startUrl,
    options,
    {
      fetchPage: fetchPageHtml,
      renderPage: options.render === 'off' ? undefined : renderPageInFrame,
    },
    {
      signal,
      stopSignal,
      startHtml: () => serializeRenderedDocument(document),
      onProgress: (crawl) =>
        onProgress({
          phase: 'crawl',
          done: crawl.saved,
          total: Math.min(Math.max(crawl.found, crawl.saved), options.maxPages),
          crawl,
        }),
    },
  )
  if (pages.length === 0) throw new Error('Could not load this page, so there was nothing to crawl.')

  const htmlByUrl = new Map(pages.map((page) => [page.url, page.html]))
  const { zipBytes, stats } = await buildHtmlArchive(
    {
      rootPageUrl: pages[0].url,
      rootDir: options.scope === 'site' ? '/' : undefined,
      pageUrls: pages.map((page) => page.url),
      includeAssets: request.includeAssets,
      entryRedirect: true,
      maxBytes: request.maxBytes ?? DEFAULT_MAX_BYTES,
      // Pages are already in memory, so only asset and zip progress is worth showing.
      onProgress: (progress) => {
        if (progress.phase !== 'pages') onProgress(progress)
      },
    },
    {
      loadBytes: async (url) => {
        const html = htmlByUrl.get(url)
        return html != null ? textEncoder(html) : fetchBytes(url, signal)
      },
    },
  )
  return { zipBytes, stats: { ...stats, crawl: summary } }
}

async function fetchBytes(url: string, signal?: AbortSignal): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url, { credentials: 'include', signal })
    if (!response.ok) return null
    return new Uint8Array(await response.arrayBuffer())
  } catch {
    return null
  }
}

export async function buildHtmlBundleInPage(
  request: BuildHtmlBundleRequest,
  onProgress?: (progress: HtmlBundleProgress) => void,
  signal?: AbortSignal,
  stopSignal?: AbortSignal,
): Promise<BuildHtmlBundleResult> {
  if (request.crawl) {
    return buildCrawledBundle({ ...request, crawl: request.crawl }, onProgress ?? (() => {}), signal, stopSignal)
  }
  const maxPages = request.maxPages ?? DEFAULT_MAX_PAGES
  const pageUrl = window.location.href.split('#')[0]
  const pageUrls = [
    ...(request.includeCurrent ? [pageUrl] : []),
    ...request.selectedResolvedUrls,
  ]
  if (new Set(pageUrls).size > maxPages) {
    throw new Error(`Too many pages selected (max ${maxPages}).`)
  }

  const { zipBytes, stats } = await buildHtmlArchive(
    {
      rootPageUrl: pageUrl,
      pageUrls,
      includeAssets: request.includeAssets,
      maxBytes: request.maxBytes ?? DEFAULT_MAX_BYTES,
      onProgress,
    },
    {
      loadBytes: (url) => fetchBytes(url, signal),
      fallbackHtml: new Map([[pageUrl.split('?')[0], document.documentElement.outerHTML]]),
    },
  )
  return { zipBytes, stats }
}
