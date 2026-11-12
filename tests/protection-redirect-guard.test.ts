import { describe, expect, it } from 'vitest'

import { mergeProtectionState } from '@/core/protection/constants'
import { hostOfHttpUrl, isExtensionOrAboutUrl } from '@/core/protection/redirect/privacy'

describe('smart redirect guard helpers', () => {
  it('hydrates nested redirect settings when upgrading storage', () => {
    const merged = mergeProtectionState({ enabled: true, trusted: ['a.com'] })
    expect(merged.redirectProtection.enabled).toBe(true)
    expect(merged.redirectProtection.unknownBehavior).toBe('warn')
    expect(merged.workflowHosts).toEqual([])
    expect(merged.trusted).toEqual(['a.com'])
  })

  it('ignores extension interstitial URLs in loop prevention', () => {
    expect(isExtensionOrAboutUrl('chrome-extension://abc/blocked.html')).toBe(true)
    expect(isExtensionOrAboutUrl('https://shop.example.com/pay')).toBe(false)
  })

  it('strips hosts for logging', () => {
    expect(hostOfHttpUrl('https://checkout.razorpay.com/v1/pay?session=secret')).toBe('checkout.razorpay.com')
  })
})
