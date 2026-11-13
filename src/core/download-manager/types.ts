export type DownloadUiStatus =
  | 'queued'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'interrupted'
  | 'cancelled'
  | 'failed'
  | 'unknown'

export type FileCategory =
  | 'images'
  | 'videos'
  | 'audio'
  | 'documents'
  | 'pdfs'
  | 'archives'
  | 'applications'
  | 'executables'
  | 'development'
  | 'fonts'
  | 'other'

export type DuplicatePolicy = 'skip' | 'download' | 'uniquify'

export type QueueMode = 'sequential' | 'concurrent'

export type FilenamePattern =
  | 'original'
  | 'host-name'
  | 'date-name'
  | 'host-date-name'
  | 'custom'

export type DownloadManagerTab =
  | 'downloads'
  | 'queue'
  | 'bulk'
  | 'sniffer'
  | 'images'
  | 'media'
  | 'history'
  | 'settings'

export interface DownloadSpeedSample {
  bytes: number
  at: number
}

export interface ManagedDownloadMeta {
  downloadId: number
  managed: boolean
  queueItemId?: string
  samples: DownloadSpeedSample[]
  lastBytes?: number
}

export interface QueueItem {
  id: string
  url: string
  filename?: string
  referrer?: string
  pageUrl?: string
  pageTitle?: string
  mimeHint?: string
  status: 'pending' | 'starting' | 'downloading' | 'done' | 'failed' | 'cancelled'
  downloadId?: number
  priority: number
  addedAt: number
  attempts: number
  lastError?: string
}

export interface ScheduledJob {
  id: string
  queueItemIds: string[]
  startAt: number
  enabled: boolean
  mode: QueueMode
  createdAt: number
}

export interface DownloadManagerSettings {
  enabled: boolean
  confirmBeforeDownload: boolean
  notifyStarted: boolean
  notifyCompleted: boolean
  notifyFailed: boolean
  notifyQueueDone: boolean
  autoOrganize: boolean
  organizeAllBrowserDownloads: boolean
  filenamePattern: FilenamePattern
  customFilenameTemplate: string
  categorySubfolders: boolean
  duplicatePolicy: DuplicatePolicy
  queueMode: QueueMode
  maxConcurrent: number
  delayBetweenMs: number
  maxRetries: number
  snifferMinImageWidth: number
  snifferMinImageHeight: number
  snifferExcludeSmallIcons: boolean
  snifferIncludeBackgroundImages: boolean
  snifferScanFrames: boolean
  listDensity: 'list' | 'compact'
}

export interface DownloadManagerState {
  settings: DownloadManagerSettings
  queue: QueueItem[]
  schedules: ScheduledJob[]
  managed: Record<string, ManagedDownloadMeta>
}

export interface DownloadableResource {
  url: string
  label: string
  ext: string | null
  mime: string | null
  category: FileCategory
  domain: string
  width?: number
  height?: number
  downloadable: boolean
  reason?: string
  source: 'link' | 'image' | 'media' | 'import' | 'manual'
}

export interface DownloadableScanResult {
  url: string
  title: string
  resources: DownloadableResource[]
  truncated: boolean
}

export interface DownloadLiveSnapshot {
  items: chrome.downloads.DownloadItem[]
  stats: {
    total: number
    active: number
    completed: number
    failed: number
    bytesCompleted: number
    aggregateSpeedBps: number
  }
  speeds: Record<number, { bps: number; etaMs: number | null }>
  updatedAt: number
}

export const DOWNLOAD_MANAGER_SESSION_KEY = 'downloadManagerLive'
export const DOWNLOAD_ALARM_PREFIX = 'dm-schedule:'
export const DOWNLOAD_MANAGER_ROUTE = '/tools/browser/download-manager'
