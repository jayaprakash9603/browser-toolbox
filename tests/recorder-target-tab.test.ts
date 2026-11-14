import { describe, expect, it } from 'vitest'

import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'

describe('recorder target tab eligibility', () => {
  it('allows normal web pages', () => {
    expect(isRestrictedCaptureUrl('https://example.com/docs')).toBe(false)
  })

  it('rejects the extension panel and chrome system pages', () => {
    expect(isRestrictedCaptureUrl('chrome-extension://abc/index.html')).toBe(true)
    expect(isRestrictedCaptureUrl('chrome://settings')).toBe(true)
  })
})