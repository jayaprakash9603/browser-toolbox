import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ADBLOCK_SITE_MENU_ID, handleSiteQuickActionClick } from '@/chrome/background/siteQuickActions'
import { toggleAllowlistHost } from '@/core/adblock'
import { resetChromeMockStorage } from './setup'

vi.mock('@/core/adblock', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/adblock')>()
  return {
    ...actual,
    toggleAllowlistHost: vi.fn(async () => ({
      enabled: true,
      allowlist: ['example.com'],
      lists: actual.DEFAULT_ADBLOCK_STATE.lists,
      youtubeEnabled: true,
      cookieBanners: true,
      distractions: true,
    })),
    getAdblockState: vi.fn(async () => actual.DEFAULT_ADBLOCK_STATE),
  }
})

vi.mock('@/chrome/contentScriptClient', () => ({
  ensureContentScriptInTab: vi.fn(async () => undefined),
}))

describe('site quick actions', () => {
  beforeEach(() => {
    resetChromeMockStorage()
    vi.clearAllMocks()
  })

  it('toggles adblock allowlist for the tab host', async () => {
    const handled = await handleSiteQuickActionClick(ADBLOCK_SITE_MENU_ID, {
      id: 1,
      url: 'https://example.com/path',
    } as chrome.tabs.Tab)
    expect(handled).toBe(true)
    expect(toggleAllowlistHost).toHaveBeenCalledWith('example.com')
  })
})
