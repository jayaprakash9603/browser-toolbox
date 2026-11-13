import {
  DOWNLOAD_MANAGER_SESSION_KEY,
  bytesReceived,
  computeSpeedBps,
  etaMs,
  pushSpeedSample,
  totalBytes,
  type DownloadLiveSnapshot,
  type ManagedDownloadMeta,
} from '@/core/download-manager'
import { createLogger } from '@/core/logging'

const logger = createLogger('download-manager-live')

const managedById = new Map<number, ManagedDownloadMeta>()

export function markManaged(downloadId: number, queueItemId?: string): void {
  managedById.set(downloadId, {
    downloadId,
    managed: true,
    queueItemId,
    samples: [],
  })
}

export function isManagedDownload(downloadId: number): boolean {
  return managedById.get(downloadId)?.managed === true
}

function activeCount(items: chrome.downloads.DownloadItem[]): number {
  return items.filter((i) => i.state === 'in_progress' && !i.paused).length
}

function failedCount(items: chrome.downloads.DownloadItem[]): number {
  return items.filter((i) => i.state === 'interrupted' && i.error && !i.error.includes('USER_CANCEL')).length
}

export async function refreshLiveSnapshot(): Promise<DownloadLiveSnapshot> {
  const items = await chrome.downloads.search({ orderBy: ['-startTime'], limit: 500 })
  const speeds: DownloadLiveSnapshot['speeds'] = {}
  let aggregateSpeedBps = 0
  let bytesCompleted = 0

  for (const item of items) {
    if (item.state === 'complete' && item.fileSize) bytesCompleted += item.fileSize
    if (item.state !== 'in_progress' || item.paused) continue
    const meta = managedById.get(item.id) ?? {
      downloadId: item.id,
      managed: false,
      samples: [],
    }
    const received = bytesReceived(item)
    const samples = pushSpeedSample(meta.samples, received)
    meta.samples = samples
    meta.lastBytes = received
    managedById.set(item.id, meta)
    const bps = computeSpeedBps(samples)
    speeds[item.id] = {
      bps,
      etaMs: etaMs(received, totalBytes(item), bps),
    }
    aggregateSpeedBps += bps
  }

  const snapshot: DownloadLiveSnapshot = {
    items,
    stats: {
      total: items.length,
      active: activeCount(items),
      completed: items.filter((i) => i.state === 'complete').length,
      failed: failedCount(items),
      bytesCompleted,
      aggregateSpeedBps,
    },
    speeds,
    updatedAt: Date.now(),
  }

  try {
    await chrome.storage.session.set({ [DOWNLOAD_MANAGER_SESSION_KEY]: snapshot })
  } catch (error) {
    logger.warn('session snapshot failed', error)
  }
  return snapshot
}

export async function noteSpeedOnDelta(delta: chrome.downloads.DownloadDelta): Promise<void> {
  const [item] = await chrome.downloads.search({ id: delta.id })
  if (!item) return
  const meta = managedById.get(delta.id) ?? { downloadId: delta.id, managed: false, samples: [] }
  meta.samples = pushSpeedSample(meta.samples, bytesReceived(item))
  managedById.set(delta.id, meta)
}
