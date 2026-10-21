import {
  basenameOf,
  buildHtmlArchive,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_PAGES,
  enrichLinkLabelsWithPageTitles,
  scanAnchorList,
  type HtmlBundleProgress,
  type HtmlLinkCandidate,
} from '@/core/engines/htmlArchive'

export interface ScanHtmlBundleResult {
  pageUrl: string
  pageTitle: string
  entries: HtmlLinkCandidate[]
}

export interface BuildHtmlBundleRequest {
  includeCurrent: boolean
  selectedResolvedUrls: string[]
  includeAssets: boolean
  maxPages?: number
  maxBytes?: number
}

export interface BuildHtmlBundleStats {
  pages: number
  assets: number
  bytes: number
  missing: number
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
  }
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
): Promise<BuildHtmlBundleResult> {
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
