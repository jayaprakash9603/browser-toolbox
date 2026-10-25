import { afterEach, describe, expect, it, vi } from 'vitest'

import { probeUserScripts } from '@/core/script-studio/availability'

const c = chrome as unknown as { userScripts?: { getScripts: () => Promise<unknown[]> } }

function setPermission(granted: boolean) {
  vi.mocked(chrome.permissions.contains).mockResolvedValue(granted as never)
}

describe('probeUserScripts', () => {
  afterEach(() => {
    delete c.userScripts
    setPermission(false)
  })

  it('asks for the permission first', async () => {
    setPermission(false)
    expect((await probeUserScripts()).step).toBe('permission')
  })

  it('asks for the toggle when the permission is granted but the API is missing', async () => {
    setPermission(true)
    expect((await probeUserScripts()).step).toBe('toggle')
  })

  it('asks for the toggle when the API throws', async () => {
    setPermission(true)
    c.userScripts = { getScripts: vi.fn(async () => Promise.reject(new Error('Allow user scripts is off'))) }
    const probe = await probeUserScripts()
    expect(probe.step).toBe('toggle')
    expect(probe.operational).toBe(false)
  })

  it('is ready whenever the API answers, even if the permission check lags', async () => {
    setPermission(false)
    c.userScripts = { getScripts: vi.fn(async () => []) }
    const probe = await probeUserScripts()
    expect(probe.step).toBe('ready')
    expect(probe.operational).toBe(true)
  })
})
