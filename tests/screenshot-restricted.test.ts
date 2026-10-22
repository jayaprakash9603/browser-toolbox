import { describe, expect, it } from 'vitest'

import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'

describe('isRestrictedCaptureUrl', () => {
  it('blocks both Chrome Web Store hosts', () => {
    expect(isRestrictedCaptureUrl('https://chromewebstore.google.com/detail/abc')).toBe(true)
    expect(isRestrictedCaptureUrl('https://chrome.google.com/webstore/detail/abc')).toBe(true)
  })

  it('blocks browser-internal pages', () => {
    expect(isRestrictedCaptureUrl('chrome://settings')).toBe(true)
    expect(isRestrictedCaptureUrl('devtools://devtools/bundled/inspector.html')).toBe(true)
    expect(isRestrictedCaptureUrl('view-source:https://example.com')).toBe(true)
  })

  it('allows ordinary sites, including ones that only mention the store', () => {
    expect(isRestrictedCaptureUrl('https://example.com/')).toBe(false)
    expect(isRestrictedCaptureUrl('https://example.com/?ref=chromewebstore.google.com')).toBe(false)
  })
})
