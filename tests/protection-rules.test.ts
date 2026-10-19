import { describe, expect, it } from 'vitest'

import { DEFAULT_PROTECTION_STATE } from '@/core/protection'
import { buildThreatRules, buildTrustedAllowRules, isProtectionManagedRuleId } from '@/core/protection/rules'
import type { ThreatsFile } from '@/core/protection/types'

const sampleThreats: ThreatsFile = {
  generated: '2026-01-01T00:00:00.000Z',
  sources: [],
  counts: { phishing: 2, malware: 2, scam: 1, miner: 1, total: 6 },
  phishing: ['phish-a.test', 'phish-b.test'],
  malware: ['malware.test', '203.0.113.7'],
  scam: ['scam.test'],
  miner: ['coinhive.test'],
}

describe('protection DNR rules', () => {
  it('builds redirect and block pairs per category', () => {
    const rules = buildThreatRules(sampleThreats, DEFAULT_PROTECTION_STATE, 'chrome-extension://abc')
    const redirects = rules.filter((r) => r.action.type === 'redirect')
    const blocks = rules.filter((r) => r.action.type === 'block')
    expect(redirects.length).toBe(4)
    expect(blocks.length).toBe(redirects.length)
    expect(redirects[0].action.redirect?.regexSubstitution).toContain('blocked.html?c=phishing')
    expect(redirects[0].priority).toBe(200)
  })

  it('every redirect rule pairs regexSubstitution with regexFilter', () => {
    const rules = buildThreatRules(sampleThreats, DEFAULT_PROTECTION_STATE, 'chrome-extension://abc')
    for (const rule of rules.filter((r) => r.action.type === 'redirect')) {
      expect(rule.condition.regexFilter).toBeTruthy()
      expect(rule.condition.urlFilter).toBeUndefined()
    }
  })

  it('puts IP hosts into requestDomains chunks instead of per-IP rules', () => {
    const rules = buildThreatRules(sampleThreats, DEFAULT_PROTECTION_STATE, 'chrome-extension://abc')
    const malware = rules.filter((r) => JSON.stringify(r).includes('malware.test'))
    expect(malware).toHaveLength(2)
    expect(malware[0].condition.requestDomains).toContain('203.0.113.7')
  })

  it('includes cryptominer hosts and honours the miners toggle', () => {
    const on = buildThreatRules(sampleThreats, DEFAULT_PROTECTION_STATE, 'chrome-extension://abc')
    expect(on.some((r) => r.condition.requestDomains?.includes('coinhive.test'))).toBe(true)
    const off = buildThreatRules(
      sampleThreats,
      { ...DEFAULT_PROTECTION_STATE, miners: false },
      'chrome-extension://abc',
    )
    expect(off.some((r) => r.condition.requestDomains?.includes('coinhive.test'))).toBe(false)
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

  it('trusted allow rules use frame resource types only, higher priority and dedicated ids', () => {
    const rules = buildTrustedAllowRules(['trusted.example'])
    expect(rules[0].priority).toBe(300)
    expect(rules[0].id).toBeGreaterThanOrEqual(2_900_000)
    expect(rules[0].action.type).toBe('allowAllRequests')
    expect(rules[0].condition.resourceTypes).toEqual(['main_frame', 'sub_frame'])
  })

  it('identifies protection-managed rule ids', () => {
    expect(isProtectionManagedRuleId(2_000_001)).toBe(true)
    expect(isProtectionManagedRuleId(1_000_001)).toBe(false)
  })
})
