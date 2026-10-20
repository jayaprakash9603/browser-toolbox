import { ensureContentScriptInTab } from '@/chrome/contentScriptClient'
import {
  HTML_BUNDLE_JOB_KEY,
  isJobRunning,
  readHtmlBundleJob,
  type HtmlBundleJob,
} from '@/core/htmlBundleJob'
import { createLogger } from '@/core/logging'
import { downloadWithName } from './downloadNames'
import { registerMessageHandler } from '@/core/messaging'
import type { ExtensionMessage, ExtensionResponse } from '@/core/messaging/types'

import { acquireOffscreen, releaseOffscreen } from './offscreen'

const logger = createLogger('html-bundle-job')

let writeQueue: Promise<unknown> = Promise.resolve()

function updateJob(
  mutate: (job: HtmlBundleJob | null) => HtmlBundleJob | null,
): Promise<HtmlBundleJob | null> {
  const next = writeQueue.then(async () => {
    const current = await readHtmlBundleJob()
    const updated = mutate(current)
    if (updated && updated !== current) {
      await chrome.storage.session.set({ [HTML_BUNDLE_JOB_KEY]: updated })
    }
    return updated
  })
  writeQueue = next.catch(() => null)
  return next
}

function patchRunningJob(id: string, patch: Partial<HtmlBundleJob>) {
  return updateJob((job) =>
    job?.id === id && job.status === 'running'
      ? { ...job, ...patch, updatedAt: Date.now() }
      : job,
  )
}

function finishJob(id: string, patch: Partial<HtmlBundleJob>) {
  const now = Date.now()
  return patchRunningJob(id, { ...patch, finishedAt: now })
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function request<T>(send: () => Promise<unknown>): Promise<T> {
  const response = (await send()) as ExtensionResponse<T> | undefined
  if (!response) throw new Error('No response from extension context.')
  if (!response.ok) throw new Error(response.error)
  return response.data
}

function offscreenOwner(buildId: string): string {
  return `html-bundle:${buildId}`
}

function releaseAfterDownload(downloadId: number, buildId: string) {
  const onChanged = (delta: chrome.downloads.DownloadDelta) => {
    if (delta.id !== downloadId) return
    const state = delta.state?.current
    if (state !== 'complete' && state !== 'interrupted') return
    chrome.downloads.onChanged.removeListener(onChanged)
    void chrome.runtime
      .sendMessage({ type: 'OFFSCREEN_BUNDLE_RELEASE', buildId })
      .then(() => releaseOffscreen(offscreenOwner(buildId)))
      .catch(() => {})
  }
  chrome.downloads.onChanged.addListener(onChanged)
}

async function deliverBundle(job: HtmlBundleJob, chunkCount: number): Promise<void> {
  await acquireOffscreen(offscreenOwner(job.id))
  for (let index = 0; index < chunkCount; index += 1) {
    const { base64 } = await request<{ base64: string }>(() =>
      chrome.tabs.sendMessage(job.tabId, { type: 'READ_HTML_BUNDLE_CHUNK', buildId: job.id, index }),
    )
    await request(() =>
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_BUNDLE_CHUNK', buildId: job.id, base64 }),
    )
    const current = await patchRunningJob(job.id, {
      progress: { phase: 'transfer', done: index + 1, total: chunkCount },
    })
    if (current?.status !== 'running') {
      await chrome.runtime
        .sendMessage({ type: 'OFFSCREEN_BUNDLE_RELEASE', buildId: job.id })
        .catch(() => {})
      return
    }
  }
  const { url } = await request<{ url: string }>(() =>
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_BUNDLE_FINALIZE', buildId: job.id }),
  )
  const downloadId = await downloadWithName({
    url,
    filename: job.fileName,
    conflictAction: 'uniquify',
  })
  releaseAfterDownload(downloadId, job.id)
  await finishJob(job.id, { status: 'done' })
}

async function startJob(message: Extract<ExtensionMessage, { type: 'START_HTML_BUNDLE_JOB' }>) {
  const existing = await readHtmlBundleJob()
  if (isJobRunning(existing)) throw new Error('A ZIP is already being prepared.')

  const now = Date.now()
  const job: HtmlBundleJob = {
    id: crypto.randomUUID(),
    tabId: message.tabId,
    pageUrl: message.pageUrl,
    pageTitle: message.pageTitle,
    fileName: message.fileName,
    pageCount: message.pageCount,
    status: 'running',
    progress: null,
    startedAt: now,
    updatedAt: now,
  }
  await updateJob(() => job)

  try {
    await ensureContentScriptInTab(message.tabId)
    await request(() =>
      chrome.tabs.sendMessage(message.tabId, {
        type: 'BUILD_HTML_BUNDLE',
        buildId: job.id,
        ...message.request,
      }),
    )
  } catch (error) {
    await finishJob(job.id, { status: 'error', error: errorText(error) })
    throw error
  }
  return { jobId: job.id }
}

export function registerHtmlBundleJobHandlers() {
  registerMessageHandler('START_HTML_BUNDLE_JOB', (message) => {
    if (message.type !== 'START_HTML_BUNDLE_JOB') return undefined
    return startJob(message)
  })

  registerMessageHandler('HTML_BUNDLE_PROGRESS', async (message) => {
    if (message.type !== 'HTML_BUNDLE_PROGRESS') return
    await patchRunningJob(message.buildId, {
      progress: { phase: message.phase, done: message.done, total: message.total },
    })
  })

  registerMessageHandler('HTML_BUNDLE_READY', async (message) => {
    if (message.type !== 'HTML_BUNDLE_READY') return
    const job = await patchRunningJob(message.buildId, {
      stats: message.stats,
      progress: { phase: 'transfer', done: 0, total: message.chunkCount },
    })
    if (job?.id !== message.buildId || job.status !== 'running') return
    try {
      await deliverBundle(job, message.chunkCount)
    } catch (error) {
      logger.warn('bundle delivery failed', error)
      await finishJob(job.id, { status: 'error', error: errorText(error) })
    }
  })

  registerMessageHandler('HTML_BUNDLE_FAILED', async (message) => {
    if (message.type !== 'HTML_BUNDLE_FAILED') return
    await finishJob(message.buildId, { status: 'error', error: message.error })
  })

  registerMessageHandler('CANCEL_HTML_BUNDLE_JOB', async (message) => {
    if (message.type !== 'CANCEL_HTML_BUNDLE_JOB') return
    const job = await finishJob(message.jobId, { status: 'cancelled' })
    if (job?.id === message.jobId) {
      await chrome.tabs
        .sendMessage(job.tabId, { type: 'CANCEL_HTML_BUNDLE', buildId: job.id })
        .catch(() => {})
    }
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    void updateJob((job) =>
      job?.status === 'running' && job.tabId === tabId
        ? {
            ...job,
            status: 'error',
            error: 'The report tab was closed before the ZIP was ready.',
            updatedAt: Date.now(),
            finishedAt: Date.now(),
          }
        : job,
    )
  })
}
