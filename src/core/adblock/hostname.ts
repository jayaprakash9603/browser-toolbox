const HOSTNAME_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i

export function normalizeHostname(input: string): string | null {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null
  let host = trimmed
  try {
    if (trimmed.includes('://')) host = new URL(trimmed).hostname
  } catch {
    host = trimmed.replace(/^\/\//, '').split('/')[0].split(':')[0]
  }
  host = host.replace(/^www\./, '')
  if (!HOSTNAME_RE.test(host)) return null
  return host
}

export function hostnameFromUrl(url?: string): string | null {
  if (!url) return null
  try {
    return normalizeHostname(new URL(url).hostname)
  } catch {
    return null
  }
}

export function isAllowlisted(allowlist: string[], urlOrHost: string): boolean {
  const host = normalizeHostname(urlOrHost)
  if (!host) return false
  return allowlist.some((entry) => {
    const normalized = normalizeHostname(entry)
    if (!normalized) return false
    return host === normalized || host.endsWith(`.${normalized}`)
  })
}
