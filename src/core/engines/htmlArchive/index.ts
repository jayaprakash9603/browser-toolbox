import { zipSync } from 'fflate'

export const DEFAULT_MAX_PAGES = 50
export const DEFAULT_MAX_BYTES = 32 * 1024 * 1024

export interface HtmlLinkCandidate {
  id: string
  href: string
  resolvedUrl: string
  label: string
  sameFolder: boolean
  filename: string
}

export interface ScanOptions {
  htmlOnly: boolean
  sameFolderOnly: boolean
}

export interface AssetRef {
  url: string
  attribute: string
}

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).href
  } catch {
    return null
  }
}

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin
  } catch {
    return false
  }
}

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return ''
  }
}

function dirnameOf(url: string): string {
  const path = pathnameOf(url)
  const index = path.lastIndexOf('/')
  return index === -1 ? '/' : path.slice(0, index + 1)
}

function basenameOf(url: string): string {
  const path = pathnameOf(url)
  const segment = path.split('/').filter(Boolean).pop()
  return segment ?? 'index.html'
}

function hasHtmlExtension(pathname: string): boolean {
  return /\.html?$/i.test(pathname)
}

export function isHtmlPageLink(
  href: string,
  pageUrl: string,
  options: Pick<ScanOptions, 'htmlOnly'> = { htmlOnly: true },
): boolean {
  const trimmed = href.trim()
  if (!trimmed || trimmed.startsWith('#')) return false
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('javascript:') || lower.startsWith('mailto:') || lower.startsWith('tel:'))
    return false

  const resolved = resolveUrl(trimmed, pageUrl)
  if (!resolved || !sameOrigin(resolved, pageUrl)) return false

  const pathname = pathnameOf(resolved)
  if (options.htmlOnly && !hasHtmlExtension(pathname)) return false
  return true
}

export function isSameFolderLink(resolvedUrl: string, pageUrl: string): boolean {
  return dirnameOf(resolvedUrl) === dirnameOf(pageUrl)
}

export function scanAnchorList(
  anchors: { href: string; label: string }[],
  pageUrl: string,
  options: ScanOptions,
): HtmlLinkCandidate[] {
  const pageDir = dirnameOf(pageUrl)
  const seen = new Set<string>()
  const out: HtmlLinkCandidate[] = []

  for (const anchor of anchors) {
    if (!isHtmlPageLink(anchor.href, pageUrl, { htmlOnly: options.htmlOnly })) continue
    const resolvedUrl = resolveUrl(anchor.href, pageUrl)!
    if (seen.has(resolvedUrl)) continue
    const sameFolder = dirnameOf(resolvedUrl) === pageDir
    if (options.sameFolderOnly && !sameFolder) continue
    seen.add(resolvedUrl)
    out.push({
      id: resolvedUrl,
      href: anchor.href,
      resolvedUrl,
      label: anchor.label || basenameOf(resolvedUrl),
      sameFolder,
      filename: basenameOf(resolvedUrl),
    })
  }
  return dedupeAndSortLinks(out)
}

export function dedupeAndSortLinks(candidates: HtmlLinkCandidate[]): HtmlLinkCandidate[] {
  const map = new Map<string, HtmlLinkCandidate>()
  for (const item of candidates) map.set(item.resolvedUrl, item)
  return [...map.values()].sort((a, b) => a.filename.localeCompare(b.filename))
}

const HTML_ASSET_ATTR_PATTERN =
  /<(link|script|img|source|video|audio|iframe|embed|input)\b[^>]*?\s(href|src|poster)\s*=\s*(["'])(.*?)\3/gi
const HTML_REF_ATTR_PATTERN = /(\s(?:href|src|poster)\s*=\s*)(["'])(.*?)\2/gi
const CSS_URL_PATTERN = /url\(\s*(['"]?)([^'")]+?)\1\s*\)/gi
const CSS_IMPORT_PATTERN = /@import\s+(['"])([^'"]+)\1/gi

function isFetchableRef(raw: string): boolean {
  const value = raw.trim()
  if (!value || value.startsWith('#')) return false
  return !/^(data|blob|javascript|mailto|tel|about):/i.test(value)
}

function stripHash(url: string): string {
  const index = url.indexOf('#')
  return index === -1 ? url : url.slice(0, index)
}

function hashOf(raw: string): string {
  const index = raw.indexOf('#')
  return index === -1 ? '' : raw.slice(index)
}

function stripQueryAndHash(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.origin === 'null' ? `${parsed.protocol}//` : parsed.origin}${parsed.pathname}`
  } catch {
    return stripHash(url).split('?')[0]
  }
}

function isCssUrl(url: string): boolean {
  return /\.css$/i.test(pathnameOf(url))
}

export function collectSameOriginAssets(
  html: string,
  pageUrl: string,
  maxAssets = 500,
): AssetRef[] {
  const refs: AssetRef[] = []
  const seen = new Set<string>()

  const push = (raw: string, attribute: string) => {
    if (!isFetchableRef(raw)) return
    const resolved = resolveUrl(raw.trim(), pageUrl)
    if (!resolved || !sameOrigin(resolved, pageUrl)) return
    const key = stripQueryAndHash(resolved)
    if (seen.has(key) || hasHtmlExtension(pathnameOf(key))) return
    seen.add(key)
    refs.push({ url: key, attribute })
  }

  for (const match of html.matchAll(HTML_ASSET_ATTR_PATTERN)) {
    if (refs.length >= maxAssets) return refs
    push(match[4], match[2].toLowerCase())
  }
  for (const match of html.matchAll(CSS_URL_PATTERN)) {
    if (refs.length >= maxAssets) return refs
    push(match[2], 'style')
  }
  return refs
}

export function collectCssAssets(css: string, cssUrl: string): string[] {
  const out = new Set<string>()
  const push = (raw: string) => {
    if (!isFetchableRef(raw)) return
    const resolved = resolveUrl(raw.trim(), cssUrl)
    if (!resolved || !sameOrigin(resolved, cssUrl)) return
    out.add(stripQueryAndHash(resolved))
  }
  for (const match of css.matchAll(CSS_URL_PATTERN)) push(match[2])
  for (const match of css.matchAll(CSS_IMPORT_PATTERN)) push(match[2])
  return [...out]
}

export function safeZipPath(input: string): string {
  const normalized = input.replace(/\\/g, '/').replace(/^\/+/, '')
  const parts = normalized.split('/').filter((part) => part && part !== '.')
  if (parts.some((part) => part === '..')) {
    throw new Error('Invalid path in archive.')
  }
  return parts.join('/')
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/** Mirrors the original layout under the root page's folder; anything outside goes to `_external/`. */
export function zipPathForUrl(url: string, rootPageUrl: string): string {
  const pathname = pathnameOf(url)
  const rootDir = dirnameOf(rootPageUrl)
  const relative =
    sameOrigin(url, rootPageUrl) && pathname.startsWith(rootDir)
      ? pathname.slice(rootDir.length)
      : `_external/${pathname}`
  const decoded = relative.split('/').map(safeDecode).join('/')
  return safeZipPath(decoded || 'index.html')
}

export function relativeZipPath(fromFile: string, toFile: string): string {
  const fromDir = fromFile.split('/').slice(0, -1)
  const target = toFile.split('/')
  let common = 0
  while (common < fromDir.length && common < target.length - 1 && fromDir[common] === target[common]) {
    common += 1
  }
  const ups = fromDir.length - common
  const rest = target.slice(common).map(encodeURIComponent)
  return [...Array.from({ length: ups }, () => '..'), ...rest].join('/')
}

function mapRef(
  raw: string,
  baseUrl: string,
  fromZipPath: string,
  urlToZipPath: Map<string, string>,
): string | null {
  if (!isFetchableRef(raw)) return null
  const resolved = resolveUrl(raw.trim(), baseUrl)
  if (!resolved) return null
  const target = urlToZipPath.get(stripQueryAndHash(resolved))
  if (!target) return null
  return `${relativeZipPath(fromZipPath, target)}${hashOf(raw.trim())}`
}

function rewriteCssRefs(
  css: string,
  baseUrl: string,
  fromZipPath: string,
  urlToZipPath: Map<string, string>,
): string {
  return css
    .replace(CSS_URL_PATTERN, (whole, _quote: string, raw: string) => {
      const mapped = mapRef(raw, baseUrl, fromZipPath, urlToZipPath)
      return mapped ? `url("${mapped}")` : whole
    })
    .replace(CSS_IMPORT_PATTERN, (whole, quote: string, raw: string) => {
      const mapped = mapRef(raw, baseUrl, fromZipPath, urlToZipPath)
      return mapped ? `@import ${quote}${mapped}${quote}` : whole
    })
}

export function rewriteHtmlRefs(
  html: string,
  pageUrl: string,
  fromZipPath: string,
  urlToZipPath: Map<string, string>,
): string {
  const withAttrs = html.replace(
    HTML_REF_ATTR_PATTERN,
    (whole, prefix: string, quote: string, raw: string) => {
      const mapped = mapRef(raw, pageUrl, fromZipPath, urlToZipPath)
      return mapped ? `${prefix}${quote}${mapped}${quote}` : whole
    },
  )
  return rewriteCssRefs(withAttrs, pageUrl, fromZipPath, urlToZipPath)
}

export interface HtmlBundleSource {
  loadBytes: (url: string) => Promise<Uint8Array | null>
  /** Used when a page cannot be loaded (e.g. the live DOM of the current tab). */
  fallbackHtml?: Map<string, string>
}

export interface HtmlBundleOptions {
  rootPageUrl: string
  pageUrls: string[]
  includeAssets: boolean
  maxBytes?: number
  maxAssets?: number
}

export interface HtmlBundleOutput {
  zipBytes: Uint8Array
  stats: { pages: number; assets: number; bytes: number; missing: number }
}

export async function buildHtmlArchive(
  options: HtmlBundleOptions,
  source: HtmlBundleSource,
): Promise<HtmlBundleOutput> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  const maxAssets = options.maxAssets ?? 500
  const urlToZipPath = new Map<string, string>()
  const pages = new Map<string, string>()
  let missing = 0

  for (const raw of options.pageUrls) {
    const url = stripQueryAndHash(raw)
    if (pages.has(url)) continue
    const bytes = await source.loadBytes(url)
    const html = bytes ? decodeText(bytes) : source.fallbackHtml?.get(url)
    if (html == null) {
      missing += 1
      continue
    }
    pages.set(url, html)
    urlToZipPath.set(url, zipPathForUrl(url, options.rootPageUrl))
  }

  const assets = new Map<string, Uint8Array>()
  if (options.includeAssets) {
    const queue: string[] = []
    const queued = new Set<string>()
    const enqueue = (url: string) => {
      if (queued.has(url) || urlToZipPath.has(url) || queued.size >= maxAssets) return
      queued.add(url)
      queue.push(url)
    }
    for (const [pageUrl, html] of pages) {
      for (const asset of collectSameOriginAssets(html, pageUrl, maxAssets)) enqueue(asset.url)
    }
    while (queue.length > 0) {
      const url = queue.shift()!
      const bytes = await source.loadBytes(url)
      if (!bytes) {
        missing += 1
        continue
      }
      assets.set(url, bytes)
      urlToZipPath.set(url, zipPathForUrl(url, options.rootPageUrl))
      if (isCssUrl(url)) {
        for (const nested of collectCssAssets(decodeText(bytes), url)) enqueue(nested)
      }
    }
  }

  const files = new Map<string, Uint8Array>()
  let totalBytes = 0
  const addFile = (path: string, bytes: Uint8Array) => {
    if (files.has(path)) return
    totalBytes += bytes.byteLength
    if (totalBytes > maxBytes) {
      throw new Error(`Archive exceeds ${Math.round(maxBytes / 1024 / 1024)} MiB limit.`)
    }
    files.set(path, bytes)
  }

  for (const [url, bytes] of assets) {
    const zipPath = urlToZipPath.get(url)!
    addFile(
      zipPath,
      isCssUrl(url) ? textEncoder(rewriteCssRefs(decodeText(bytes), url, zipPath, urlToZipPath)) : bytes,
    )
  }
  for (const [url, html] of pages) {
    const zipPath = urlToZipPath.get(url)!
    addFile(zipPath, textEncoder(rewriteHtmlRefs(html, url, zipPath, urlToZipPath)))
  }

  return {
    zipBytes: buildZip(files),
    stats: { pages: pages.size, assets: assets.size, bytes: totalBytes, missing },
  }
}

/** Builds a download name from the page title, like Chrome's "Save as" (`<title>.zip`). */
export function zipFileName(title: string, pageUrl: string, suffix = ''): string {
  const fromTitle = title
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 150)
    .trim()
  const base = fromTitle || basenameOf(pageUrl).replace(/\.html?$/i, '') || 'page'
  return `${base}${suffix}.zip`
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export function buildZip(files: Map<string, Uint8Array>): Uint8Array {
  const record: Record<string, Uint8Array> = {}
  for (const [path, bytes] of files) {
    record[safeZipPath(path)] = bytes
  }
  return zipSync(record)
}

export function textEncoder(input: string): Uint8Array {
  return new TextEncoder().encode(input)
}

export function decodeText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

export { basenameOf, dirnameOf, resolveUrl, sameOrigin }
