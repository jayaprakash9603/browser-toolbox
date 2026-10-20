import { dedupePageImages } from './filters'
import { guessExtFromUrl } from './normalize'
import type { ImageSource, PageImage } from './types'

const IMAGE_LINK_RE = /\.(jpe?g|png|gif|webp|avif|bmp|svg|ico)(\?|$)/i
const CSS_WALK_LIMIT = 2000
const LAZY_ATTRS = ['data-src', 'data-lazy-src', 'data-original', 'data-url']

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).href
  } catch {
    return null
  }
}

function pickLargestFromSrcset(srcset: string, baseUrl: string): string | null {
  const parts = srcset
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  let bestUrl: string | null = null
  let bestScore = -1
  for (const part of parts) {
    const [urlPart, descriptor] = part.split(/\s+/)
    if (!urlPart) continue
    const resolved = resolveUrl(urlPart, baseUrl)
    if (!resolved) continue
    let score = 1
    if (descriptor?.endsWith('w')) score = Number.parseInt(descriptor, 10) || 1
    else if (descriptor?.endsWith('x')) score = Number.parseFloat(descriptor) * 1000
    if (score >= bestScore) {
      bestScore = score
      bestUrl = resolved
    }
  }
  return bestUrl
}

function pushImage(
  out: PageImage[],
  url: string | null | undefined,
  source: ImageSource,
  width: number,
  height: number,
  alt: string | null,
): void {
  if (!url || url.startsWith('javascript:')) return
  const trimmed = url.trim()
  if (!trimmed) return
  out.push({
    url: trimmed,
    source,
    width: Math.max(0, width),
    height: Math.max(0, height),
    alt,
    ext: guessExtFromUrl(trimmed),
  })
}

function extractCssUrls(value: string): string[] {
  const urls: string[] = []
  const re = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(value)) !== null) {
    const raw = match[2]?.trim()
    if (raw && !raw.startsWith('data:text')) urls.push(raw)
  }
  return urls
}

function serializeSvg(svg: SVGSVGElement): string {
  try {
    const xml = new XMLSerializer().serializeToString(svg)
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
  } catch {
    return ''
  }
}

export function scanPageImages(doc: Document, pageUrl: string): PageImage[] {
  const baseUrl = pageUrl || doc.baseURI || ''
  const out: PageImage[] = []

  for (const img of doc.querySelectorAll<HTMLImageElement>('img')) {
    const candidates = new Set<string>()
    if (img.currentSrc) candidates.add(img.currentSrc)
    if (img.src) candidates.add(img.src)
    const srcset = img.getAttribute('srcset')
    if (srcset) {
      const best = pickLargestFromSrcset(srcset, baseUrl)
      if (best) candidates.add(best)
    }
    for (const attr of LAZY_ATTRS) {
      const lazy = img.getAttribute(attr)
      if (lazy) candidates.add(resolveUrl(lazy, baseUrl) ?? lazy)
    }
    for (const url of candidates) {
      pushImage(out, url, 'img', img.naturalWidth, img.naturalHeight, img.getAttribute('alt'))
    }
  }

  for (const picture of doc.querySelectorAll('picture')) {
    for (const source of picture.querySelectorAll('source')) {
      const srcset = source.getAttribute('srcset')
      if (!srcset) continue
      const best = pickLargestFromSrcset(srcset, baseUrl)
      pushImage(out, best, 'picture', 0, 0, null)
    }
  }

  let walked = 0
  for (const el of doc.querySelectorAll<HTMLElement>('*')) {
    if (walked >= CSS_WALK_LIMIT) break
    walked += 1
    const style = doc.defaultView?.getComputedStyle(el)
    if (!style) continue
    const bg = style.backgroundImage
    if (!bg || bg === 'none') continue
    for (const raw of extractCssUrls(bg)) {
      const resolved = resolveUrl(raw, baseUrl) ?? raw
      pushImage(out, resolved, 'css', 0, 0, null)
    }
  }

  for (const svg of doc.querySelectorAll<SVGSVGElement>('svg')) {
    const dataUrl = serializeSvg(svg)
    if (dataUrl) {
      const rect = svg.getBoundingClientRect()
      pushImage(out, dataUrl, 'svg', Math.round(rect.width), Math.round(rect.height), null)
    }
  }

  for (const anchor of doc.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const href = anchor.href
    if (IMAGE_LINK_RE.test(href)) pushImage(out, href, 'link', 0, 0, null)
  }

  for (const video of doc.querySelectorAll<HTMLVideoElement>('video')) {
    const poster = video.getAttribute('poster')
    if (poster) pushImage(out, resolveUrl(poster, baseUrl), 'video', 0, 0, null)
  }

  const metaOg = doc.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content
  if (metaOg) pushImage(out, resolveUrl(metaOg, baseUrl), 'meta', 0, 0, null)
  const metaTw =
    doc.querySelector<HTMLMetaElement>('meta[name="twitter:image"]')?.content ??
    doc.querySelector<HTMLMetaElement>('meta[property="twitter:image"]')?.content
  if (metaTw) pushImage(out, resolveUrl(metaTw, baseUrl), 'meta', 0, 0, null)

  return dedupePageImages(out)
}
