import { beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_ADBLOCK_STATE,
  getAdblockState,
  isYoutubeAdblockEnabled,
  setYoutubeAdblockEnabled,
} from '@/core/adblock'
import { resetChromeMockStorage } from './setup'

describe('youtube adblock mirror', () => {
  beforeEach(() => resetChromeMockStorage())

  it('defaults to youtube blocking on', () => {
    expect(isYoutubeAdblockEnabled(DEFAULT_ADBLOCK_STATE)).toBe(true)
  })

  it('disables only youtube list when turned off', async () => {
    await setYoutubeAdblockEnabled(false)
    const state = await getAdblockState()
    expect(state.youtubeEnabled).toBe(false)
    expect(state.lists.youtube).toBe(false)
    expect(state.enabled).toBe(true)
  })

  it('re-enables youtube list without changing other lists', async () => {
    await setYoutubeAdblockEnabled(false)
    await setYoutubeAdblockEnabled(true)
    const state = await getAdblockState()
    expect(isYoutubeAdblockEnabled(state)).toBe(true)
    expect(state.lists.ads).toBe(true)
  })
})
