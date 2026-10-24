const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'gclsrc',
  'dclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'yclid',
  'twclid',
  'ttclid',
  'li_fat_id',
  'igshid',
  'mc_cid',
  'mc_eid',
  '_ga',
  '_gl',
  '_hsenc',
  '_hsmi',
  'mkt_tok',
  'oly_anon_id',
  'oly_enc_id',
  'vero_id',
  'ref_src',
  'spm',
])

const isTracking = (key: string) => {
  const k = key.toLowerCase()
  return k.startsWith('utm_') || TRACKING_PARAMS.has(k)
}

/** Strips common click-tracking parameters. Returns the input unchanged if it is not a URL. */
export function cleanUrl(url: string): { url: string; removed: number } {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { url, removed: 0 }
  }
  const keys = [...new Set(parsed.searchParams.keys())].filter(isTracking)
  if (!keys.length) return { url, removed: 0 }
  for (const key of keys) parsed.searchParams.delete(key)
  return { url: parsed.toString(), removed: keys.length }
}

export function markdownLink(title: string, url: string): string {
  const text = (title || url).replace(/([[\]\\])/g, '\\$1')
  return `[${text}](${url.replace(/\(/g, '%28').replace(/\)/g, '%29')})`
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function htmlLink(title: string, url: string): string {
  return `<a href="${escapeHtml(url)}">${escapeHtml(title || url)}</a>`
}

export interface PageInfo {
  host: string
  origin: string
  protocol: string
  secure: boolean
  /** Regular web or file page that scripts can run on. */
  scriptable: boolean
}

export function pageInfo(url: string): PageInfo {
  try {
    const u = new URL(url)
    const web = u.protocol === 'http:' || u.protocol === 'https:'
    const restricted = /^(chromewebstore\.google\.com|chrome\.google\.com)$/.test(u.hostname)
    return {
      host: u.host || u.protocol.replace(':', ''),
      origin: u.origin === 'null' ? `${u.protocol}//` : u.origin,
      protocol: u.protocol.replace(':', ''),
      secure: u.protocol === 'https:',
      scriptable: (web && !restricted) || u.protocol === 'file:',
    }
  } catch {
    return { host: '', origin: '', protocol: '', secure: false, scriptable: false }
  }
}

/** Path, query and hash, without the origin. */
export function urlPath(url: string): string {
  try {
    const u = new URL(url)
    return `${u.pathname === '/' ? '' : u.pathname}${u.search}${u.hash}`
  } catch {
    return url
  }
}

export const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5]

export function nextZoom(current: number, direction: 1 | -1): number {
  if (direction > 0) return ZOOM_STEPS.find((z) => z > current + 0.001) ?? ZOOM_STEPS.at(-1)!
  return [...ZOOM_STEPS].reverse().find((z) => z < current - 0.001) ?? ZOOM_STEPS[0]
}

export function screenshotFilename(host: string, date = new Date()): string {
  const stamp = date.toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const safeHost = host.replace(/[^a-z0-9.-]+/gi, '_') || 'page'
  return `${safeHost}-${stamp}.png`
}
