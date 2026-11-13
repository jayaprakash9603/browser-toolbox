import { bytesReceived, totalBytes } from './bytes'
import type { DownloadUiStatus } from './types'

export function mapChromeDownloadStatus(item: chrome.downloads.DownloadItem): DownloadUiStatus {
  if (item.state === 'complete') return 'completed'
  if (item.state === 'interrupted') {
    if (item.error?.includes('USER_CANCELED') || item.error?.includes('USER_CANCELLED')) return 'cancelled'
    return item.error ? 'failed' : 'interrupted'
  }
  if (item.state === 'in_progress') return item.paused ? 'paused' : 'in_progress'
  return 'unknown'
}

export function progressPercent(item: chrome.downloads.DownloadItem): number | null {
  const total = totalBytes(item)
  const received = bytesReceived(item)
  if (total && total > 0) {
    return Math.min(100, Math.round((received / total) * 100))
  }
  if (item.state === 'complete') return 100
  return null
}
