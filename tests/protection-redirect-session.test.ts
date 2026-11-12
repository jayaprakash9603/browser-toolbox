import { describe, expect, it } from 'vitest'

import {
  applyVerdictToSession,
  createRedirectSession,
  isSessionExpired,
} from '@/core/protection/redirect/sessionLogic'
import type { RedirectSession, RedirectVerdict } from '@/core/protection/redirect/types'

const now = 1_000_000

describe('redirect session logic', () => {
  it('creates session with hop count 1', () => {
    const session = createRedirectSession({
      tabId: 2,
      openerTabId: 1,
      initiatingHost: 'shop.example.com',
      initiatingSite: 'example.com',
      kind: 'payment',
      now,
      ttlMs: 120_000,
      destHost: 'checkout.razorpay.com',
    })
    expect(session.redirectCount).toBe(1)
    expect(session.chainHosts).toEqual(['checkout.razorpay.com'])
  })

  it('does not advance session counters when a hop is blocked', () => {
    const session: RedirectSession = {
      tabId: 2,
      initiatingHost: 'shop.example.com',
      initiatingSite: 'example.com',
      kind: 'payment',
      createdAt: now,
      expiresAt: now + 120_000,
      redirectCount: 3,
      chainHosts: ['checkout.razorpay.com'],
    }
    const verdict: RedirectVerdict = {
      classification: 'UNKNOWN_REDIRECT',
      risk: 'high',
      score: 70,
      reasons: ['cross_domain'],
      action: 'block',
    }
    const next = applyVerdictToSession(session, verdict, 'evil.test', 2, 1, now, 120_000)
    expect(next?.redirectCount).toBe(3)
    expect(next?.chainHosts).not.toContain('evil.test')
  })

  it('clears session when completeSession is set', () => {
    const session: RedirectSession = {
      tabId: 2,
      initiatingHost: 'shop.example.com',
      initiatingSite: 'example.com',
      kind: 'payment',
      createdAt: now,
      expiresAt: now + 120_000,
      redirectCount: 3,
      chainHosts: ['checkout.razorpay.com'],
    }
    const verdict: RedirectVerdict = {
      classification: 'TRUSTED_REDIRECT',
      risk: 'low',
      score: 10,
      reasons: ['workflow_callback'],
      action: 'allow',
      completeSession: true,
    }
    expect(applyVerdictToSession(session, verdict, 'shop.example.com', 2, 1, now, 120_000)).toBeNull()
  })

  it('detects expiry', () => {
    const session: RedirectSession = {
      tabId: 1,
      initiatingHost: 'a.com',
      initiatingSite: 'a.com',
      kind: 'auth',
      createdAt: now - 200_000,
      expiresAt: now - 1,
      redirectCount: 1,
      chainHosts: ['accounts.google.com'],
    }
    expect(isSessionExpired(session, now)).toBe(true)
  })
})
