import { MAX_PAGES_CEILING } from './index'

export type CrawlScope = 'folder' | 'site'
export type RenderMode = 'off' | 'auto' | 'always'

export interface CrawlOptions {
  scope: CrawlScope
  /** Link levels followed from the start page; 0 saves only the start page. */
  maxDepth: number
  maxPages: number
  concurrency: number
  render: RenderMode
  /** Case-insensitive substrings; matching URLs are never requested. */
  exclude: string[]
}

export const MAX_CRAWL_DEPTH = 20
export const MAX_CRAWL_CONCURRENCY = 8
const MAX_RENDER_CONCURRENCY = 2

export const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
  scope: 'folder',
  maxDepth: 3,
  maxPages: 300,
  concurrency: 4,
  render: 'auto',
  exclude: ['logout', 'log-out', 'signout', 'sign-out'],
}

export interface CrawlProgress {
  /** Distinct in-scope pages discovered so far, including the start page. */
  found: number
  saved: number
  queued: number
  /** Not HTML, redirected off-site, or a duplicate of a saved page. */
  skipped: number
  failed: number
  rendered: number
  /** Deepest link level saved so far. */
  depth: number
  current?: string
}

/** Why the crawl ended: the queue ran dry, the page limit was reached, or the user stopped it. */
export type CrawlStopReason = 'complete' | 'limit' | 'stopped'

export interface CrawlSummary {
  found: number
  saved: number
  skipped: number
  failed: number
  rendered: number
  depth: number
  reason: CrawlStopReason
}

export interface CrawledPage {
  url: string
  html: string
  depth: number
  rendered: boolean
}

export type FetchedPage = { kind: 'html'; html: string; url: string } | { kind: 'skip' } | null

export interface CrawlSource {
  fetchPage: (url: string, signal: AbortSignal) => Promise<FetchedPage>
  /** Runs the page's scripts and returns the resulting DOM; null when the page cannot be rendered. */
  renderPage?: (url: string, signal: AbortSignal) => Promise<string | null>
}

export interface CrawlHooks {
  /** Cancels the crawl; `crawlSite` rejects. */
  signal?: AbortSignal
  /** Ends the crawl early but keeps every page saved so far. */
  stopSignal?: AbortSignal
  onProgress?: (progress: CrawlProgress) => void
  /** Rendered copy of the start page, already open in the tab. */
  startHtml?: () => string | null
}

const PAGE_EXTENSION = /\.(x?html?|shtml|php|aspx?|jsp|cfm)$/i
const ANY_EXTENSION = /\.[a-z0-9]{1,8}$/i

export function clampCrawlOptions(options: Partial<CrawlOptions>): CrawlOptions {
  const merged = { ...DEFAULT_CRAWL_OPTIONS, ...options }
  const clamp = (value: number, min: number, max: number, fallback: number) =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback
  return {
    scope: merged.scope === 'site' ? 'site' : 'folder',
    maxDepth: clamp(merged.maxDepth, 0, MAX_CRAWL_DEPTH, DEFAULT_CRAWL_OPTIONS.maxDepth),
    maxPages: clamp(merged.maxPages, 1, MAX_PAGES_CEILING, DEFAULT_CRAWL_OPTIONS.maxPages),
    concurrency: clamp(merged.concurrency, 1, MAX_CRAWL_CONCURRENCY, DEFAULT_CRAWL_OPTIONS.concurrency),
    render: merged.render === 'off' || merged.render === 'always' ? merged.render : 'auto',
    exclude: merged.exclude.map((item) => item.trim().toLowerCase()).filter(Boolean),
  }
}

export function parseExcludeList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

/** The URL a page is saved under: no fragment and no query string. */
export function pageUrlOf(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url.split('#')[0].split('?')[0]
  }
}

/**
 * Identity used for cycle detection. `/docs`, `/docs/` and `/docs/index.html` are one page,
 * and query strings are ignored so calendars and sort links cannot grow the crawl forever.
 */
export function crawlKey(url: string): string {
  try {
    const parsed = new URL(url)
    let path = parsed.pathname.replace(/\/{2,}/g, '/').replace(/\/index\.html?$/i, '/')
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
    return `${parsed.origin.toLowerCase()}${path}`
  } catch {
    return url
  }
}

function folderOf(url: string): string {
  try {
    const path = new URL(url).pathname
    return path.slice(0, path.lastIndexOf('/') + 1)
  } catch {
    return '/'
  }
}

export function isInCrawlScope(url: string, startUrl: string, scope: CrawlScope): boolean {
  try {
    const target = new URL(url)
    const start = new URL(startUrl)
    if (target.origin !== start.origin) return false
    return scope === 'site' || target.pathname.startsWith(folderOf(startUrl))
  } catch {
    return false
  }
}

/** Pages are extensionless routes, folders, or server pages; images, PDFs and scripts are not. */
export function looksLikePageUrl(url: string): boolean {
  try {
    const last = new URL(url).pathname.split('/').pop() ?? ''
    return !last || PAGE_EXTENSION.test(last) || !ANY_EXTENSION.test(last)
  } catch {
    return false
  }
}

const ENTITIES: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&#x27;': "'", '&#38;': '&' }

function decodeAttribute(value: string): string {
  return value.replace(/&(?:amp|quot|#39|#x27|#38);/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
}

function attributeOf(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(tag)
  if (!match) return null
  return decodeAttribute(match[1] ?? match[2] ?? match[3] ?? '')
}

/** Absolute http(s) URLs of every `<a>` and `<area>` link, honouring `<base href>`. */
export function extractPageLinks(html: string, pageUrl: string): string[] {
  let base = pageUrl
  const baseTag = /<base\b[^>]*>/i.exec(html)
  const baseHref = baseTag ? attributeOf(baseTag[0], 'href') : null
  if (baseHref) {
    try {
      base = new URL(baseHref, pageUrl).href
    } catch {
      /* keep the page URL */
    }
  }
  const out: string[] = []
  for (const match of html.matchAll(/<(?:a|area)\b[^>]*>/gi)) {
    const tag = match[0]
    if (/\sdownload(?:\s|=|>)/i.test(tag)) continue
    const href = attributeOf(tag, 'href')?.trim()
    if (!href || href.startsWith('#')) continue
    try {
      const resolved = new URL(href, base)
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') out.push(resolved.href)
    } catch {
      /* malformed href */
    }
  }
  return out
}

/** True when the HTML is an app shell that only fills in once its scripts run. */
export function looksClientRendered(html: string): boolean {
  const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html
  const text = body
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length >= 200) return false
  const emptyMount =
    /<(div|main|section)\b[^>]*\bid\s*=\s*["'](root|app|__next|__nuxt|___gatsby|svelte|main)["'][^>]*>\s*<\/\1>/i.test(
      body,
    )
  const moduleScript = /<script\b[^>]*\btype\s*=\s*["']module["']/i.test(html)
  const externalScripts = html.match(/<script\b[^>]*\ssrc\s*=/gi)?.length ?? 0
  return emptyMount || moduleScript || externalScripts >= 2
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

function limiter(size: number) {
  let active = 0
  const waiting: (() => void)[] = []
  return async <T>(task: () => Promise<T>): Promise<T> => {
    while (active >= size) await new Promise<void>((resolve) => waiting.push(resolve))
    active += 1
    try {
      return await task()
    } finally {
      active -= 1
      waiting.shift()?.()
    }
  }
}

/**
 * Breadth-first crawl from `startUrl` with a fixed number of parallel lanes. Every URL is
 * claimed in `visited` before it is queued, so links that point back at each other are only
 * requested once. The crawl ends when the queue drains, the page limit is reached, or one of
 * the hook signals fires.
 */
export async function crawlSite(
  startUrl: string,
  input: Partial<CrawlOptions>,
  source: CrawlSource,
  hooks: CrawlHooks = {},
): Promise<{ pages: CrawledPage[]; summary: CrawlSummary }> {
  const options = clampCrawlOptions(input)
  const start = pageUrlOf(startUrl)
  const work = mergeSignals([hooks.signal, hooks.stopSignal])
  const render = limiter(MAX_RENDER_CONCURRENCY)

  const visited = new Set<string>()
  const savedKeys = new Set<string>()
  const queue: { url: string; depth: number }[] = []
  const pages: CrawledPage[] = []
  const stats = { found: 0, saved: 0, skipped: 0, failed: 0, rendered: 0, depth: 0 }
  let reserved = 0
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

  const report = () =>
    hooks.onProgress?.({ ...stats, queued: queue.length, current })

  const enqueue = (url: string, depth: number, force = false) => {
    const key = crawlKey(url)
    if (visited.has(key)) return
    visited.add(key)
    if (!force) {
      if (!isInCrawlScope(url, start, options.scope) || !looksLikePageUrl(url)) return
      const lower = url.toLowerCase()
      if (options.exclude.some((part) => lower.includes(part))) return
    }
    stats.found += 1
    queue.push({ url: pageUrlOf(url), depth })
    wake()
  }

  const load = async (item: { url: string; depth: number }): Promise<CrawledPage | null> => {
    current = item.url
    report()
    const fetched = await source.fetchPage(item.url, work).catch(() => null)
    if (halted()) return null
    if (fetched?.kind === 'skip') {
      stats.skipped += 1
      return null
    }
    let html = fetched?.html ?? null
    const url = fetched?.url ? pageUrlOf(fetched.url) : item.url
    if (fetched && !isInCrawlScope(url, start, options.scope) && item.depth > 0) {
      stats.skipped += 1
      return null
    }
    visited.add(crawlKey(url))

    let rendered = false
    const wantsRender =
      html == null || options.render === 'always' || (options.render === 'auto' && looksClientRendered(html))
    if (wantsRender && (options.render !== 'off' || html == null)) {
      const snapshot =
        item.depth === 0
          ? (hooks.startHtml?.() ?? null)
          : options.render !== 'off' && source.renderPage
            ? await render(() => source.renderPage!(url, work)).catch(() => null)
            : null
      if (snapshot) {
        html = snapshot
        rendered = true
      }
    }
    if (html == null) {
      if (!halted()) stats.failed += 1
      return null
    }
    return { url, html, depth: item.depth, rendered }
  }

  const lane = async () => {
    for (;;) {
      if (halted()) return
      if (queue.length === 0 || reserved >= options.maxPages) {
        if (inFlight === 0) {
          if (queue.length > 0) limitHit = true
          wake()
          return
        }
        await new Promise<void>((resolve) => waiters.push(resolve))
        continue
      }
      const item = queue.shift()!
      reserved += 1
      inFlight += 1
      try {
        const page = await load(item)
        const key = page ? crawlKey(page.url) : ''
        if (!page || halted()) {
          reserved -= 1
        } else if (savedKeys.has(key)) {
          reserved -= 1
          stats.skipped += 1
        } else {
          savedKeys.add(key)
          pages.push(page)
          stats.saved += 1
          if (page.rendered) stats.rendered += 1
          stats.depth = Math.max(stats.depth, page.depth)
          if (page.depth < options.maxDepth) {
            for (const link of extractPageLinks(page.html, page.url)) enqueue(link, page.depth + 1)
          }
        }
      } finally {
        inFlight -= 1
        report()
        wake()
      }
    }
  }

  enqueue(start, 0, true)
  report()
  await Promise.all(Array.from({ length: options.concurrency }, lane))
  work.removeEventListener('abort', wake)

  if (hooks.signal?.aborted) throw new DOMException('The crawl was cancelled.', 'AbortError')
  const reason: CrawlStopReason = hooks.stopSignal?.aborted ? 'stopped' : limitHit ? 'limit' : 'complete'
  current = undefined
  report()
  return { pages, summary: { ...stats, reason } }
}
