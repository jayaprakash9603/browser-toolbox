const BLOCKED_PROTOCOLS = new Set(['javascript:', 'vbscript:', 'data:', 'blob:', 'chrome:', 'chrome-extension:', 'file:', 'ftp:'])

export function isDownloadableUrl(url: string, allowBlobData = false): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return false
  }
  const proto = parsed.protocol.toLowerCase()
  if (allowBlobData && (proto === 'blob:' || proto === 'data:')) return true
  if (proto !== 'http:' && proto !== 'https:') return false
  for (const blocked of BLOCKED_PROTOCOLS) {
    if (proto === blocked) return false
  }
  return true
}

export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

export function basenameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname
    return decodeURIComponent(path.split('/').pop() || 'download')
  } catch {
    return 'download'
  }
}

export function normalizeResourceUrl(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ''
    const strip = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'])
    for (const key of [...u.searchParams.keys()]) {
      if (strip.has(key.toLowerCase())) u.searchParams.delete(key)
    }
    return u.href
  } catch {
    return url.trim()
  }
}

export function extractUrlsFromText(text: string): string[] {
  const found: string[] = []
  const re = /\bhttps?:\/\/[^\s<>"')\]]+/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const raw = match[0].replace(/[.,;]+$/, '')
    if (isDownloadableUrl(raw)) found.push(raw)
  }
  return found
}
