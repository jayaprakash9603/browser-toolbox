const MULTI_PART_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.in',
  'com.br',
  'com.mx',
  'co.jp',
  'co.kr',
  'com.tr',
  'com.sg',
  'com.hk',
])

export function registrableDomain(host: string): string {
  const h = host.replace(/^www\./, '').toLowerCase()
  const parts = h.split('.')
  if (parts.length < 2) return h
  for (const suffix of MULTI_PART_SUFFIXES) {
    const suffixParts = suffix.split('.')
    if (parts.length > suffixParts.length) {
      const tail = parts.slice(-suffixParts.length).join('.')
      if (tail === suffix) {
        return parts.slice(-(suffixParts.length + 1)).join('.')
      }
    }
  }
  return parts.slice(-2).join('.')
}

/** True when both values are the same site (registrable domain or host). */
export function sameRegistrableSite(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const left = a.includes('.') && !a.includes('/') ? registrableDomain(a) : a
  const right = b.includes('.') && !b.includes('/') ? registrableDomain(b) : b
  return left === right
}

/** Hostname of http(s) URL belongs to the same registrable site as `site` (e.g. site `example.com`). */
export function hostOnSite(host: string | null | undefined, site: string | null | undefined): boolean {
  if (!host || !site) return false
  return registrableDomain(host.replace(/^www\./, '').toLowerCase()) === site
}

/** Registrable domain of an http(s) URL, so `app.example.com` and `example.com` are one site. */
export function siteOfUrl(url: string | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return registrableDomain(parsed.hostname)
  } catch {
    return null
  }
}
