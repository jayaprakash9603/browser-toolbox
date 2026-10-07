import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getHostPermissionPattern,
  hasHostAccess,
  requestHostAccess,
} from '@/core/permissions/originPermissions'

describe('optional origin permissions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('normalizes a selected host and ignores path, query, and port', () => {
    expect(getHostPermissionPattern('HTTPS://Api.Example.com:8443/v1?key=value')).toBe(
      'https://api.example.com/*',
    )
  })

  it('supports local HTTP API hosts', () => {
    expect(getHostPermissionPattern('http://localhost:3000/health')).toBe('http://localhost/*')
  })

  it.each(['file:///tmp/data.json', 'javascript:alert(1)', 'https://user:pass@example.com', 'not a URL'])(
    'rejects unsafe or invalid URL %s',
    (value) => {
      expect(getHostPermissionPattern(value)).toBeNull()
    },
  )

  it('checks existing permission for only the selected host', async () => {
    vi.mocked(chrome.permissions.contains).mockResolvedValueOnce(true as never)

    await expect(hasHostAccess('https://api.example.com/v1')).resolves.toBe(true)
    expect(chrome.permissions.contains).toHaveBeenCalledWith({
      origins: ['https://api.example.com/*'],
    })
  })

  it('requests only the selected host when invoked by the caller', async () => {
    vi.mocked(chrome.permissions.request).mockResolvedValueOnce(true as never)

    await expect(requestHostAccess('http://127.0.0.1:8080/api')).resolves.toBe(true)
    expect(chrome.permissions.request).toHaveBeenCalledWith({ origins: ['http://127.0.0.1/*'] })
  })

  it('does not prompt for invalid schemes', async () => {
    await expect(requestHostAccess('ftp://files.example.com/data')).resolves.toBe(false)
    expect(chrome.permissions.request).not.toHaveBeenCalled()
  })
})