import { describe, expect, it } from 'vitest'

import {
  allowSite,
  OPENED_TAB_GESTURE_MS,
  openedTabRecord,
  shouldBlockOpenedTabNavigation,
  type OpenedTabRecord,
} from '@/core/protection'

const record: OpenedTabRecord = { openerSite: 'example.com', allowedSites: ['example.com'] }
const now = 1_000_000

function decide(url: string, extra: Partial<Parameters<typeof shouldBlockOpenedTabNavigation>[0]> = {}) {
  return shouldBlockOpenedTabNavigation({
    record,
    url,
    transitionType: 'link',
    lastGestureAt: 0,
    now,
    isTrusted: () => false,
    ...extra,
  })
}

describe('opened-tab redirect guard', () => {
  it('guards tabs a site opens for itself, including other subdomains and about:blank', () => {
    expect(openedTabRecord('https://www.example.com/a', 'https://app.example.com/b')).toEqual(record)
    expect(openedTabRecord('https://example.com/', 'about:blank')).toEqual(record)
  })

  it('does not guard tabs that open another site directly or come from non-web pages', () => {
    expect(openedTabRecord('https://example.com/', 'https://other.org/')).toBeNull()
    expect(openedTabRecord('chrome://newtab/', 'https://example.com/')).toBeNull()
  })

  it('lets the tab move around the opener site', () => {
    expect(decide('https://docs.example.com/page')).toBe(false)
  })

  it('blocks a switch to another site without a click in the tab', () => {
    expect(decide('https://ads.example.net/landing')).toBe(true)
    expect(decide('https://ads.example.net/landing', { transitionQualifiers: ['client_redirect'] })).toBe(true)
  })

  it('allows the switch after a recent click, typed URL, back/forward or a trusted target', () => {
    expect(decide('https://other.org/', { lastGestureAt: now - OPENED_TAB_GESTURE_MS + 100 })).toBe(false)
    expect(decide('https://other.org/', { transitionType: 'typed' })).toBe(false)
    expect(decide('https://other.org/', { transitionQualifiers: ['forward_back'] })).toBe(false)
    expect(decide('https://other.org/', { isTrusted: () => true })).toBe(false)
  })

  it('still blocks when the click is old', () => {
    expect(decide('https://other.org/', { lastGestureAt: now - OPENED_TAB_GESTURE_MS - 1 })).toBe(true)
  })

  it('remembers sites the user chose to visit', () => {
    const next = allowSite(record, 'https://shop.other.org/x')
    expect(next.allowedSites).toEqual(['example.com', 'other.org'])
    expect(shouldBlockOpenedTabNavigation({ ...{ record: next }, url: 'https://other.org/', lastGestureAt: 0, now, isTrusted: () => false })).toBe(false)
  })
})
