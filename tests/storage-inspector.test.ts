import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadStorageSnapshot } from '@/tools/storage/storage-inspector/loadSnapshot'

const snapshot = {
  localStorage: { token: 'abc' },
  sessionStorage: { draft: '1' },
}

describe('loadStorageSnapshot', () => {
  afterEach(() => {
    vi.mocked(chrome.tabs.sendMessage).mockReset()
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue(undefined)
  })

  it('checks the content script, then reads storage from the active page', async () => {
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(async (_tabId, message) => {
      const type = (message as { type?: string }).type
      if (type === 'CONTENT_SCRIPT_PING') return { ok: true, data: { ready: true } }
      if (type === 'GET_STORAGE_SNAPSHOT') return { ok: true, data: snapshot }
      return undefined
    })

    await expect(loadStorageSnapshot()).resolves.toEqual(snapshot)
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, { type: 'CONTENT_SCRIPT_PING' })
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, { type: 'GET_STORAGE_SNAPSHOT' })
  })

  it('returns null when the page cannot host the content script', async () => {
    vi.mocked(chrome.tabs.sendMessage).mockRejectedValue(new Error('Receiving end does not exist.'))

    await expect(loadStorageSnapshot()).resolves.toBeNull()
  })
})
