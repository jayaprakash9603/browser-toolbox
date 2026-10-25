export function normalizeHostPattern(entry: string): string {
  return entry.trim().toLowerCase().replace(/^\*\./, '')
}

export function isHostBlocked(url: string, blocklist: string[]): boolean {
  if (!blocklist.length) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    for (const raw of blocklist) {
      const pattern = normalizeHostPattern(raw)
      if (!pattern) continue
      if (pattern.startsWith('*')) {
        const suffix = pattern.slice(1)
        if (host.endsWith(suffix) || host === suffix.slice(1)) return true
      } else if (host === pattern || host.endsWith(`.${pattern}`)) {
        return true
      }
    }
  } catch {
    return false
  }
  return false
}

export function isScriptUrlBlocked(url: string, blocklist: string[]): boolean {
  return isHostBlocked(url, blocklist)
}

/** Pages where the browser refuses every extension's scripts, so user scripts can never run there. */
export function isBrowserRestrictedUrl(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url)
    const host = hostname.toLowerCase()
    return (
      host === 'chromewebstore.google.com' ||
      (host === 'chrome.google.com' && pathname.startsWith('/webstore')) ||
      (host === 'microsoftedge.microsoft.com' && pathname.startsWith('/addons'))
    )
  } catch {
    return false
  }
}
