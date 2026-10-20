import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  acquireOffscreen,
  offscreenLeaseOwners,
  releaseOffscreen,
  resetOffscreenLeasesForTests,
} from '@/chrome/background/offscreen'

describe('offscreen leases', () => {
  beforeEach(() => {
    resetOffscreenLeasesForTests()
    Object.assign(chrome, {
      runtime: {
        ...chrome.runtime,
        ContextType: { OFFSCREEN_DOCUMENT: 'OFFSCREEN_DOCUMENT' },
        getContexts: vi.fn(async () => [{}]),
      },
      offscreen: {
        createDocument: vi.fn(async () => undefined),
        closeDocument: vi.fn(async () => undefined),
      },
    })
  })

  it('keeps the document open until the last lease is released', async () => {
    await acquireOffscreen('job-a')
    await acquireOffscreen('job-b')
    expect(offscreenLeaseOwners().size).toBe(2)

    await releaseOffscreen('job-a')
    expect(chrome.offscreen.closeDocument).not.toHaveBeenCalled()

    await releaseOffscreen('job-b')
    expect(chrome.offscreen.closeDocument).toHaveBeenCalled()
  })
})
