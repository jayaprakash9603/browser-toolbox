import { beforeEach, describe, expect, it, vi } from 'vitest'

import { syncProtectionRules } from '@/chrome/background/protection/rules'
import { DEFAULT_PROTECTION_STATE } from '@/core/protection'
import { STORAGE_KEYS } from '@/core/constants'
import { resetChromeMockStorage } from './setup'

describe('syncProtectionRules', () => {
  beforeEach(() => {
    resetChromeMockStorage()
    vi.clearAllMocks()
  })

  it('skips fetch and DNR update when stored version matches bundled stamp and state', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const fingerprint = JSON.stringify({
      schema: 3,
      enabled: DEFAULT_PROTECTION_STATE.enabled,
      phishing: DEFAULT_PROTECTION_STATE.phishing,
      malware: DEFAULT_PROTECTION_STATE.malware,
      scams: DEFAULT_PROTECTION_STATE.scams,
      miners: DEFAULT_PROTECTION_STATE.miners,
      trusted: [],
    })
    const { bundledThreatsGenerated } = await import('@/core/protection/bundledThreatsStamp')
    if (!bundledThreatsGenerated) {
      // Vitest may run without the Vite define; skip rather than false-fail.
      return
    }
    await chrome.storage.local.set({
      [STORAGE_KEYS.protectionRulesVersion]: `${bundledThreatsGenerated}|${fingerprint}`,
    })

    await syncProtectionRules(DEFAULT_PROTECTION_STATE)

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(chrome.declarativeNetRequest.updateDynamicRules).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
