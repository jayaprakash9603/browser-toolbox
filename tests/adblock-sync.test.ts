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
    expect(ids).toEqual([
      'adblock-cosmetic',
      'adblock-generic-css',
      'adblock-popups',
      'adblock-yt-main',
      'adblock-yt-isolated',
    ])
    expect(scripts[0].excludeMatches).toEqual(['*://*.example.com/*'])
    expect(scripts[1].css).toEqual(['adblock/cosmetic/generic.css'])
    expect(scripts[1].excludeMatches).toEqual(['*://*.example.com/*'])
    expect(scripts.find((s) => s.id === 'adblock-yt-main')?.world).toBe('MAIN')
  })

  it('keeps the always-on generic CSS off $generichide and $elemhide sites', () => {
    const scripts = buildContentScripts(DEFAULT_ADBLOCK_STATE, {
      generichide: ['news.example'],
      elemhide: ['shop.example'],
    })
    const css = scripts.find((s) => s.id === 'adblock-generic-css')
    expect(css?.excludeMatches).toEqual([
      '*://news.example/*',
      '*://*.news.example/*',
      '*://shop.example/*',
      '*://*.shop.example/*',
    ])
    expect(scripts.find((s) => s.id === 'adblock-cosmetic')?.excludeMatches).toBeUndefined()
  })

  it('runs the pop-up blocker in every frame of the page world, and can be turned off', () => {
    const popups = buildContentScripts(DEFAULT_ADBLOCK_STATE).find((s) => s.id === 'adblock-popups')
    expect(popups?.world).toBe('MAIN')
    expect(popups?.allFrames).toBe(true)
    expect(popups?.runAt).toBe('document_start')
    expect(popups?.js).toEqual(['adblock/scripts/popups-main.js'])
    const off = buildContentScripts({ ...DEFAULT_ADBLOCK_STATE, blockPopups: false })
    expect(off.some((s) => s.id === 'adblock-popups')).toBe(false)
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

  it('skips discarded tabs when injecting into open tabs', async () => {
    vi.mocked(chrome.tabs.query).mockImplementation(async (query) => {
      if (query && typeof query === 'object' && 'active' in query) {
        return [{ id: 1, url: 'https://example.com', active: true }] as chrome.tabs.Tab[]
      }
      return [
        { id: 1, url: 'https://example.com', discarded: false },
        { id: 2, url: 'https://discarded.test', discarded: true },
      ] as chrome.tabs.Tab[]
    })
    await syncAdblockState()
    expect(chrome.scripting.insertCSS).toHaveBeenCalledTimes(1)
  })
})
