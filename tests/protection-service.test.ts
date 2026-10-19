import { beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_PROTECTION_STATE,
  getProtectionState,
  getProtectionStats,
  recordProtectionBlock,
  type ThreatCategory,
} from '@/core/protection'
import { resetChromeMockStorage } from './setup'

describe('protection service', () => {
  beforeEach(() => resetChromeMockStorage())

  it('defaults to enabled with all layers on', async () => {
    const state = await getProtectionState()
    expect(state).toEqual(DEFAULT_PROTECTION_STATE)
    expect(state.miners && state.scamGuard && state.clipboardGuard).toBe(true)
    expect(state.downloadGuard && state.notificationGuard).toBe(true)
  })

  it('ignores reports with unknown categories', async () => {
    const before = await getProtectionStats()
    const after = await recordProtectionBlock('__proto__' as ThreatCategory, 'evil.test')
    expect(after.blocked).toEqual(before.blocked)
    expect(after.recent).toHaveLength(0)
  })

  it('counts new guard categories', async () => {
    const stats = await recordProtectionBlock('clipboard', 'clickfix.test')
    expect(stats.blocked.clipboard).toBe(1)
    expect(stats.recent[0]).toMatchObject({ host: 'clickfix.test', category: 'clipboard' })
  })
})
