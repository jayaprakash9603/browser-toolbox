import { beforeEach, describe, expect, it } from 'vitest'

import {
  clearHtmlBundleJob,
  HTML_BUNDLE_JOB_KEY,
  isJobRunning,
  isJobStalled,
  overallPercent,
  readHtmlBundleJob,
  STALE_AFTER_MS,
  type HtmlBundleJob,
} from '@/core/htmlBundleJob'
import { resetChromeMockStorage } from './setup'

function makeJob(overrides: Partial<HtmlBundleJob> = {}): HtmlBundleJob {
  return {
    id: 'job-1',
    tabId: 7,
    pageUrl: 'http://reports.local/index.html',
    pageTitle: 'Report',
    fileName: 'Report (131 pages).zip',
    pageCount: 131,
    status: 'running',
    progress: null,
    startedAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  }
}

describe('html bundle job state', () => {
  beforeEach(() => resetChromeMockStorage())

  it('maps phase progress onto one overall percentage', () => {
    expect(overallPercent(null)).toBe(0)
    expect(overallPercent({ phase: 'pages', done: 0, total: 10 })).toBe(0)
    expect(overallPercent({ phase: 'pages', done: 10, total: 10 })).toBe(45)
    expect(overallPercent({ phase: 'assets', done: 1, total: 2 })).toBe(65)
    expect(overallPercent({ phase: 'transfer', done: 3, total: 3 })).toBe(100)
  })

  it('treats a running job without recent updates as stalled', () => {
    const job = makeJob()
    expect(isJobRunning(job, 1_000 + STALE_AFTER_MS - 1)).toBe(true)
    expect(isJobStalled(job, 1_000 + STALE_AFTER_MS - 1)).toBe(false)
    expect(isJobRunning(job, 1_000 + STALE_AFTER_MS)).toBe(false)
    expect(isJobStalled(job, 1_000 + STALE_AFTER_MS)).toBe(true)
    expect(isJobRunning(makeJob({ status: 'done' }), 1_000)).toBe(false)
  })

  it('reads and clears the persisted job from session storage', async () => {
    await chrome.storage.session.set({ [HTML_BUNDLE_JOB_KEY]: makeJob() })
    expect((await readHtmlBundleJob())?.id).toBe('job-1')
    await clearHtmlBundleJob()
    expect(await readHtmlBundleJob()).toBeNull()
  })
})
