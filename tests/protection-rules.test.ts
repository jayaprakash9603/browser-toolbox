import { describe, expect, it } from 'vitest'

import { DEFAULT_PROTECTION_STATE } from '@/core/protection'
import { buildThreatRules, buildTrustedAllowRules, isProtectionManagedRuleId } from '@/core/protection/rules'
import type { ThreatsFile } from '@/core/protection/types'

const sampleThreats: ThreatsFile = {
  generated: '2026-01-01T00:00:00.000Z',
  sources: [],
  counts: { phishing: 2, malware: 1, scam: 1, total: 4 },
  phishing: ['phish-a.test', 'phish-b.test'],
  malware: ['malware.test'],
  scam: ['scam.test'],
}

describe('protection DNR rules', () => {
  it('builds redirect and block pairs per category', () => {
    const rules = buildThreatRules(sampleThreats, DEFAULT_PROTECTION_STATE, 'chrome-extension://abc')
    const redirects = rules.filter((r) => r.action.type === 'redirect')
    const blocks = rules.filter((r) => r.action.type === 'block')
    expect(redirects.length).toBeGreaterThanOrEqual(3)
    expect(blocks.length).toBe(redirects.length)
    expect(redirects[0].action.redirect?.regexSubstitution).toContain('blocked.html?c=phishing')
    expect(redirects[0].priority).toBe(200)
  })

  it('omits rules when protection is disabled or category is off', () => {
    expect(buildThreatRules(sampleThreats, { ...DEFAULT_PROTECTION_STATE, enabled: false }, 'x').length).toBe(0)
    const noPhish = buildThreatRules(
      sampleThreats,
      { ...DEFAULT_PROTECTION_STATE, phishing: false },
      'chrome-extension://abc',
    )
    expect(noPhish.every((r) => !JSON.stringify(r).includes('phish-a'))).toBe(true)
  })

  it('trusted allow rules use higher priority and dedicated id range', () => {
    const rules = buildTrustedAllowRules(['trusted.example'])
    expect(rules[0].priority).toBe(300)
    expect(rules[0].id).toBeGreaterThanOrEqual(2_900_000)
  })

  it('identifies protection-managed rule ids', () => {
    expect(isProtectionManagedRuleId(2_000_001)).toBe(true)
    expect(isProtectionManagedRuleId(1_000_001)).toBe(false)
  })
})
