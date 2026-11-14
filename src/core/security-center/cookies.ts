import { AUTH_COOKIE_NAME_RE } from './constants'
import { registrableDomain } from '@/core/protection/domain'
import type { CookieMetadata } from './types'

const YEAR_SECONDS = 365 * 24 * 60 * 60

export function isAuthCookieName(name: string): boolean {
  return AUTH_COOKIE_NAME_RE.test(name)
}

export interface CookieLike {
  name: string
  domain: string
  path: string
  expirationDate?: number
  session: boolean
  secure: boolean
  httpOnly: boolean
  sameSite?: string
  storeId: string
  hostOnly: boolean
  partitionKey?: { topLevelSite?: string }
}

export function cookieObservations(cookie: {
  name: string
  secure: boolean
  httpOnly: boolean
  session: boolean
  expirationDate?: number
  sameSite?: string
}): string[] {
  const notes: string[] = []
  if (!cookie.secure) notes.push('Missing Secure')
  if (!cookie.httpOnly && isAuthCookieName(cookie.name)) notes.push('Auth-like name without HttpOnly')
  if (!cookie.sameSite || cookie.sameSite === 'unspecified' || cookie.sameSite === 'no_restriction') {
    notes.push('SameSite is None or unspecified')
  }
  if (!cookie.session && cookie.expirationDate) {
    const lifetime = cookie.expirationDate - Date.now() / 1000
    if (lifetime > YEAR_SECONDS) notes.push('Expires in more than one year')
  }
  return notes
}

function asSameSite(value: string | undefined): CookieMetadata['sameSite'] {
  if (value === 'lax' || value === 'strict' || value === 'no_restriction' || value === 'unspecified') return value
  return value || 'unspecified'
}

export function toCookieMetadata(
  cookie: CookieLike,
  pageHost?: string,
): CookieMetadata {
  const cookieHost = cookie.domain.replace(/^\./, '').replace(/^www\./, '').toLowerCase()
  let firstParty: boolean | null = null
  if (pageHost) {
    firstParty = registrableDomain(cookieHost) === registrableDomain(pageHost)
  }
  return {
    name: cookie.name,
    domain: cookie.domain,
    path: cookie.path,
    expirationDate: cookie.expirationDate,
    session: cookie.session,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: asSameSite(cookie.sameSite),
    storeId: cookie.storeId,
    hostOnly: cookie.hostOnly,
    partitionKey: cookie.partitionKey,
    firstParty,
    observations: cookieObservations(cookie),
  }
}

export function exportCookieMetadata(cookies: CookieMetadata[]): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: Date.now(),
      note: 'Values are omitted. This is metadata only.',
      cookies: cookies.map(({ observations, ...rest }) => rest),
    },
    null,
    2,
  )
}

export function matchesCookieFilters(
  cookie: CookieMetadata,
  filters: { query?: string; thirdParty?: boolean; session?: boolean },
): boolean {
  if (filters.thirdParty && cookie.firstParty !== false) return false
  if (filters.session === true && !cookie.session) return false
  if (filters.session === false && cookie.session) return false
  const query = filters.query?.trim().toLowerCase()
  if (!query) return true
  return [cookie.name, cookie.domain, cookie.path].some((value) => value.toLowerCase().includes(query))
}
