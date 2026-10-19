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

  it('registers heuristics script when look-alike detection is on', () => {
    const scripts = buildProtectionContentScripts(DEFAULT_PROTECTION_STATE)
    expect(scripts.map((s) => s.id)).toEqual(['protection-heuristics'])
    expect(scripts[0].js).toEqual(['protection/scripts/heuristics.js'])
  })

  it('does not register heuristics when disabled', () => {
    expect(buildProtectionContentScripts({ ...DEFAULT_PROTECTION_STATE, lookalike: false })).toEqual([])
  })

  it('adblock allowlist ids do not overlap protection managed ids', () => {
    expect(isAdblockAllowlistRuleId(1_000_000)).toBe(true)
    expect(isProtectionManagedRuleId(1_000_000)).toBe(false)
    expect(isProtectionManagedRuleId(2_000_000)).toBe(true)
  })
})
