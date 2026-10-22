import { siteOfUrl } from './domain'

/** A click or key press in the opened tab this recently makes its next navigation the user's own. */
export const OPENED_TAB_GESTURE_MS = 5_000

/** Navigations the user started from Chrome itself (address bar, bookmarks, reload). */
const BROWSER_TRANSITIONS = new Set([
  'typed',
  'auto_bookmark',
  'generated',
  'keyword',
  'keyword_generated',
  'reload',
  'start_page',
])

/**
 * A tab a page opened for its own site. It may move around that site freely; moving to another
 * site needs the user's own click in the tab.
 */
export interface OpenedTabRecord {
  openerSite: string
  allowedSites: string[]
}

export function openedTabRecord(openerUrl: string | undefined, targetUrl: string): OpenedTabRecord | null {
  const openerSite = siteOfUrl(openerUrl)
  if (!openerSite) return null
  const targetSite = siteOfUrl(targetUrl)
  // about:blank and same-site targets are the trick: the page later points the tab elsewhere.
  if (targetSite !== null && targetSite !== openerSite) return null
  return { openerSite, allowedSites: [openerSite] }
}

export interface OpenedTabNavigation {
  record: OpenedTabRecord
  url: string
  transitionType?: string
  transitionQualifiers?: string[]
  lastGestureAt: number
  now: number
  isTrusted: (url: string) => boolean
}

export function shouldBlockOpenedTabNavigation(nav: OpenedTabNavigation): boolean {
  const site = siteOfUrl(nav.url)
  if (!site || nav.record.allowedSites.includes(site)) return false
  if (nav.transitionType && BROWSER_TRANSITIONS.has(nav.transitionType)) return false
  if (nav.transitionQualifiers?.some((q) => q === 'forward_back' || q === 'from_address_bar')) return false
  if (nav.now - nav.lastGestureAt <= OPENED_TAB_GESTURE_MS) return false
  return !nav.isTrusted(nav.url)
}

export function allowSite(record: OpenedTabRecord, url: string): OpenedTabRecord {
  const site = siteOfUrl(url)
  if (!site || record.allowedSites.includes(site)) return record
  return { ...record, allowedSites: [...record.allowedSites, site] }
}
