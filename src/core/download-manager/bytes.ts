export function bytesReceived(item: chrome.downloads.DownloadItem): number {
  const extended = item as chrome.downloads.DownloadItem & { bytesReceived?: number }
  return extended.bytesReceived ?? item.fileSize ?? 0
}

export function totalBytes(item: chrome.downloads.DownloadItem): number | undefined {
  return item.totalBytes ?? undefined
}

export function startTimeMs(item: chrome.downloads.DownloadItem): number {
  if (typeof item.startTime === 'number') return item.startTime
  if (typeof item.startTime === 'string') {
    const parsed = Date.parse(item.startTime)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}
