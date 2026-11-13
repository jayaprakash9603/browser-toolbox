import { downloadWithName } from '../downloadNames'
import { isDownloadableUrl } from '@/core/download-manager'
import { markManaged } from './live'

export async function startDownload(options: {
  url: string
  filename?: string
  saveAs?: boolean
  referrer?: string
  queueItemId?: string
}): Promise<number> {
  const url = options.url.trim()
  if (!isDownloadableUrl(url)) throw new Error('URL is not allowed for download.')
  const conflictAction = 'uniquify' as chrome.downloads.FilenameConflictAction
  const downloadId = options.filename
    ? await downloadWithName({
        url,
        filename: options.filename,
        saveAs: options.saveAs ?? false,
        conflictAction,
      })
    : await chrome.downloads.download({
        url,
        saveAs: options.saveAs ?? false,
        conflictAction,
      })
  markManaged(downloadId, options.queueItemId)
  return downloadId
}

export async function pauseDownload(id: number): Promise<void> {
  await chrome.downloads.pause(id)
}

export async function resumeDownload(id: number): Promise<void> {
  await chrome.downloads.resume(id)
}

export async function cancelDownload(id: number): Promise<void> {
  await chrome.downloads.cancel(id)
}

export async function eraseDownload(id: number): Promise<void> {
  await chrome.downloads.erase({ id })
}

export async function removeDownloadFile(id: number): Promise<void> {
  if (!chrome.downloads.removeFile) throw new Error('removeFile is not available.')
  await chrome.downloads.removeFile(id)
}

export async function showDownload(id: number): Promise<void> {
  if (!chrome.downloads.show) throw new Error('show is not available on this browser.')
  const show = chrome.downloads.show as (id: number) => Promise<void>
  await show(id)
}

export async function openDownload(id: number): Promise<void> {
  if (!chrome.downloads.open) throw new Error('Open file requires the downloads.open permission.')
  await chrome.downloads.open(id)
}

export async function searchDownloads(query: chrome.downloads.DownloadQuery = {}): Promise<chrome.downloads.DownloadItem[]> {
  return chrome.downloads.search({ orderBy: ['-startTime'], limit: 500, ...query })
}
