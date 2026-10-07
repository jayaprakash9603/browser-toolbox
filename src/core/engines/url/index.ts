export interface UrlQueryParam {
  key: string
  value: string
}

export type UrlResult<T> = { ok: true; value: T } | { ok: false; error: string }

export function parseUrl(input: string): UrlResult<URL> {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, error: 'Input is empty.' }
  const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return { ok: true, value: new URL(withProtocol) }
  } catch {
    return { ok: false, error: 'Invalid URL.' }
  }
}

export function getQueryParams(url: URL): UrlQueryParam[] {
  const params: UrlQueryParam[] = []
  url.searchParams.forEach((value, key) => params.push({ key, value }))
  return params
}

export function setQueryParam(url: URL, key: string, value: string): URL {
  const next = new URL(url.toString())
  next.searchParams.set(key, value)
  return next
}

export function deleteQueryParam(url: URL, key: string): URL {
  const next = new URL(url.toString())
  next.searchParams.delete(key)
  return next
}

export function encodeUrlComponent(input: string): string {
  return encodeURIComponent(input)
}

export function decodeUrlComponent(input: string): UrlResult<string> {
  try {
    return { ok: true, value: decodeURIComponent(input) }
  } catch {
    return { ok: false, error: 'Malformed percent-encoding.' }
  }
}

const TRACKING_PREFIXES = ['utm_']
const TRACKING_PARAMS = ['fbclid', 'gclid', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'mc_cid', 'mc_eid', 'igshid', 'spm', 'ref_src']

export function cleanUrl(url: URL): { url: URL; removed: string[] } {
  const next = new URL(url.toString())
  const removed: string[] = []
  for (const key of [...next.searchParams.keys()]) {
    const lower = key.toLowerCase()
    if (TRACKING_PREFIXES.some((prefix) => lower.startsWith(prefix)) || TRACKING_PARAMS.includes(lower)) {
      next.searchParams.delete(key)
      removed.push(key)
    }
  }
  return { url: next, removed }
}

export function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim()
  if (/\s/.test(trimmed)) return false
  return /^https?:\/\/\S+\.\S+/i.test(trimmed) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(trimmed)
}
