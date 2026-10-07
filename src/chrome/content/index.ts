import { isExtensionMessage } from '@/core/messaging/types'

import { cancelPicker, isPickerActive, startPicker } from './elementPicker'

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
    internal: anchor.href.startsWith(origin) || anchor.getAttribute('href')?.startsWith('/') === true,
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
  return { localStorage: read(() => window.localStorage), sessionStorage: read(() => window.sessionStorage) }
}

chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  if (!isExtensionMessage(raw)) return false
  switch (raw.type) {
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
    default:
      return false
  }
})

export {}
