import { afterEach, describe, expect, it, vi } from 'vitest'

import { downloadWithName, takeRequestedName } from '@/chrome/background/downloadNames'

describe('downloadWithName', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('remembers the requested filename for the guard to re-apply', async () => {
    const download = vi.fn().mockResolvedValue(7)
    vi.stubGlobal('chrome', { downloads: { download } })

    const id = await downloadWithName({
      url: 'blob:chrome-extension://abc/1234',
      filename: 'Cucumber Reports (no 1853) - Features Overview (31 pages).zip',
    })

    expect(id).toBe(7)
    expect(takeRequestedName('blob:chrome-extension://abc/1234')).toBe(
      'Cucumber Reports (no 1853) - Features Overview (31 pages).zip',
    )
    expect(takeRequestedName('blob:chrome-extension://abc/1234')).toBeUndefined()
  })

  it('forgets the name when the download fails to start', async () => {
    vi.stubGlobal('chrome', { downloads: { download: vi.fn().mockRejectedValue(new Error('nope')) } })
    await expect(downloadWithName({ url: 'blob:x/1', filename: 'a.zip' })).rejects.toThrow('nope')
    expect(takeRequestedName('blob:x/1')).toBeUndefined()
  })
})
