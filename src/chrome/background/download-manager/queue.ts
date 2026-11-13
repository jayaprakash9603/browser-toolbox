import { randomId } from '@/core/download-manager'
import {
  getDownloadManagerState,
  setDownloadManagerState,
  setQueueItems,
  type QueueItem,
} from '@/core/download-manager'
import { createLogger } from '@/core/logging'

import { startDownload } from './control'
import { notifyQueueCompleted, notifyDownloadFailed, notifyDownloadStarted } from './notifications'
import { refreshLiveSnapshot } from './live'

const logger = createLogger('download-manager-queue')

let runnerBusy = false
let runnerToken = 0

export function createQueueItem(partial: Omit<QueueItem, 'id' | 'status' | 'priority' | 'addedAt' | 'attempts'>): QueueItem {
  return {
    id: randomId(),
    status: 'pending',
    priority: 0,
    addedAt: Date.now(),
    attempts: 0,
    ...partial,
  }
}

export async function enqueueUrls(
  items: { url: string; filename?: string; referrer?: string; pageUrl?: string; pageTitle?: string }[],
): Promise<QueueItem[]> {
  const state = await getDownloadManagerState()
  const created = items.map((item) =>
    createQueueItem({
      url: item.url,
      filename: item.filename,
      referrer: item.referrer,
      pageUrl: item.pageUrl,
      pageTitle: item.pageTitle,
    }),
  )
  state.queue = [...state.queue, ...created]
  await setDownloadManagerState(state)
  void pumpQueue()
  return created
}

export async function reorderQueue(ids: string[]): Promise<void> {
  const state = await getDownloadManagerState()
  const byId = new Map(state.queue.map((q) => [q.id, q]))
  const next: QueueItem[] = []
  for (const id of ids) {
    const item = byId.get(id)
    if (item) next.push(item)
  }
  for (const item of state.queue) {
    if (!ids.includes(item.id)) next.push(item)
  }
  await setQueueItems(next)
}

export async function removeQueueItem(id: string): Promise<void> {
  const state = await getDownloadManagerState()
  state.queue = state.queue.filter((q) => q.id !== id)
  await setDownloadManagerState(state)
}

export async function clearQueue(doneOnly = false): Promise<void> {
  const state = await getDownloadManagerState()
  state.queue = doneOnly
    ? state.queue.filter((q) => q.status !== 'done' && q.status !== 'cancelled')
    : []
  await setDownloadManagerState(state)
}

async function inFlightCount(): Promise<number> {
  const active = await chrome.downloads.search({ state: 'in_progress', limit: 1000 })
  return active.filter((d) => !d.paused).length
}

async function pumpQueue(): Promise<void> {
  const token = ++runnerToken
  if (runnerBusy) return
  runnerBusy = true
  try {
    while (token === runnerToken) {
      const state = await getDownloadManagerState()
      const { settings, queue } = state
      const pending = queue
        .filter((q) => q.status === 'pending')
        .sort((a, b) => b.priority - a.priority || a.addedAt - b.addedAt)
      if (pending.length === 0) break

      const inflight = await inFlightCount()
      const slots =
        settings.queueMode === 'sequential' ? Math.max(0, 1 - inflight) : Math.max(0, settings.maxConcurrent - inflight)
      if (slots <= 0) break

      const batch = pending.slice(0, slots)
      for (const item of batch) {
        item.status = 'starting'
        item.attempts += 1
        try {
          const downloadId = await startDownload({
            url: item.url,
            filename: item.filename,
            referrer: item.referrer,
            queueItemId: item.id,
          })
          item.downloadId = downloadId
          item.status = 'downloading'
          void notifyDownloadStarted(item.url)
        } catch (error) {
          item.status = 'failed'
          item.lastError = error instanceof Error ? error.message : String(error)
          logger.warn('queue start failed', item.url, error)
          void notifyDownloadFailed(item.url, item.lastError)
          if (item.attempts <= settings.maxRetries) {
            item.status = 'pending'
          }
        }
        if (settings.delayBetweenMs > 0) {
          await new Promise((r) => setTimeout(r, settings.delayBetweenMs))
        }
      }
      await setQueueItems(queue)
      void refreshLiveSnapshot()
      if (settings.queueMode === 'sequential') break
    }
    const state = await getDownloadManagerState()
    const remaining = state.queue.some((q) => q.status === 'pending' || q.status === 'downloading')
    if (!remaining && state.queue.length > 0) {
      void notifyQueueCompleted()
    }
  } finally {
    runnerBusy = false
  }
}

export async function onDownloadFinished(downloadId: number, ok: boolean): Promise<void> {
  const state = await getDownloadManagerState()
  const item = state.queue.find((q) => q.downloadId === downloadId)
  if (!item) return
  item.status = ok ? 'done' : 'failed'
  await setQueueItems(state.queue)
  void pumpQueue()
}

export function kickQueue(): void {
  void pumpQueue()
}
