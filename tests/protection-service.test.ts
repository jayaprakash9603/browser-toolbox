import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_PROTECTION_STATE, getProtectionState } from '@/core/protection'
import { resetChromeMockStorage } from './setup'

describe('protection service', () => {
  beforeEach(() => resetChromeMockStorage())

  it('defaults to enabled with all layers on', async () => {
    const state = await getProtectionState()
    expect(state).toEqual(DEFAULT_PROTECTION_STATE)
  })
})
