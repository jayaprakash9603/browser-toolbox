import { base64ToBytes, bytesToBase64 } from '@/core/engines/htmlArchive'
import type { FilenameContext } from '@/core/engines/imageDownloader/filename'
import {
  applyFilenameTemplate,
  buildDownloadPath,
  buildImagesZip,
  guessExtFromUrl,
} from '@/core/engines/imageDownloader'
import {
  IMAGE_DOWNLOAD_JOB_KEY,
  isImageDownloadJobRunning,
  readImageDownloadJob,
  type ImageDownloadJob,
} from '@/core/imageDownloadJob'
import { createLogger } from '@/core/logging'
import { registerMessageHandler } from '@/core/messaging'
import type { ExtensionMessage, ExtensionResponse } from '@/core/messaging/types'

import { ensureOffscreenDocument, releaseOffscreenDocument } from './offscreen'

const logger = createLogger('image-download-job')
const FILE_CONCURRENCY = 3
const FETCH_CONCURRENCY = 4

let writeQueue: Promise<unknown> = Promise.resolve()
let cancelToken: { cancelled: boolean } | null = null

function updateJob(
  mutate: (job: ImageDownloadJob | null) => ImageDownloadJob | null,
): Promise<ImageDownloadJob | null> {
  const next = writeQueue.then(async () => {
    const current = await readImageDownloadJob()
    const updated = mutate(current)
    if (updated && updated !== current) {
      await chrome.storage.session.set({ [IMAGE_DOWNLOAD_JOB_KEY]: updated })
    }
    return updated
  })
  writeQueue = next.catch(() => null)
  return next
}

function patchRunningJob(id: string, patch: Partial<ImageDownloadJob>) {
  return updateJob((job) =>
    job?.id === id && job.status === 'running'
      ? { ...job, ...patch, updatedAt: Date.now() }
      : job,
  )
}

function finishJob(id: string, patch: Partial<ImageDownloadJob>) {
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

async function fetchImageBytes(
  url: string,
  tabId: number,
): Promise<Uint8Array> {
  if (url.startsWith('data:')) {
    const match = /^data:([^;,]+)?(?:;base64)?,(.*)$/i.exec(url)
    if (!match) throw new Error('Invalid data URL')
    const payload = match[2]
    if (url.includes(';base64,')) {
      return base64ToBytes(payload)
    }
    return new TextEncoder().encode(decodeURIComponent(payload))
  }

  try {
    const res = await fetch(url, { credentials: 'include', cache: 'no-store' })
    if (res.ok) return new Uint8Array(await res.arrayBuffer())
  } catch {
    /* in-page fetch */
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: async (src: string) => {
      const res = await fetch(src, { credentials: 'include', cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = await res.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      const chunk = 0x8000
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
      }
      return { base64: btoa(binary) }
    },
    args: [url],
  })
  const payload = result as { base64?: string } | undefined
  if (!payload?.base64) throw new Error('In-page fetch failed')
  return base64ToBytes(payload.base64)
}

function releaseAfterDownload(downloadId: number, buildId: string) {
  const onChanged = (delta: chrome.downloads.DownloadDelta) => {
    if (delta.id !== downloadId) return
    const state = delta.state?.current
    if (state !== 'complete' && state !== 'interrupted') return
    chrome.downloads.onChanged.removeListener(onChanged)
    void chrome.runtime
      .sendMessage({ type: 'OFFSCREEN_BUNDLE_RELEASE', buildId })
      .then(() => releaseOffscreenDocument())
      .catch(() => {})
  }
  chrome.downloads.onChanged.addListener(onChanged)
}

async function downloadZipBlob(jobId: string, zipBytes: Uint8Array, fileName: string) {
  await ensureOffscreenDocument()
  const { url } = await request<{ url: string }>(() =>
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_ZIP_FROM_BYTES',
      buildId: jobId,
      base64: bytesToBase64(zipBytes),
    }),
  )
  const downloadId = await chrome.downloads.download({
    url,
    filename: fileName,
    conflictAction: 'uniquify',
    saveAs: false,
  })
  releaseAfterDownload(downloadId, jobId)
}

async function runFilesJob(
  job: ImageDownloadJob,
  message: Extract<ExtensionMessage, { type: 'START_IMAGE_DOWNLOAD_JOB' }>,
  token: { cancelled: boolean },
) {
  const failed: string[] = []
  let done = 0
  let indexCounter = 0
  const queue = [...message.items]
  const workers = Array.from({ length: FILE_CONCURRENCY }, async () => {
    while (queue.length > 0) {
      if (token.cancelled) return
      const item = queue.shift()
      if (!item) return
      const index = ++indexCounter
      const ctx = {
        index,
        url: item.url,
        pageUrl: message.pageUrl,
        pageTitle: message.pageTitle,
        ext: guessExtFromUrl(item.url),
      }
      const fileName = applyFilenameTemplate(message.filenameTemplate, ctx)
      const path = buildDownloadPath(message.subfolder, fileName, ctx)
      try {
        await chrome.downloads.download({
          url: item.url,
          filename: path,
          conflictAction: 'uniquify',
          saveAs: false,
        })
        done += 1
      } catch (error) {
        logger.warn('file download failed', item.url, error)
        failed.push(item.url)
      }
      const current = await patchRunningJob(job.id, {
        progress: { done, failed: failed.length, total: message.items.length },
        failedUrls: [...failed],
      })
      if (current?.status !== 'running' || token.cancelled) return
    }
  })
  await Promise.all(workers)
  if (token.cancelled) {
    await finishJob(job.id, { status: 'cancelled' })
    return
  }
  await finishJob(job.id, {
    status: 'done',
    progress: { done, failed: failed.length, total: message.items.length },
    failedUrls: failed,
  })
}

async function runZipJob(
  job: ImageDownloadJob,
  message: Extract<ExtensionMessage, { type: 'START_IMAGE_DOWNLOAD_JOB' }>,
  token: { cancelled: boolean },
) {
  const failed: string[] = []
  const entries: { url: string; bytes: Uint8Array; context: FilenameContext }[] = []
  let fetched = 0
  const queue = [...message.items]

  const workers = Array.from({ length: FETCH_CONCURRENCY }, async () => {
    while (queue.length > 0) {
      if (token.cancelled) return
      const item = queue.shift()
      if (!item) return
      const index = fetched + 1
      try {
        const bytes = await fetchImageBytes(item.url, message.tabId)
        entries.push({
          url: item.url,
          bytes,
          context: {
            index,
            url: item.url,
            pageUrl: message.pageUrl,
            pageTitle: message.pageTitle,
            ext: guessExtFromUrl(item.url),
          },
        })
      } catch (error) {
        logger.warn('zip fetch failed', item.url, error)
        failed.push(item.url)
      }
      fetched += 1
      await patchRunningJob(job.id, {
        progress: { done: fetched, failed: failed.length, total: message.items.length },
        failedUrls: [...failed],
      })
    }
  })
  await Promise.all(workers)

  if (token.cancelled) {
    await finishJob(job.id, { status: 'cancelled' })
    return
  }
  if (!entries.length) {
    await finishJob(job.id, {
      status: 'error',
      error: 'No images could be fetched for the ZIP.',
      failedUrls: failed,
    })
    return
  }

  const zipBytes = buildImagesZip(entries, message.filenameTemplate)
  const zipName =
    message.zipFileName?.trim() ||
    `images-${new Date().toISOString().slice(0, 10)}.zip`
  const zipPath = buildDownloadPath(message.subfolder, zipName, {
    index: 1,
    url: message.pageUrl,
    pageUrl: message.pageUrl,
    pageTitle: message.pageTitle,
    ext: 'zip',
  })

  try {
    await downloadZipBlob(job.id, zipBytes, zipPath)
    await finishJob(job.id, {
      status: 'done',
      progress: { done: entries.length, failed: failed.length, total: message.items.length },
      failedUrls: failed,
    })
  } catch (error) {
    await finishJob(job.id, { status: 'error', error: errorText(error), failedUrls: failed })
  }
}

async function startJob(message: Extract<ExtensionMessage, { type: 'START_IMAGE_DOWNLOAD_JOB' }>) {
  const existing = await readImageDownloadJob()
  if (isImageDownloadJobRunning(existing)) throw new Error('An image download is already in progress.')

  if (!message.items.length) throw new Error('No images selected.')

  const now = Date.now()
  const job: ImageDownloadJob = {
    id: crypto.randomUUID(),
    tabId: message.tabId,
    pageUrl: message.pageUrl,
    mode: message.mode,
    status: 'running',
    progress: { done: 0, failed: 0, total: message.items.length },
    failedUrls: [],
    startedAt: now,
    updatedAt: now,
  }
  await updateJob(() => job)

  const token = { cancelled: false }
  cancelToken = token

  try {
    if (message.mode === 'zip') await runZipJob(job, message, token)
    else await runFilesJob(job, message, token)
  } catch (error) {
    await finishJob(job.id, { status: 'error', error: errorText(error) })
    throw error
  } finally {
    if (cancelToken === token) cancelToken = null
  }

  return { jobId: job.id }
}

export function registerImageDownloadJobHandlers() {
  registerMessageHandler('START_IMAGE_DOWNLOAD_JOB', (message) => {
    if (message.type !== 'START_IMAGE_DOWNLOAD_JOB') return undefined
    return startJob(message)
  })

  registerMessageHandler('CANCEL_IMAGE_DOWNLOAD_JOB', async (message) => {
    if (message.type !== 'CANCEL_IMAGE_DOWNLOAD_JOB') return
    if (cancelToken) cancelToken.cancelled = true
    await finishJob(message.jobId, { status: 'cancelled' })
  })
}
