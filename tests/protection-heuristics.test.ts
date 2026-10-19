import { describe, expect, it } from 'vitest'

import { assessPage, registrableDomain } from '@/core/protection/heuristics'

describe('protection heuristics', () => {
  it('computes registrable domains with multi-part suffixes', () => {
    expect(registrableDomain('www.shop.example.co.uk')).toBe('example.co.uk')
    expect(registrableDomain('mail.google.com')).toBe('google.com')
  })

  it('flags brand impersonation on password pages', () => {
    const verdict = assessPage({
      host: 'paypal-secure-login.xyz',
      protocol: 'https:',
      hasPassword: true,
      formActions: [],
      title: 'Sign in',
    })
    expect(verdict.level).toBe('high')
    expect(verdict.brand).toBe('paypal')
  })

  it('does not flag official domains', () => {
    const verdict = assessPage({
      host: 'www.paypal.com',
      protocol: 'https:',
      hasPassword: true,
      formActions: [],
      title: 'Log in to PayPal',
    })
    expect(verdict.level).toBe('none')
  })

  it('returns none without a password field', () => {
    expect(
      assessPage({
        host: 'paypal.evil.test',
        protocol: 'https:',
        hasPassword: false,
        formActions: [],
        title: '',
      }).level,
    ).toBe('none')
  })

  it('flags typosquats within edit distance 1', () => {
    const verdict = assessPage({
      host: 'paypa1.com',
      protocol: 'https:',
      hasPassword: true,
      formActions: [],
      title: '',
    })
    expect(verdict.level).toBe('high')
  })
})
