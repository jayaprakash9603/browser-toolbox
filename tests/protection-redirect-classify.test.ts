import { describe, expect, it } from 'vitest'

import { DEFAULT_REDIRECT_PROTECTION, REDIRECT_GESTURE_MS } from '@/core/protection/redirect/constants'
import { classifyRedirect } from '@/core/protection/redirect/classify'
import { mergeWorkflowPolicies } from '@/core/protection/redirect/providers'
import type { RedirectContext } from '@/core/protection/redirect/types'

const now = 1_000_000
const policies = mergeWorkflowPolicies([])

function ctx(partial: Partial<RedirectContext>): RedirectContext {
  return {
    destUrl: 'https://example.org/',
    sourceUrl: 'https://shop.example.com/cart',
    sourceHost: 'shop.example.com',
    destHost: 'example.org',
    sourceSite: 'example.com',
    destSite: 'example.org',
    initiatingSite: 'example.com',
    initiatingHost: 'shop.example.com',
    tabId: 1,
    transitionType: 'link',
    transitionQualifiers: ['client_redirect'],
    metaRefresh: false,
    lastGestureTabAt: 0,
    lastGestureOpenerAt: now - 1000,
    now,
    session: null,
    recentHopCount: 0,
    destThreatCategory: null,
    isTrustedDest: false,
    isTrustedSource: false,
    isOpenedTab: true,
    workflowHosts: policies,
    settings: { ...DEFAULT_REDIRECT_PROTECTION },
    ...partial,
  }
}

describe('classifyRedirect', () => {
  it('allows opened-tab subdomain when the source URL is not available yet', () => {
    const verdict = classifyRedirect(
      ctx({
        sourceUrl: undefined,
        sourceSite: null,
        sourceHost: null,
        destUrl: 'https://app.example.com/checkout',
        destHost: 'app.example.com',
        destSite: 'example.com',
        initiatingSite: 'example.com',
        initiatingHost: 'www.example.com',
        isOpenedTab: true,
        lastGestureTabAt: 0,
        lastGestureOpenerAt: 0,
        settings: { ...DEFAULT_REDIRECT_PROTECTION, unknownBehavior: 'block', detectAutomatic: true },
      }),
    )
    expect(verdict.action).toBe('allow')
    expect(verdict.reasons).toContain('same_site_as_opener')
  })

  it('allows same-site navigation', () => {
    const verdict = classifyRedirect(
      ctx({
        destUrl: 'https://app.example.com/checkout',
        destHost: 'app.example.com',
        destSite: 'example.com',
        isOpenedTab: false,
      }),
    )
    expect(verdict.action).toBe('allow')
    expect(verdict.classification).toBe('NORMAL_REDIRECT')
  })

  it('allows payment gateway with opener gesture and policy host', () => {
    const verdict = classifyRedirect(
      ctx({
        destUrl: 'https://checkout.razorpay.com/v1/pay',
        destHost: 'checkout.razorpay.com',
        destSite: 'razorpay.com',
        lastGestureOpenerAt: now - 500,
      }),
    )
    expect(verdict.action).toBe('allow')
    expect(verdict.startSession?.kind).toBe('payment')
  })

  it('allows OAuth to Google with gesture', () => {
    const verdict = classifyRedirect(
      ctx({
        destUrl: 'https://accounts.google.com/o/oauth2/auth',
        destHost: 'accounts.google.com',
        destSite: 'google.com',
        lastGestureTabAt: now - 200,
      }),
    )
    expect(verdict.action).toBe('allow')
    expect(verdict.startSession?.kind).toBe('auth')
  })

  it('blocks known malicious destinations', () => {
    const verdict = classifyRedirect(
      ctx({
        destUrl: 'https://evil.test/',
        destThreatCategory: 'phishing',
      }),
    )
    expect(verdict.classification).toBe('MALICIOUS_REDIRECT')
    expect(verdict.action).toBe('block')
  })

  it('blocks malicious even with active session', () => {
    const verdict = classifyRedirect(
      ctx({
        destUrl: 'https://evil.test/',
        destThreatCategory: 'malware',
        session: {
          tabId: 1,
          initiatingHost: 'shop.example.com',
          initiatingSite: 'example.com',
          kind: 'payment',
          createdAt: now - 1000,
          expiresAt: now + 60_000,
          redirectCount: 2,
          chainHosts: ['checkout.razorpay.com'],
        },
      }),
    )
    expect(verdict.action).toBe('block')
  })

  it('warns on unknown cross-domain when configured', () => {
    const verdict = classifyRedirect(
      ctx({
        destUrl: 'https://ads.other.net/landing',
        destHost: 'ads.other.net',
        destSite: 'other.net',
        transitionType: 'auto_toplevel',
        transitionQualifiers: [],
        lastGestureOpenerAt: 0,
        lastGestureTabAt: 0,
        settings: { ...DEFAULT_REDIRECT_PROTECTION, unknownBehavior: 'warn' },
      }),
    )
    expect(verdict.action).toBe('warn')
  })

  it('allows when the user clicked a normal link', () => {
    const verdict = classifyRedirect(
      ctx({
        destUrl: 'https://docs.other.net/guide',
        destHost: 'docs.other.net',
        destSite: 'other.net',
        transitionType: 'link',
        transitionQualifiers: [],
        lastGestureTabAt: 0,
        lastGestureOpenerAt: 0,
        isOpenedTab: false,
      }),
    )
    expect(verdict.action).toBe('allow')
    expect(verdict.reasons).toContain('user_initiated')
  })

  it('allows redirects from a trusted source site', () => {
    const verdict = classifyRedirect(
      ctx({
        destUrl: 'https://other.net/landing',
        destSite: 'other.net',
        isTrustedSource: true,
        transitionType: 'auto_toplevel',
        lastGestureTabAt: 0,
        lastGestureOpenerAt: 0,
      }),
    )
    expect(verdict.action).toBe('allow')
    expect(verdict.reasons).toContain('user_trusted_source')
  })

  it('allows trusted workflow session hop', () => {
    const verdict = classifyRedirect(
      ctx({
        destUrl: 'https://api.razorpay.com/v1/checkout',
        destHost: 'api.razorpay.com',
        destSite: 'razorpay.com',
        session: {
          tabId: 1,
          initiatingHost: 'shop.example.com',
          initiatingSite: 'example.com',
          kind: 'payment',
          createdAt: now - 2000,
          expiresAt: now + 60_000,
          redirectCount: 2,
          chainHosts: ['checkout.razorpay.com'],
        },
      }),
    )
    expect(verdict.classification).toBe('TRUSTED_REDIRECT')
    expect(verdict.action).toBe('allow')
  })

  it('completes session on callback to merchant', () => {
    const verdict = classifyRedirect(
      ctx({
        destUrl: 'https://shop.example.com/success',
        destHost: 'shop.example.com',
        destSite: 'example.com',
        session: {
          tabId: 1,
          initiatingHost: 'shop.example.com',
          initiatingSite: 'example.com',
          kind: 'payment',
          createdAt: now - 5000,
          expiresAt: now + 60_000,
          redirectCount: 4,
          chainHosts: ['checkout.razorpay.com', 'api.razorpay.com'],
        },
      }),
    )
    expect(verdict.completeSession).toBe(true)
  })

  it('does not trust expired gesture for payment', () => {
    const verdict = classifyRedirect(
      ctx({
        destUrl: 'https://checkout.razorpay.com/v1/pay',
        destHost: 'checkout.razorpay.com',
        destSite: 'razorpay.com',
        transitionType: 'auto_toplevel',
        transitionQualifiers: ['client_redirect'],
        lastGestureOpenerAt: now - REDIRECT_GESTURE_MS - 1,
        lastGestureTabAt: 0,
        settings: { ...DEFAULT_REDIRECT_PROTECTION, unknownBehavior: 'block' },
      }),
    )
    expect(verdict.action).toBe('block')
  })
})
