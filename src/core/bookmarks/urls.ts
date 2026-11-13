const TRACKING_PARAM =
  /^(utm_|fbclid|gclid|gclsrc|dclid|msclkid|mc_|igshid|_hsenc|_hsmi|ref_src|ref$|yclid|twclid)/i

export function stripTrackingParams(url: string): string {
  try {
    const parsed = new URL(url)
    const keys = [...parsed.searchParams.keys()]
    for (const key of keys) {
      if (TRACKING_PARAM.test(key)) parsed.searchParams.delete(key)
    }
    return parsed.toString()
  } catch {
    return url
  }
}

export function stripSensitiveParams(url: string): string {
  try {
    const parsed = new URL(url)
    for (const key of [...parsed.searchParams.keys()]) {
      if (/token|secret|password|auth|key|session|sid/i.test(key)) parsed.searchParams.delete(key)
    }
    parsed.hash = ''
    parsed.username = ''
    parsed.password = ''
    return parsed.toString()
  } catch {
    return url
  }
}

export function canonicalizeBookmarkUrl(url: string): string {
  const stripped = stripTrackingParams(url.trim())
  return stripped
    .replace(/#.*$/, '')
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/\/+$/, '')
    .replace(/\?$/, '')
    .toLowerCase()
}

export function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim())
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function domainHashHue(domain: string): number {
  let hash = 0
  for (let i = 0; i < domain.length; i += 1) hash = (hash * 31 + domain.charCodeAt(i)) >>> 0
  return hash % 360
}
