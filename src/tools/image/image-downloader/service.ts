import {
  classifyTabUrl,
  ensureContentScriptInTab,
  getActiveBrowserTab,
  TabMessagingError,
} from '@/chrome/contentScriptClient'
import type { PageImage } from '@/core/engines/imageDownloader'
import { sendMessage } from '@/core/messaging/messageService'
import type { ExtensionResponse } from '@/core/messaging/types'

export { TabMessagingError }

export async function scanPageImagesFromTab(): Promise<{ images: PageImage[]; tab: chrome.tabs.Tab }> {
  const tab = await getActiveBrowserTab()
  if (!tab?.id) throw new TabMessagingError('NO_TAB')
  const restricted = classifyTabUrl(tab.url)
  if (restricted) throw new TabMessagingError(restricted)
  await ensureContentScriptInTab(tab.id)
  const response = (await chrome.tabs.sendMessage(tab.id, {
    type: 'SCAN_PAGE_IMAGES',
  })) as ExtensionResponse<PageImage[]>
  if (!response?.ok) throw new Error(response?.error ?? 'Scan failed')
  return { images: response.data ?? [], tab }
}

export async function startImageDownloadJob(input: {
  tabId: number
  pageUrl: string
  pageTitle: string
  mode: 'files' | 'zip'
  subfolder: string
  filenameTemplate: string
  zipFileName?: string
  items: { url: string }[]
}): Promise<{ jobId: string }> {
  const data = await sendMessage<{ jobId: string }>({
    type: 'START_IMAGE_DOWNLOAD_JOB',
    ...input,
  })
  if (!data?.jobId) throw new Error('Could not start download job.')
  return data
}

export async function cancelImageDownloadJob(jobId: string): Promise<void> {
  await sendMessage({ type: 'CANCEL_IMAGE_DOWNLOAD_JOB', jobId })
}
