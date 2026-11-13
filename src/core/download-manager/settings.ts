import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage/storageService'

import type { DownloadManagerSettings, DownloadManagerState, QueueItem, ScheduledJob } from './types'

export const DEFAULT_DOWNLOAD_MANAGER_SETTINGS: DownloadManagerSettings = {
  enabled: true,
  confirmBeforeDownload: false,
  notifyStarted: false,
  notifyCompleted: true,
  notifyFailed: true,
  notifyQueueDone: true,
  autoOrganize: true,
  organizeAllBrowserDownloads: false,
  filenamePattern: 'original',
  customFilenameTemplate: '{host}-{name}.{ext}',
  categorySubfolders: true,
  duplicatePolicy: 'uniquify',
  queueMode: 'concurrent',
  maxConcurrent: 3,
  delayBetweenMs: 0,
  maxRetries: 2,
  snifferMinImageWidth: 64,
  snifferMinImageHeight: 64,
  snifferExcludeSmallIcons: true,
  snifferIncludeBackgroundImages: true,
  snifferScanFrames: true,
  listDensity: 'list',
}

export function normalizeDownloadManagerState(raw: Partial<DownloadManagerState> | undefined): DownloadManagerState {
  return {
    settings: { ...DEFAULT_DOWNLOAD_MANAGER_SETTINGS, ...raw?.settings },
    queue: Array.isArray(raw?.queue) ? raw!.queue : [],
    schedules: Array.isArray(raw?.schedules) ? raw!.schedules : [],
    managed: raw?.managed && typeof raw.managed === 'object' ? raw.managed : {},
  }
}

export async function getDownloadManagerState(): Promise<DownloadManagerState> {
  const raw = await get<Partial<DownloadManagerState>>(STORAGE_KEYS.downloadManager)
  return normalizeDownloadManagerState(raw)
}

export async function setDownloadManagerState(state: DownloadManagerState): Promise<void> {
  await set(STORAGE_KEYS.downloadManager, state)
}

export async function patchDownloadManagerSettings(
  patch: Partial<DownloadManagerSettings>,
): Promise<DownloadManagerSettings> {
  const state = await getDownloadManagerState()
  state.settings = { ...state.settings, ...patch }
  await setDownloadManagerState(state)
  return state.settings
}

export async function setQueueItems(queue: QueueItem[]): Promise<QueueItem[]> {
  const state = await getDownloadManagerState()
  state.queue = queue
  await setDownloadManagerState(state)
  return queue
}

export async function setSchedules(schedules: ScheduledJob[]): Promise<ScheduledJob[]> {
  const state = await getDownloadManagerState()
  state.schedules = schedules
  await setDownloadManagerState(state)
  return schedules
}
