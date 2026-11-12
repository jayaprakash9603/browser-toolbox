const SENSITIVE_PARAMS = new Set([
  'token',
  'access_token',
  'id_token',
  'refresh_token',
  'code',
  'session',
  'sessionid',
  'password',
  'passwd',
  'api_key',
  'apikey',
  'secret',
  'auth',
  'credential',
  'otp',
  'pin',
])

export function stripUrlForLog(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`
  } catch {
    return url.split('?')[0]?.split('#')[0] ?? url
  }
}

export function hostOfHttpUrl(url: string | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

export function pathOfHttpUrl(url: string | undefined): string {
  if (!url) return '/'
  try {
    return new URL(url).pathname || '/'
  } catch {
    return '/'
  }
}

export function containsOpenRedirectTarget(url: string, destSite: string | null): boolean {
  if (!destSite) return false
  try {
    const parsed = new URL(url)
    for (const [key, value] of parsed.searchParams.entries()) {
      if (SENSITIVE_PARAMS.has(key.toLowerCase())) continue
      const decoded = decodeURIComponent(value)
      if (!/^https?:\/\//i.test(decoded)) continue
      try {
        const embedded = new URL(decoded)
        const site = embedded.hostname.replace(/^www\./, '').toLowerCase()
        const registrable = site.split('.').slice(-2).join('.')
        if (registrable !== destSite && site !== destSite) return true
      } catch {
        continue
      }
    }
    const path = parsed.pathname
    const httpMatch = path.match(/https?:%2F%2F[^/]+/i) ?? path.match(/https?:\/\/[^/]+/i)
    if (httpMatch) {
      try {
        const raw = decodeURIComponent(httpMatch[0].replace(/%2F/gi, '/'))
        const embedded = new URL(raw)
        const site = embedded.hostname.replace(/^www\./, '').toLowerCase()
        if (site !== destSite) return true
      } catch {
        return true
      }
    }
  } catch {
    return false
  }
  return false
}

export function isExtensionOrAboutUrl(url: string): boolean {
  try {
    const protocol = new URL(url).protocol
    return protocol === 'chrome-extension:' || protocol === 'about:' || protocol === 'chrome:'
  } catch {
    return url.startsWith('chrome-extension:') || url.startsWith('about:')
  }
}
