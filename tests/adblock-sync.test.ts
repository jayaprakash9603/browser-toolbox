import { beforeEach, describe, expect, it, vi } from 'vitest'

import { syncAdblockState } from '@/chrome/background/adblock'
import { buildContentScripts } from '@/chrome/background/adblock/contentScripts'
import { enabledRulesetIds } from '@/chrome/background/adblock/rulesets'
import { DEFAULT_ADBLOCK_STATE, updateAdblockState } from '@/core/adblock'
import { resetChromeMockStorage } from './setup'

describe('adblock background sync', () => {
  beforeEach(() => {
    resetChromeMockStorage()
    vi.clearAllMocks()
  })

  it('enables rulesets by default', async () => {
    await syncAdblockState()
    const call = vi.mocked(chrome.declarativeNetRequest.updateEnabledRulesets).mock.calls.at(-1)
    expect(call?.[0]?.enableRulesetIds).toEqual(['ruleset-ads', 'ruleset-privacy', 'ruleset-youtube'])
  })

  it('disables every ruleset when turned off', async () => {
    await updateAdblockState({ enabled: false })
    await syncAdblockState()
    const call = vi.mocked(chrome.declarativeNetRequest.updateEnabledRulesets).mock.calls.at(-1)
    expect(call?.[0]?.enableRulesetIds).toEqual([])
  })

  it('maps cookie banners to the annoyances ruleset', () => {
    expect(enabledRulesetIds({ ...DEFAULT_ADBLOCK_STATE, cookieBanners: true })).toContain(
      'ruleset-annoyances',
    )
  })

  it('registers cosmetic and YouTube scripts, excluding allowlisted hosts', () => {
    const scripts = buildContentScripts({ ...DEFAULT_ADBLOCK_STATE, allowlist: ['example.com'] })
    const ids = scripts.map((s) => s.id)
    expect(ids).toEqual(['adblock-cosmetic', 'adblock-yt-main', 'adblock-yt-isolated'])
    expect(scripts[0].css).toEqual(['adblock/cosmetic/generic.css'])
    expect(scripts[0].excludeMatches).toEqual(['*://*.example.com/*'])
    expect(scripts.find((s) => s.id === 'adblock-yt-main')?.world).toBe('MAIN')
  })

  it('registers premium feature scripts when enabled', () => {
    const ids = buildContentScripts({
      ...DEFAULT_ADBLOCK_STATE,
      cookieBanners: true,
      distractions: true,
      blockNotifications: true,
    }).map((s) => s.id)
    expect(ids).toEqual(
      expect.arrayContaining(['adblock-cookies', 'adblock-distractions', 'adblock-notifications']),
    )
  })

  it('injects into already-open tabs once per session', async () => {
    await syncAdblockState()
    expect(chrome.scripting.insertCSS).toHaveBeenCalledTimes(1)
    await syncAdblockState()
    expect(chrome.scripting.insertCSS).toHaveBeenCalledTimes(1)
  })
})
