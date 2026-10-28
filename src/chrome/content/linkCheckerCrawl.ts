import { collectPageLinksFromHtml, mergePageLinkSnapshots } from '@/core/engines/links/collectFromHtml'
import type { PageLinksSnapshot } from '@/core/engines/links/pageLinks'
import { sameOrigin } from '@/core/engines/htmlArchive'
import {
  clampCrawlOptions,
  crawlSite,
  type CrawlOptions,
  type CrawlProgress,
  type CrawlSummary,
  type FetchedPage,
} from '@/core/engines/htmlArchive/crawl'

import { collectPageLinks } from './collectors/links'
import { renderPageInFrame, serializeRenderedDocument } from './pageRender'

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

export interface SiteLinksCrawlResult {
  snapshot: PageLinksSnapshot
  pageCount: number
  summary: CrawlSummary
}

export async function crawlSiteForLinks(
  input: Partial<CrawlOptions>,
  hooks: {
    signal?: AbortSignal
    stopSignal?: AbortSignal
    onProgress?: (progress: CrawlProgress) => void
  } = {},
): Promise<SiteLinksCrawlResult> {
  const options = clampCrawlOptions(input)
  const startUrl = window.location.href
  const { pages, summary } = await crawlSite(
    startUrl,
    options,
    {
      fetchPage: fetchPageHtml,
      renderPage: options.render === 'off' ? undefined : renderPageInFrame,
    },
    {
      signal: hooks.signal,
      stopSignal: hooks.stopSignal,
      startHtml: () => serializeRenderedDocument(document),
      onProgress: hooks.onProgress,
    },
  )

  const snapshots: PageLinksSnapshot[] = []
  for (const page of pages) {
    if (page.depth === 0) {
      snapshots.push(collectPageLinks())
    } else {
      snapshots.push(collectPageLinksFromHtml(page.html, page.url))
    }
  }
  const merged = mergePageLinkSnapshots(snapshots) ?? collectPageLinks()
  return { snapshot: merged, pageCount: pages.length, summary }
}
