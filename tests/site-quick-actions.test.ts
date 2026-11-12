import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ADBLOCK_SITE_MENU_ID, handleSiteQuickActionClick } from '@/chrome/background/siteQuickActions'
import { addAllowlistHost } from '@/core/adblock'
import { resetChromeMockStorage } from './setup'

vi.mock('@/core/adblock', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/adblock')>()
  return {
    ...actual,
    addAllowlistHost: vi.fn(async () => ({
      enabled: true,
      allowlist: ['example.com'],
      lists: actual.DEFAULT_ADBLOCK_STATE.lists,
      youtubeEnabled: true,
      cookieBanners: true,
      distractions: true,
    })),
    removeAllowlistHost: vi.fn(async () => actual.DEFAULT_ADBLOCK_STATE),
    updateAdblockState: vi.fn(async (patch) => ({
      ...actual.DEFAULT_ADBLOCK_STATE,
      ...patch,
    })),
    getAdblockState: vi.fn(async () => ({ ...actual.DEFAULT_ADBLOCK_STATE, enabled: true })),
    isBlockingActiveForUrl: vi.fn(() => true),
  }
})

vi.mock('@/chrome/background/fontInspector', () => ({
  pushFontInspectorToTab: vi.fn(async () => undefined),
  resolveFontInspectorForTab: vi.fn(async () => false),
  toggleFontInspectorForTab: vi.fn(async () => true),
}))

describe('site quick actions', () => {
  beforeEach(() => {
    resetChromeMockStorage()
    vi.clearAllMocks()
    chrome.contextMenus.update = vi.fn()
  })

  it('toggles adblock allowlist for the tab host', async () => {
    const handled = await handleSiteQuickActionClick(ADBLOCK_SITE_MENU_ID, {
      id: 1,
      url: 'https://example.com/path',
    } as chrome.tabs.Tab)
    expect(handled).toBe(true)
    expect(addAllowlistHost).toHaveBeenCalledWith('example.com')
  })
})
