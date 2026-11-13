import {
  classifyTabUrl,
  ensureContentScriptInTab,
  getActiveBrowserTab,
  TabMessagingError,
} from '@/chrome/contentScriptClient'
import { sendMessage } from '@/core/messaging'
import type { DownloadableScanResult } from '@/core/download-manager'
import type { ExtensionResponse } from '@/core/messaging/types'

export { TabMessagingError }

export async function scanDownloadableFromActiveTab(options?: {
  includeImages?: boolean
  includeMedia?: boolean
}): Promise<DownloadableScanResult> {
  const tab = await getActiveBrowserTab()
  if (!tab?.id) throw new TabMessagingError('NO_TAB')
  const restricted = classifyTabUrl(tab.url)
  if (restricted) throw new TabMessagingError(restricted)
  await ensureContentScriptInTab(tab.id)
  const response = (await chrome.tabs.sendMessage(tab.id, {
    type: 'SCAN_DOWNLOADABLE_RESOURCES',
    includeImages: options?.includeImages,
    includeMedia: options?.includeMedia,
  })) as ExtensionResponse<DownloadableScanResult>
  if (!response?.ok) throw new Error(response?.error ?? 'Scan failed')
  return response.data ?? { url: '', title: '', resources: [], truncated: false }
}

export async function controlDownloads(
  action: 'pause' | 'resume' | 'cancel' | 'erase' | 'removeFile' | 'show' | 'open' | 'retry',
  ids: number[],
): Promise<void> {
  await sendMessage({ type: 'DOWNLOAD_MANAGER_CONTROL', action, ids })
}

export async function startUrlDownload(url: string, filename?: string, saveAs?: boolean): Promise<number> {
  const data = await sendMessage<{ downloadId: number }>({
    type: 'DOWNLOAD_MANAGER_START',
    url,
    filename,
    saveAs,
  })
  if (!data?.downloadId) throw new Error('Download could not be started.')
  return data.downloadId
}

export async function enqueueDownloads(
  items: { url: string; filename?: string; referrer?: string; pageUrl?: string; pageTitle?: string }[],
) {
  return sendMessage({ type: 'DOWNLOAD_MANAGER_ENQUEUE', items })
}

export async function requestDownloadsOpenPermission(): Promise<boolean> {
  if (!chrome.permissions?.request) return Boolean(chrome.downloads?.open)
  try {
    return await chrome.permissions.request({ permissions: ['downloads.open'] })
  } catch {
    return false
  }
}
