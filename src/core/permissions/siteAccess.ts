import { extensionApi } from '@/platform/browser'

export const ALL_SITES_ORIGINS = ['<all_urls>']

function hasPermissionsApi(): boolean {
  return Boolean(extensionApi()?.permissions?.contains)
}

export async function hasAllSitesAccess(): Promise<boolean> {
  if (!hasPermissionsApi()) return false
  try {
    return await extensionApi()!.permissions.contains({ origins: ALL_SITES_ORIGINS })
  } catch {
    return false
  }
}

/**
 * Chrome only shows the prompt during a user gesture in an extension page; from the service
 * worker or without a gesture this resolves to the current grant instead of throwing.
 */
export async function requestPermissions(request: chrome.permissions.Permissions): Promise<boolean> {
  if (!hasPermissionsApi()) return false
  try {
    const api = extensionApi()!
    if (await api.permissions.contains(request)) return true
    return await api.permissions.request(request)
  } catch {
    return false
  }
}

export function requestAllSitesAccess(): Promise<boolean> {
  return requestPermissions({ origins: ALL_SITES_ORIGINS })
}

export async function revokeAllSitesAccess(): Promise<boolean> {
  if (!hasPermissionsApi()) return false
  try {
    return await extensionApi()!.permissions.remove({ origins: ALL_SITES_ORIGINS })
  } catch {
    return false
  }
}

/** Origin pattern Chrome accepts for a single page's host, or null for pages it cannot grant. */
export function originPatternForUrl(url: string | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return `${parsed.protocol}//${parsed.hostname}/*`
  } catch {
    return null
  }
}

export function requestSiteAccess(url: string | undefined): Promise<boolean> {
  const pattern = originPatternForUrl(url)
  if (!pattern) return Promise.resolve(false)
  return requestPermissions({ origins: [pattern] })
}

export function onSiteAccessChanged(listener: () => void): () => void {
  const api = extensionApi()
  if (!api?.permissions?.onAdded) return () => undefined
  const handler = () => listener()
  api.permissions.onAdded.addListener(handler)
  api.permissions.onRemoved.addListener(handler)
  return () => {
    api.permissions.onAdded.removeListener(handler)
    api.permissions.onRemoved.removeListener(handler)
  }
}
