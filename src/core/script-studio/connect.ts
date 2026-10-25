export function hostnameFromConnectUrl(url: string): string | null {
  try {
    if (url === 'self') return 'self'
    const u = new URL(url)
    return u.hostname.toLowerCase()
  } catch {
    return null
  }
}

export function isConnectAllowed(
  requestUrl: string,
  scriptConnects: string[],
  userConnects: string[] | undefined,
  globalMode: 'prompt' | 'allowlist' | 'deny',
  sessionAllowed: Set<string>,
): boolean {
  if (globalMode === 'deny') return false
  let host: string
  try {
    host = new URL(requestUrl).hostname.toLowerCase()
  } catch {
    return false
  }

  const allows = [...scriptConnects, ...(userConnects ?? [])].map((c) => c.toLowerCase())
  if (allows.includes('*')) return true
  if (allows.some((c) => c === host || c === 'localhost' && (host === 'localhost' || host === '127.0.0.1'))) {
    return true
  }
  if (allows.some((c) => host.endsWith(`.${c}`) || c === host)) return true
  if (globalMode === 'allowlist' && sessionAllowed.has(host)) return true
  return false
}
