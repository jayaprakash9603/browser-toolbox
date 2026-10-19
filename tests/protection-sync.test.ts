import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildProtectionContentScripts } from '@/chrome/background/protection/contentScripts'
import { isAdblockAllowlistRuleId } from '@/chrome/background/adblock/allowlist'
import { DEFAULT_PROTECTION_STATE, isProtectionManagedRuleId } from '@/core/protection'
import { resetChromeMockStorage } from './setup'

describe('protection background sync', () => {
  beforeEach(() => {
    resetChromeMockStorage()
    vi.clearAllMocks()
  })

  it('registers the isolated script and every page guard by default', () => {
    const scripts = buildProtectionContentScripts(DEFAULT_PROTECTION_STATE)
    expect(scripts.map((s) => s.id)).toEqual([
      'protection-heuristics',
      'protection-guard-scam',
      'protection-guard-clipboard',
      'protection-guard-notify',
    ])
    expect(scripts[0].js).toEqual(['protection/scripts/heuristics.js'])
    expect(scripts[0].world).toBeUndefined()
    expect(scripts.slice(1).every((s) => s.world === 'MAIN' && s.runAt === 'document_start')).toBe(true)
  })

  it('keeps the isolated script when look-alike detection is off and drops disabled guards', () => {
    const scripts = buildProtectionContentScripts({
      ...DEFAULT_PROTECTION_STATE,
      lookalike: false,
      scamGuard: false,
      notificationGuard: false,
    })
    expect(scripts.map((s) => s.id)).toEqual(['protection-heuristics', 'protection-guard-clipboard'])
  })

  it('registers nothing when protection is off', () => {
    expect(buildProtectionContentScripts({ ...DEFAULT_PROTECTION_STATE, enabled: false })).toEqual([])
  })

  it('excludes trusted sites from every script', () => {
    const scripts = buildProtectionContentScripts({ ...DEFAULT_PROTECTION_STATE, trusted: ['bank.test'] })
    for (const script of scripts) {
      expect(script.excludeMatches).toEqual(['*://bank.test/*', '*://*.bank.test/*'])
    }
  })

  it('adblock allowlist ids do not overlap protection managed ids', () => {
    expect(isAdblockAllowlistRuleId(1_000_000)).toBe(true)
    expect(isProtectionManagedRuleId(1_000_000)).toBe(false)
    expect(isProtectionManagedRuleId(2_000_000)).toBe(true)
  })
})
