import { describe, expect, it } from 'vitest'

import { hasCapability } from '@/platform/capabilities'
import { openExtensionPanel } from '@/platform/panel'
import { isFirefoxTarget, resolveBuildTarget } from '@/platform/targets'
import { classifyTabUrl } from '@/chrome/contentScriptClient'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'

describe('browser target configuration', () => {
  it('defaults unknown build targets to Chromium', () => {
    expect(resolveBuildTarget(undefined)).toBe('chromium')
    expect(resolveBuildTarget('chrome')).toBe('chromium')
    expect(resolveBuildTarget('firefox')).toBe('firefox')
    expect(isFirefoxTarget('firefox')).toBe(true)
  })
})

describe('browser capability layer', () => {
  it('detects APIs without assuming every Chromium API exists', () => {
    expect(hasCapability('sidePanel')).toBe(true)
    expect(hasCapability('offscreen')).toBe(false)
  })

  it('opens the native panel through the shared adapter', async () => {
    const opened = await openExtensionPanel({ windowId: 7 })
    expect(opened).toBe(true)
    expect(chrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 7 })
  })
})

describe('Firefox and Tor URL restrictions', () => {
  it('does not attempt to inject into extension schemes', () => {
    expect(isRestrictedCaptureUrl('moz-extension://one-panel/index.html')).toBe(true)
    expect(isRestrictedCaptureUrl('resource://gre/modules/foo.js')).toBe(true)
    expect(classifyTabUrl('moz-extension://one-panel/index.html')).toBe('RESTRICTED_PAGE')
  })
})

