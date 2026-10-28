import {
  clampCrawlOptions,
  crawlKey,
  extractPageLinks,
  isInCrawlScope,
  looksLikePageUrl,
  pageUrlOf,
  type CrawlOptions,
  type CrawlProgress,
  type CrawlStopReason,
  type CrawlSummary,
  type FetchedPage,
} from '@/core/engines/htmlArchive/crawl'
import { bareHost, classifyHref, isFileUrl, type PageLink, type PageLinksSnapshot } from '@/core/engines/links/pageLinks'

import { MAX_SITE_TARGETS, stripHash } from './report'

export const MAX_DISCOVER_CONCURRENCY = 16
export const DEFAULT_DISCOVER_CONCURRENCY = 8

export interface DiscoverSource {
  fetchPage: (url: string, signal: AbortSignal) => Promise<FetchedPage>
  /** hrefs already visible on the start page (current tab). */
  startHrefs?: () => string[]
  /** Optional GET for robots.txt / sitemap.xml. Failures are ignored. */
  fetchText?: (url: string, signal: AbortSignal) => Promise<string | null>
}

export interface DiscoverHooks {
  signal?: AbortSignal
  stopSignal?: AbortSignal
  onProgress?: (progress: CrawlProgress) => void
}

export interface DiscoverResult {
  snapshot: PageLinksSnapshot
  pageCount: number
  summary: CrawlSummary
}

export function clampDiscoverOptions(options: Partial<CrawlOptions>): CrawlOptions {
  const base = clampCrawlOptions({ ...options, concurrency: 1, render: 'off' })
  const concurrency = Number(options.concurrency)
  return {
    ...base,
    concurrency: Number.isFinite(concurrency)
      ? Math.min(MAX_DISCOVER_CONCURRENCY, Math.max(1, Math.round(concurrency)))
      : DEFAULT_DISCOVER_CONCURRENCY,
    render: 'off',
  }
}

/** Identity for HTTP checks: fragment dropped, query kept. */
export function checkTargetKey(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}${parsed.search}`
  } catch {
    return url.split('#')[0]
  }
}

export function hrefToPageLink(href: string, pageUrl: string, index: number): PageLink {
  const url = stripHash(href)
  const kind = classifyHref(href, url, pageUrl)
  let host = ''
  let protocol = ''
  try {
    const parsed = new URL(url)
    host = bareHost(parsed.hostname)
    protocol = parsed.protocol
  } catch {
    /* unparseable */
  }
  let pageProtocol = ''
  let pageHost = host
  try {
    const page = new URL(pageUrl)
    pageProtocol = page.protocol
    pageHost = bareHost(page.hostname)
  } catch {
    /* invalid start */
  }
  return {
    index,
    href: url,
    rawHref: href,
    text: '',
    textSource: 'none',
    kind,
    host: kind === 'anchor' ? pageHost : host,
    section: 'other',
    rel: [],
    nofollow: false,
    newTab: false,
    download: isFileUrl(url),
    insecure: pageProtocol === 'https:' && protocol === 'http:',
    visible: true,
    anchorMissing: false,
  }
}

export function parseRobotsSitemaps(text: string): string[] {
  const out: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*sitemap:\s*(\S+)/i.exec(line)
    if (match) out.push(match[1].trim())
  }
  return out
}

export function parseSitemapLocs(xml: string): string[] {
  const out: string[] = []
  for (const match of xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
    const loc = match[1].trim()
    if (loc) out.push(decodeXml(loc))
  }
  return out
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function mergeSignals(signals: (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (!signal) continue
    if (signal.aborted) {
      controller.abort()
      break
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  return controller.signal
}

function sameOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin
  } catch {
    return false
  }
}

/**
 * Concurrent DFS URL discovery: fetch HTML only to extract hrefs, never keep the body,
 * never JS-render, and never stack more page fetches than the remaining page budget.
 */
export async function discoverSiteLinks(
  startUrl: string,
  input: Partial<CrawlOptions>,
  source: DiscoverSource,
  hooks: DiscoverHooks = {},
): Promise<DiscoverResult> {
  const options = clampDiscoverOptions(input)
  const start = pageUrlOf(startUrl)
  const origin = (() => {
    try {
      return new URL(start).origin
    } catch {
      return ''
    }
  })()
  const work = mergeSignals([hooks.signal, hooks.stopSignal])
  const maxTargets = MAX_SITE_TARGETS

  const pageSeen = new Set<string>()
  const checks = new Map<string, PageLink>()
  const stack: { url: string; depth: number }[] = []
  const stats = { skipped: 0, failed: 0, depth: 0 }
  let reserved = 0
  let pagesFetched = 0
  let inFlight = 0
  let limitHit = false
  let current: string | undefined

  let waiters: (() => void)[] = []
  const wake = () => {
    const pending = waiters
    waiters = []
    for (const resolve of pending) resolve()
  }
  work.addEventListener('abort', wake, { once: true })
  const halted = () => work.aborted

  const snapshotProgress = (): CrawlProgress => ({
    found: checks.size,
    saved: pagesFetched,
    queued: stack.length,
    skipped: stats.skipped,
    failed: stats.failed,
    rendered: 0,
    depth: stats.depth,
    current,
  })

  const report = () => hooks.onProgress?.(snapshotProgress())

  const stopForUrlCap = () => {
    if (stack.length === 0) return
    stack.length = 0
    limitHit = true
    wake()
  }

  const recordCheck = (href: string) => {
    if (checks.size >= maxTargets) return
    if (!/^https?:\/\//i.test(href)) return
    const key = checkTargetKey(href)
    if (checks.has(key)) return
    const link = hrefToPageLink(href, start, checks.size)
    if (link.kind !== 'internal' && link.kind !== 'external') return
    checks.set(key, link)
    if (checks.size >= maxTargets) stopForUrlCap()
  }

  const canStack = () => reserved + stack.length < options.maxPages && checks.size < maxTargets

  const enqueuePage = (url: string, depth: number, force = false) => {
    const key = crawlKey(url)
    if (pageSeen.has(key)) return
    if (!force) {
      if (depth > options.maxDepth) return
      if (!isInCrawlScope(url, start, options.scope) || !looksLikePageUrl(url)) return
      const lower = url.toLowerCase()
      if (options.exclude.some((part) => lower.includes(part))) return
      if (!canStack()) return
    }
    pageSeen.add(key)
    stack.push({ url: pageUrlOf(url), depth })
    wake()
  }

  const consider = (href: string, depth: number) => {
    recordCheck(href)
    enqueuePage(href, depth)
  }

  const ingestHtml = (html: string, pageUrl: string, depth: number) => {
    const hrefs = extractPageLinks(html, pageUrl)
    for (let i = hrefs.length - 1; i >= 0; i -= 1) consider(hrefs[i], depth + 1)
  }

  const seedSitemaps = async () => {
    if (!source.fetchText || !origin) return
    const robots = await source.fetchText(`${origin}/robots.txt`, work).catch(() => null)
    const sitemapUrls: string[] = []
    const seen = new Set<string>()
    const addSitemap = (raw: string) => {
      try {
        const resolved = new URL(raw, origin).href
        if (!sameOrigin(resolved, origin) || seen.has(resolved)) return
        seen.add(resolved)
        sitemapUrls.push(resolved)
      } catch {
        /* ignore */
      }
    }
    if (robots) for (const loc of parseRobotsSitemaps(robots)) addSitemap(loc)
    addSitemap(`${origin}/sitemap.xml`)

    const nested: string[] = []
    for (const sitemapUrl of sitemapUrls) {
      if (halted()) return
      const xml = await source.fetchText(sitemapUrl, work).catch(() => null)
      if (!xml) continue
      const locs = parseSitemapLocs(xml)
      if (/<sitemapindex/i.test(xml)) {
        nested.push(...locs)
        continue
      }
      for (const loc of locs) consider(loc, 1)
    }
    for (const sitemapUrl of nested) {
      if (halted()) return
      try {
        if (new URL(sitemapUrl).origin !== origin) continue
      } catch {
        continue
      }
      const xml = await source.fetchText(sitemapUrl, work).catch(() => null)
      if (!xml || /<sitemapindex/i.test(xml)) continue
      for (const loc of parseSitemapLocs(xml)) consider(loc, 1)
    }
  }

  const load = async (item: { url: string; depth: number }) => {
    current = item.url
    report()
    const fetched = await source.fetchPage(item.url, work).catch(() => null)
    if (halted()) return false
    if (fetched?.kind === 'skip') {
      stats.skipped += 1
      return false
    }
    const html = fetched?.kind === 'html' ? fetched.html : null
    const url = fetched?.url ? pageUrlOf(fetched.url) : item.url
    if (fetched?.kind === 'html' && !isInCrawlScope(url, start, options.scope) && item.depth > 0) {
      stats.skipped += 1
      return false
    }
    pageSeen.add(crawlKey(url))
    if (html == null) {
      if (!halted()) stats.failed += 1
      return false
    }
    recordCheck(url)
    stats.depth = Math.max(stats.depth, item.depth)
    ingestHtml(html, url, item.depth)
    return true
  }

  recordCheck(start)
  const startHrefs = source.startHrefs?.() ?? null
  if (startHrefs) {
    pageSeen.add(crawlKey(start))
    reserved = 1
    pagesFetched = 1
    for (let i = startHrefs.length - 1; i >= 0; i -= 1) consider(startHrefs[i], 1)
  } else {
    enqueuePage(start, 0, true)
  }

  if (source.fetchText) await seedSitemaps()
  report()

  const lane = async () => {
    for (;;) {
      if (halted()) return
      if (stack.length === 0 || reserved >= options.maxPages || checks.size >= maxTargets) {
        if (inFlight === 0) {
          if (stack.length > 0 || checks.size >= maxTargets) limitHit = true
          stack.length = 0
          wake()
          return
        }
        await new Promise<void>((resolve) => waiters.push(resolve))
        continue
      }
      const item = stack.pop()!
      reserved += 1
      inFlight += 1
      try {
        const ok = await load(item)
        if (!ok || halted()) reserved -= 1
        else pagesFetched += 1
      } finally {
        inFlight -= 1
        report()
        wake()
      }
    }
  }

  await Promise.all(Array.from({ length: options.concurrency }, lane))
  work.removeEventListener('abort', wake)

  if (hooks.signal?.aborted) throw new DOMException('The crawl was cancelled.', 'AbortError')
  const reason: CrawlStopReason = hooks.stopSignal?.aborted ? 'stopped' : limitHit ? 'limit' : 'complete'
  current = undefined
  report()

  let host = ''
  let title = ''
  try {
    host = bareHost(new URL(start).hostname)
    title = host
  } catch {
    title = start
  }

  const links = [...checks.values()]
  return {
    snapshot: {
      url: startUrl,
      title,
      host,
      links,
      truncated: links.length >= maxTargets,
    },
    pageCount: pagesFetched,
    summary: {
      found: checks.size,
      saved: pagesFetched,
      skipped: stats.skipped,
      failed: stats.failed,
      rendered: 0,
      depth: stats.depth,
      reason,
    },
  }
}
