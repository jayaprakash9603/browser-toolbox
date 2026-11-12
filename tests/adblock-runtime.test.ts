import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAdblockRuntimeProfile } from '@/platform/adblock/runtime'

describe('adblock runtime profile', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('detects desktop chromium by default', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 Chrome/131.0.0.0' })
    const profile = getAdblockRuntimeProfile()
    expect(profile.kind).toBe('desktop_chromium')
    expect(profile.prefersTopFrameMainScripts).toBe(false)
  })

  it('detects mobile firefox', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Android 14; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0',
    })
    vi.stubGlobal('chrome', { sidebarAction: {} })
    const profile = getAdblockRuntimeProfile()
    expect(profile.kind).toBe('mobile_firefox')
    expect(profile.prefersTopFrameMainScripts).toBe(true)
    expect(profile.networkStatsMode).not.toBe('feedback')
  })
})
