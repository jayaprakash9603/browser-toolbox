import { requestPermissions } from '@/core/permissions/siteAccess'

import { toCookieMetadata } from './cookies'
import type { CookieMetadata } from './types'

export async function cookiesPermissionGranted(): Promise<boolean> {
  try {
    return await chrome.permissions.contains({ permissions: ['cookies'] })
  } catch {
    return false
  }
}

export async function requestCookiesPermission(): Promise<boolean> {
  return requestPermissions({ permissions: ['cookies'] })
}

export async function listCookiesForUrl(url: string, pageHost?: string): Promise<CookieMetadata[]> {
  if (!(await cookiesPermissionGranted())) {
    throw new Error('The cookies permission is not granted.')
  }
  const cookies = await chrome.cookies.getAll({ url })
  return cookies.map((cookie) =>
    toCookieMetadata(
      {
        name: cookie.name,
        domain: cookie.domain,
        path: cookie.path,
        expirationDate: cookie.expirationDate,
        session: cookie.session,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: String(cookie.sameSite ?? 'unspecified'),
        storeId: cookie.storeId,
        hostOnly: cookie.hostOnly,
        partitionKey: cookie.partitionKey?.topLevelSite
          ? { topLevelSite: cookie.partitionKey.topLevelSite }
          : undefined,
      },
      pageHost,
    ),
  )
}

export async function removeCookie(cookie: Pick<CookieMetadata, 'name' | 'domain' | 'path' | 'storeId' | 'partitionKey'>): Promise<void> {
  const domain = cookie.domain.replace(/^\./, '')
  const url = `https://${domain}${cookie.path || '/'}`
  const details = {
    url,
    name: cookie.name,
    storeId: cookie.storeId,
    ...(cookie.partitionKey ? { partitionKey: cookie.partitionKey } : {}),
  }
  const removed = await chrome.cookies.remove(details)
  if (!removed) {
    const retry = await chrome.cookies.remove({
      ...details,
      url: `http://${domain}${cookie.path || '/'}`,
    })
    if (!retry) throw new Error(`Could not delete ${cookie.name}.`)
  }
}
