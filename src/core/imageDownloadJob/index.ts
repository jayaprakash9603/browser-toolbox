export type ImageDownloadJobStatus = 'running' | 'done' | 'error' | 'cancelled'

export interface ImageDownloadProgress {
  done: number
  failed: number
  total: number
}

export interface ImageDownloadJob {
  id: string
  tabId: number
  pageUrl: string
  mode: 'files' | 'zip'
  status: ImageDownloadJobStatus
  progress: ImageDownloadProgress
  failedUrls: string[]
  startedAt: number
  updatedAt: number
  finishedAt?: number
  error?: string
}

export const IMAGE_DOWNLOAD_JOB_KEY = 'imageDownload.job'
export const STALE_AFTER_MS = 10 * 60 * 1000

export function isImageDownloadJobRunning(job: ImageDownloadJob | null, now = Date.now()): boolean {
  return job?.status === 'running' && now - job.updatedAt < STALE_AFTER_MS
}

export async function readImageDownloadJob(): Promise<ImageDownloadJob | null> {
  if (!chrome.storage?.session) return null
  const stored = await chrome.storage.session.get(IMAGE_DOWNLOAD_JOB_KEY)
  return (stored[IMAGE_DOWNLOAD_JOB_KEY] as ImageDownloadJob | undefined) ?? null
}

export async function clearImageDownloadJob(): Promise<void> {
  await chrome.storage.session?.remove(IMAGE_DOWNLOAD_JOB_KEY)
}
