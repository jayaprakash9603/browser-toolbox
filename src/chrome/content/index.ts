import { isExtensionMessage } from '@/core/messaging/types'

import { bytesToBase64, type HtmlBundleProgress } from '@/core/engines/htmlArchive'
import type { PageLinkMark } from '@/core/engines/linkChecker/report'

import { cancelPicker, isPickerActive, startPicker } from './elementPicker'
import { clearStudioHighlights, highlightStudioSelector } from './selectorStudioHighlight'
import { buildHtmlBundleInPage, scanHtmlBundleFromDom } from './htmlBundle'
import { crawlSiteForLinks } from './linkCheckerCrawl'
import { scanImagesOnPage } from './scanImages'
import { collectSeoData } from './seoCollect'
import { applySeoHighlight, clearSeoHighlight } from './seoHighlight'
import { collectPageSvgs, svgToJsx } from './collectors/svgs'
import { collectPageLinks, locatePageLink } from './collectors/links'
import { clearPageLinkMarks, markPageLinks } from './collectors/linkMarks'
import { setFontInspector, setWireframe } from './designModes'
import { getInspectorState, runInspectorAction, setInspector } from './pageInspector/inspector'
import type { InspectorAction, InspectorLabels, PageInspectorOptions } from './pageInspector/model'
import { articleHtmlToMarkdown, selectionHtmlToMarkdown } from '@/core/text/htmlToMarkdown'
import { extractReadablePage, extractSelection } from '@/core/text/readablePage'

import { handleScraperMessage } from './scraper/handlers'

const BUNDLE_CHUNK_BYTES = 4 * 1024 * 1024
const PROGRESS_INTERVAL_MS = 120
const builtBundles = new Map<string, Uint8Array>()
const activeBuilds = new Map<string, AbortController>()
/** Ends a crawl early and zips what it has; `activeBuilds` cancels without a ZIP. */
const crawlStops = new Map<string, AbortController>()
const linkCrawlStops = new Map<string, AbortController>()

function throttledProgress(buildId: string) {
  let lastSent = 0
  return (progress: HtmlBundleProgress) => {
    const now = Date.now()
    const boundary = progress.done === 0 || progress.done === progress.total
    if (!boundary && now - lastSent < PROGRESS_INTERVAL_MS) return
    lastSent = now
    chrome.runtime
      .sendMessage({ type: 'HTML_BUNDLE_PROGRESS', buildId, ...progress })
      .catch(() => {})
  }
}

export interface PageInfo {
  url: string
  title: string
  metaDescription: string | null
  canonical: string | null
  language: string
  charset: string
  viewport: string | null
  openGraph: Record<string, string>
  twitter: Record<string, string>
  links: { href: string; text: string; internal: boolean }[]
  images: { src: string; alt: string | null; width: number; height: number }[]
  headings: { level: number; text: string }[]
}

export interface StorageSnapshot {
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  origin?: string
}

export type StorageWriteResult = { ok: true; snapshot: StorageSnapshot } | { ok: false; error: string }

function collectPageInfo(): PageInfo {
  const meta = (name: string) =>
    document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? null

  const openGraph: Record<string, string> = {}
  document.querySelectorAll<HTMLMetaElement>('meta[property^="og:"]').forEach((node) => {
    openGraph[node.getAttribute('property') ?? ''] = node.content
  })
  const twitter: Record<string, string> = {}
  document.querySelectorAll<HTMLMetaElement>('meta[name^="twitter:"]').forEach((node) => {
    twitter[node.getAttribute('name') ?? ''] = node.content
  })

  const origin = window.location.origin
  const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].map((anchor) => ({
    href: anchor.href,
    text: (anchor.textContent ?? '').trim().slice(0, 120),
    internal:
      anchor.href.startsWith(origin) || anchor.getAttribute('href')?.startsWith('/') === true,
  }))

  const images = [...document.querySelectorAll<HTMLImageElement>('img')].map((img) => ({
    src: img.currentSrc || img.src,
    alt: img.getAttribute('alt'),
    width: img.naturalWidth,
    height: img.naturalHeight,
  }))

  const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((heading) => ({
    level: Number(heading.tagName[1]),
    text: (heading.textContent ?? '').trim().slice(0, 160),
  }))

  return {
    url: window.location.href,
    title: document.title,
    metaDescription: meta('description'),
    canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null,
    language: document.documentElement.lang || '',
    charset: document.characterSet,
    viewport: meta('viewport'),
    openGraph,
    twitter,
    links,
    images,
    headings,
  }
}

function collectStorage(): StorageSnapshot {
  const read = (getter: () => Storage): Record<string, string> => {
    const out: Record<string, string> = {}
    try {
      const storage = getter()
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index)
        if (key !== null) out[key] = storage.getItem(key) ?? ''
      }
    } catch {
      /* storage blocked on this page */
    }
    return out
  }
  return {
    localStorage: read(() => window.localStorage),
    sessionStorage: read(() => window.sessionStorage),
    origin: window.location.origin,
  }
}

function writeStorage(message: {
  area: 'local' | 'session'
  op: 'set' | 'remove' | 'clear' | 'merge'
  key?: string
  value?: string
  entries?: Record<string, string>
}): StorageWriteResult {
  try {
    const storage = message.area === 'local' ? window.localStorage : window.sessionStorage
    if (message.op === 'set' && message.key != null) storage.setItem(message.key, message.value ?? '')
    else if (message.op === 'remove' && message.key != null) storage.removeItem(message.key)
    else if (message.op === 'clear') storage.clear()
    else if (message.op === 'merge' && message.entries) {
      for (const [key, value] of Object.entries(message.entries)) storage.setItem(key, value)
    }
    return { ok: true, snapshot: collectStorage() }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'write failed' }
  }
}

const contentScope = window as unknown as { __toolboxContentScript?: boolean }
const contentAlreadyInstalled = Boolean(contentScope.__toolboxContentScript)
contentScope.__toolboxContentScript = true

if (!contentAlreadyInstalled) chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  if (!isExtensionMessage(raw)) return false
  switch (raw.type) {
    case 'CONTENT_SCRIPT_PING':
      sendResponse({ ok: true, data: { ready: true } })
      return false
    case 'PICK_ELEMENT_START':
      startPicker()
      sendResponse({ ok: true, data: { active: true } })
      return false
    case 'PICK_ELEMENT_CANCEL':
      cancelPicker()
      sendResponse({ ok: true, data: { active: false } })
      return false
    case 'SELECTOR_STUDIO_HIGHLIGHT':
      sendResponse({
        ok: true,
        data: highlightStudioSelector(raw.kind, raw.expression, raw.identityPath ?? null),
      })
      return false
    case 'SELECTOR_STUDIO_CLEAR':
      clearStudioHighlights()
      sendResponse({ ok: true, data: { cleared: true } })
      return false
    case 'GET_PAGE_INFO':
      sendResponse({ ok: true, data: collectPageInfo() })
      return false
    case 'GET_PAGE_LINKS':
      sendResponse({ ok: true, data: collectPageLinks() })
      return false
    case 'CRAWL_SITE_FOR_LINKS': {
      const { crawlId, crawl } = raw as { crawlId: string; crawl: import('@/core/engines/htmlArchive/crawl').CrawlOptions }
      const stop = new AbortController()
      linkCrawlStops.set(crawlId, stop)
      void crawlSiteForLinks(crawl, {
        stopSignal: stop.signal,
        onProgress: (progress) =>
          void chrome.runtime.sendMessage({ type: 'LINK_CRAWL_PROGRESS', crawlId, progress }).catch(() => {}),
      })
        .then((data) => {
          linkCrawlStops.delete(crawlId)
          sendResponse({ ok: true, data })
        })
        .catch((error: unknown) => {
          linkCrawlStops.delete(crawlId)
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : 'Could not crawl this site for links.',
          })
        })
      return true
    }
    case 'STOP_LINK_CRAWL':
      linkCrawlStops.get(raw.crawlId)?.abort()
      sendResponse({ ok: true, data: { stopping: linkCrawlStops.has(raw.crawlId) } })
      return false
    case 'LOCATE_PAGE_LINK': {
      const { index, href } = raw as { index: number; href: string }
      sendResponse({ ok: true, data: locatePageLink(index, href) })
      return false
    }
    case 'MARK_PAGE_LINKS':
      sendResponse({ ok: true, data: markPageLinks((raw as { marks: PageLinkMark[] }).marks ?? []) })
      return false
    case 'CLEAR_PAGE_LINK_MARKS':
      clearPageLinkMarks()
      sendResponse({ ok: true, data: { cleared: true } })
      return false
    case 'GET_PAGE_SVGS':
      sendResponse({ ok: true, data: collectPageSvgs() })
      return false
    case 'SVG_TO_JSX':
      sendResponse({ ok: true, data: svgToJsx((raw as { markup: string }).markup) })
      return false
    case 'WIREFRAME_TOGGLE':
      setWireframe((raw as { enabled: boolean }).enabled)
      sendResponse({ ok: true, data: { enabled: (raw as { enabled: boolean }).enabled } })
      return false
    case 'FONT_INSPECTOR_TOGGLE':
      setFontInspector((raw as { enabled: boolean }).enabled)
      sendResponse({ ok: true, data: { enabled: (raw as { enabled: boolean }).enabled } })
      return false
    case 'PAGE_INSPECTOR_SET': {
      const { options, labels } = raw as { options: Partial<PageInspectorOptions>; labels?: Partial<InspectorLabels> }
      sendResponse({ ok: true, data: setInspector(options, labels) })
      return false
    }
    case 'PAGE_INSPECTOR_GET':
      sendResponse({ ok: true, data: getInspectorState() })
      return false
    case 'PAGE_INSPECTOR_ACTION':
      sendResponse({ ok: true, data: runInspectorAction((raw as { action: InspectorAction }).action) })
      return false
    case 'GET_READABLE_TEXT': {
      const scope = (raw as { scope?: 'page' | 'selection' }).scope
      sendResponse({ ok: true, data: scope === 'selection' ? extractSelection(document) : extractReadablePage(document) })
      return false
    }
    case 'GET_MARKDOWN_FROM_PAGE': {
      const mode = (raw as { mode: 'selection' | 'article' }).mode
      sendResponse({
        ok: true,
        data: {
          markdown: mode === 'selection' ? selectionHtmlToMarkdown() ?? '' : articleHtmlToMarkdown(),
        },
      })
      return false
    }
    case 'GET_SEO_DATA':
      sendResponse({ ok: true, data: collectSeoData() })
      return false
    case 'SEO_HIGHLIGHT':
      sendResponse({ ok: true, data: { count: applySeoHighlight(raw.kind) } })
      return false
    case 'SEO_CLEAR_HIGHLIGHT':
      clearSeoHighlight()
      sendResponse({ ok: true, data: { cleared: true } })
      return false
    case 'SCAN_PAGE_IMAGES':
      sendResponse({ ok: true, data: scanImagesOnPage() })
      return false
    case 'GET_STORAGE_SNAPSHOT':
      sendResponse({ ok: true, data: collectStorage() })
      return false
    case 'STORAGE_WRITE':
      sendResponse({ ok: true, data: writeStorage(raw) })
      return false
    case 'GET_SELECTED_ELEMENT':
      sendResponse({ ok: true, data: { pickerActive: isPickerActive() } })
      return false
    case 'SCAN_HTML_BUNDLE':
      void scanHtmlBundleFromDom({
        htmlOnly: raw.htmlOnly ?? true,
        sameFolderOnly: raw.sameFolderOnly ?? true,
      })
        .then((data) => sendResponse({ ok: true, data }))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : 'Could not scan HTML links.',
          }),
        )
      return true
    case 'BUILD_HTML_BUNDLE': {
      const { buildId } = raw
      const controller = new AbortController()
      const stop = new AbortController()
      activeBuilds.set(buildId, controller)
      crawlStops.set(buildId, stop)
      void buildHtmlBundleInPage(
        {
          includeCurrent: raw.includeCurrent,
          selectedResolvedUrls: raw.selectedResolvedUrls,
          includeAssets: raw.includeAssets,
          maxPages: raw.maxPages,
          maxBytes: raw.maxBytes,
          crawl: raw.crawl,
        },
        throttledProgress(buildId),
        controller.signal,
        stop.signal,
      )
        .then((result) => {
          if (controller.signal.aborted) return
          builtBundles.set(buildId, result.zipBytes)
          return chrome.runtime.sendMessage({
            type: 'HTML_BUNDLE_READY',
            buildId,
            stats: result.stats,
            size: result.zipBytes.byteLength,
            chunkCount: Math.max(1, Math.ceil(result.zipBytes.byteLength / BUNDLE_CHUNK_BYTES)),
          })
        })
        .catch((error: unknown) =>
          chrome.runtime.sendMessage({
            type: 'HTML_BUNDLE_FAILED',
            buildId,
            error: error instanceof Error ? error.message : 'Bundle build failed.',
          }),
        )
        .catch(() => {})
        .finally(() => {
          activeBuilds.delete(buildId)
          crawlStops.delete(buildId)
        })
      sendResponse({ ok: true, data: { accepted: true } })
      return false
    }
    case 'CANCEL_HTML_BUNDLE':
      activeBuilds.get(raw.buildId)?.abort()
      activeBuilds.delete(raw.buildId)
      crawlStops.delete(raw.buildId)
      builtBundles.delete(raw.buildId)
      sendResponse({ ok: true, data: { cancelled: true } })
      return false
    case 'STOP_HTML_BUNDLE_CRAWL':
      crawlStops.get(raw.buildId)?.abort()
      sendResponse({ ok: true, data: { stopping: crawlStops.has(raw.buildId) } })
      return false
    case 'READ_HTML_BUNDLE_CHUNK': {
      const bytes = builtBundles.get(raw.buildId)
      if (!bytes) {
        sendResponse({ ok: false, error: 'Bundle expired. Download again.' })
        return false
      }
      const start = raw.index * BUNDLE_CHUNK_BYTES
      const chunk = bytes.subarray(start, start + BUNDLE_CHUNK_BYTES)
      if (start + BUNDLE_CHUNK_BYTES >= bytes.byteLength) builtBundles.delete(raw.buildId)
      sendResponse({ ok: true, data: { base64: bytesToBase64(chunk) } })
      return false
    }
    case 'SCRAPER_DETECT':
    case 'SCRAPER_EXTRACT':
    case 'SCRAPER_HIGHLIGHT':
    case 'SCRAPER_CLEAR':
    case 'SCRAPER_PICK_START':
    case 'SCRAPER_PICK_CANCEL':
    case 'SCRAPER_SUGGEST_NEXT':
    case 'SCRAPER_ROW_COUNT':
    case 'SCRAPER_WAIT_DATA':
    case 'SCRAPER_NEXT':
    case 'SCRAPER_SCROLL':
      return handleScraperMessage(raw, sendResponse) === true
    default:
      return false
  }
})

export {}
