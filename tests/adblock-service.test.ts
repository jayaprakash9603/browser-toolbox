import { beforeEach, describe, expect, it } from 'vitest'

import {
  addAllowlistHost,
  getAdblockState,
  isBlockingActiveForUrl,
  normalizeHostname,
  updateAdblockState,
} from '@/core/adblock'
import { resetChromeMockStorage } from './setup'

describe('adblock service', () => {
  beforeEach(() => resetChromeMockStorage())

  it('defaults to enabled with premium extras off', async () => {
    const state = await getAdblockState()
    expect(state.enabled).toBe(true)
    expect(state.youtubeEnabled).toBe(true)
    expect(state.lists.ads).toBe(true)
    expect(state.cookieBanners).toBe(false)
    expect(state.blockNotifications).toBe(false)
  })

  it('normalizes hostnames', () => {
    expect(normalizeHostname('https://www.Example.com/path')).toBe('example.com')
    expect(normalizeHostname('not a host!')).toBeNull()
  })

  it('tracks allowlist', async () => {
    await addAllowlistHost('www.news.example.com')
    const state = await getAdblockState()
    expect(state.allowlist).toContain('news.example.com')
  })

  it('respects allowlist for blocking', async () => {
    await updateAdblockState({ enabled: true, allowlist: ['youtube.com'] })
    expect(isBlockingActiveForUrl(await getAdblockState(), 'https://www.youtube.com/watch')).toBe(
      false,
    )
    expect(isBlockingActiveForUrl(await getAdblockState(), 'https://example.com')).toBe(true)
  })
})
