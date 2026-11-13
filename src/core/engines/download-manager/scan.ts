import { isFileUrl } from '@/core/engines/links/pageLinks'
import {
  classifyFile,
  extensionFromPath,
  hostFromUrl,
  isLikelyDirectFileUrl,
  type DownloadableResource,
  type DownloadableScanResult,
} from '@/core/download-manager'
import type { PageImage } from '@/core/engines/imageDownloader'

const STREAM_BLOCKED = /\.(m3u8|mpd)(\?|$)/i
const YOUTUBE_HOST = /(?:^|\.)youtube\.com$|youtu\.be$/i

function labelFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || 'file')
  } catch {
    return 'file'
  }
}

function resourceFromUrl(
  url: string,
  source: DownloadableResource['source'],
  mime?: string | null,
): DownloadableResource {
  const domain = hostFromUrl(url)
  const ext = extensionFromPath(url) || null
  const category = classifyFile(mime ?? undefined, url)
  let downloadable = isLikelyDirectFileUrl(url) || Boolean(ext)
  let reason: string | undefined
  if (STREAM_BLOCKED.test(url)) {
    downloadable = false
    reason = 'Adaptive streams (HLS/DASH) cannot be downloaded with the browser Downloads API.'
  }
  if (YOUTUBE_HOST.test(domain)) {
    downloadable = false
    reason = 'Platform-restricted media is not supported.'
  }
  try {
    const proto = new URL(url).protocol
    if (proto !== 'http:' && proto !== 'https:') {
      downloadable = false
      reason = 'Only direct HTTP(S) resources are supported.'
    }
  } catch {
    downloadable = false
    reason = 'Invalid URL'
  }
  return {
    url,
    label: labelFromUrl(url),
    ext,
    mime: mime ?? null,
    category,
    domain,
    downloadable,
    reason,
    source,
  }
}

export function mergeResources(links: { href: string; download?: boolean; mimeHint?: string }[], images: PageImage[]): DownloadableResource[] {
  const map = new Map<string, DownloadableResource>()
  for (const link of links) {
    const href = link.href
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) continue
    if (!isFileUrl(href) && !link.download && !isLikelyDirectFileUrl(href)) continue
    const res = resourceFromUrl(href, 'link', link.mimeHint)
    map.set(res.url, res)
  }
  for (const image of images) {
    const res = resourceFromUrl(image.url, 'image', null)
    res.width = image.width
    res.height = image.height
    map.set(res.url, res)
  }
  return [...map.values()]
}

export function buildScanResult(
  pageUrl: string,
  title: string,
  resources: DownloadableResource[],
  truncated = false,
): DownloadableScanResult {
  return { url: pageUrl, title, resources, truncated }
}

export function collectMediaElements(doc: Document = document): DownloadableResource[] {
  const out: DownloadableResource[] = []
  const seen = new Set<string>()
  const nodes = doc.querySelectorAll<HTMLMediaElement>('video[src], audio[src], video source[src], audio source[src]')
  for (const node of nodes) {
    let src = node.getAttribute('src')
    if (node instanceof HTMLSourceElement && node.src) src = node.src
    else if (node instanceof HTMLMediaElement && node.currentSrc) src = node.currentSrc
    if (!src || seen.has(src)) continue
    seen.add(src)
    const res = resourceFromUrl(src, 'media', node.getAttribute('type'))
    if (node instanceof HTMLVideoElement) {
      res.width = node.videoWidth
      res.height = node.videoHeight
      if (Number.isFinite(node.duration)) {
        /* duration stored indirectly via label suffix */
        res.label = `${res.label} (${Math.round(node.duration)}s)`
      }
    }
    out.push(res)
  }
  return out
}
