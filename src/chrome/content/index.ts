import { isExtensionMessage } from '@/core/messaging/types'

import { bytesToBase64, type HtmlBundleProgress } from '@/core/engines/htmlArchive'

import { cancelPicker, isPickerActive, startPicker } from './elementPicker'
import { buildHtmlBundleInPage, scanHtmlBundleFromDom } from './htmlBundle'

const BUNDLE_CHUNK_BYTES = 4 * 1024 * 1024
const PROGRESS_INTERVAL_MS = 120
const builtBundles = new Map<string, Uint8Array>()
const activeBuilds = new Map<string, AbortController>()

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
}

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
  }
}

chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
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
    case 'GET_PAGE_INFO':
      sendResponse({ ok: true, data: collectPageInfo() })
      return false
    case 'GET_STORAGE_SNAPSHOT':
      sendResponse({ ok: true, data: collectStorage() })
      return false
    case 'GET_SELECTED_ELEMENT':
      sendResponse({ ok: true, data: { pickerActive: isPickerActive() } })
      return false
    case 'SCAN_HTML_BUNDLE':
      sendResponse({
        ok: true,
        data: scanHtmlBundleFromDom({
          htmlOnly: raw.htmlOnly ?? true,
          sameFolderOnly: raw.sameFolderOnly ?? true,
        }),
      })
      return false
    case 'BUILD_HTML_BUNDLE': {
      const { buildId } = raw
      const controller = new AbortController()
      activeBuilds.set(buildId, controller)
      void buildHtmlBundleInPage(
        {
          includeCurrent: raw.includeCurrent,
          selectedResolvedUrls: raw.selectedResolvedUrls,
          includeAssets: raw.includeAssets,
          maxPages: raw.maxPages,
          maxBytes: raw.maxBytes,
        },
        throttledProgress(buildId),
        controller.signal,
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
        .finally(() => activeBuilds.delete(buildId))
      sendResponse({ ok: true, data: { accepted: true } })
      return false
    }
    case 'CANCEL_HTML_BUNDLE':
      activeBuilds.get(raw.buildId)?.abort()
      activeBuilds.delete(raw.buildId)
      builtBundles.delete(raw.buildId)
      sendResponse({ ok: true, data: { cancelled: true } })
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
    default:
      return false
  }
})

export {}
