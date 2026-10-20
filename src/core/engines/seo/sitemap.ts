export function parseSitemapLocs(xml: string): string[] {
  const locs: string[] = []
  const re = /<loc>\s*([^<]+)\s*<\/loc>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(xml)) !== null) {
    locs.push(match[1].trim())
  }
  return locs
}

export function sitemapContainsUrl(xml: string | null, pageUrl: string): boolean | null {
  if (!xml) return null
  const normalized = normalizeUrl(pageUrl)
  const locs = parseSitemapLocs(xml)
  if (locs.length === 0) return null
  return locs.some((loc) => normalizeUrl(loc) === normalized)
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/\/$/, '') || '/'
    return `${u.origin}${path}${u.search}`
  } catch {
    return url.replace(/\/$/, '')
  }
}

export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex/i.test(xml)
}
