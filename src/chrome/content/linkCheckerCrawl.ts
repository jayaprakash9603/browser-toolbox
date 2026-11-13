import { sameOrigin } from '@/core/engines/htmlArchive'
import type { FetchedPage } from '@/core/engines/htmlArchive/crawl'
import {
  discoverSiteLinks,
  type DiscoverGraphOptions,
  type DiscoverHooks,
  type DiscoverResult,
} from '@/core/engines/linkChecker/discover'

import { collectPageLinks } from './collectors/links'

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

async function fetchText(url: string, signal: AbortSignal): Promise<string | null> {
  try {
    const response = await fetch(url, { credentials: 'include', signal })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

export type SiteLinksCrawlResult = DiscoverResult

export async function crawlSiteForLinks(
  input: DiscoverGraphOptions & { seedUrls?: string[] },
  hooks: DiscoverHooks = {},
): Promise<SiteLinksCrawlResult> {
  const live = collectPageLinks()
  const result = await discoverSiteLinks(
    window.location.href,
    input,
    {
      fetchPage: fetchPageHtml,
      fetchText,
      startHrefs: () => live.links.map((link) => link.href),
      startSnapshot: () => live,
      seedUrls: input.seedUrls,
    },
    hooks,
  )
  return {
    ...result,
    snapshot: {
      ...result.snapshot,
      url: live.url,
      title: live.title || result.snapshot.title,
      host: live.host || result.snapshot.host,
      canonical: live.canonical ?? result.snapshot.canonical,
      robots: live.robots ?? result.snapshot.robots,
    },
  }
}
