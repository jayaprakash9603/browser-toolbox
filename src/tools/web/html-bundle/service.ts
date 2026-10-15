import type { BuildHtmlBundleResult, ScanHtmlBundleResult } from '@/chrome/content/htmlBundle'
import {
  TabMessagingError,
  classifyTabUrl,
  ensureContentScriptInTab,
  getActiveBrowserTab,
  isFileUrlTab,
  pingContentScript,
} from '@/chrome/contentScriptClient'
import { base64ToBytes } from '@/core/engines/htmlArchive'
import type { ExtensionResponse } from '@/core/messaging/types'

async function resolveTargetTab(tabId?: number): Promise<chrome.tabs.Tab> {
  if (tabId != null) {
    try {
      const tab = await chrome.tabs.get(tabId)
      if (tab?.id != null) return tab
    } catch {
      /* stale id */
    }
  }
  const tab = await getActiveBrowserTab()
  if (tab?.id == null) throw new TabMessagingError('NO_TAB')
  return tab
}

function assertTabReady(tab: chrome.tabs.Tab): void {
  const restriction = classifyTabUrl(tab.url)
  if (restriction) throw new TabMessagingError(restriction)
}

async function sendMessage<T>(payload: object, tabId?: number): Promise<T> {
  const tab = await resolveTargetTab(tabId)
  assertTabReady(tab)

  try {
    await ensureContentScriptInTab(tab.id!)
  } catch (error: unknown) {
    if (error instanceof TabMessagingError && isFileUrlTab(tab.url)) {
      if (error.code === 'INJECT_FAILED' || error.code === 'CONTENT_SCRIPT_UNAVAILABLE') {
        throw new TabMessagingError('FILE_URL_ACCESS', error.message)
      }
    }
    throw error
  }

  let response: ExtensionResponse<T>
  try {
    response = (await chrome.tabs.sendMessage(tab.id!, payload)) as ExtensionResponse<T>
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error)
    if (
      detail.includes('Receiving end does not exist') ||
      detail.includes('Could not establish connection') ||
      detail.includes('message port closed') ||
      detail.includes('Message length exceeded')
    ) {
      if (isFileUrlTab(tab.url)) throw new TabMessagingError('FILE_URL_ACCESS', detail)
      throw new TabMessagingError('CONTENT_SCRIPT_UNAVAILABLE', detail)
    }
    throw error
  }

  if (response && typeof response === 'object' && 'ok' in response) {
    if (!response.ok) throw new Error(response.error)
    return response.data
  }
  return response as T
}

export async function scanHtmlBundle(
  options: {
    htmlOnly: boolean
    sameFolderOnly: boolean
  },
  tabId?: number,
): Promise<ScanHtmlBundleResult> {
  return sendMessage<ScanHtmlBundleResult>(
    {
      type: 'SCAN_HTML_BUNDLE',
      htmlOnly: options.htmlOnly,
      sameFolderOnly: options.sameFolderOnly,
    },
    tabId,
  )
}

export async function buildHtmlBundle(
  request: {
    includeCurrent: boolean
    selectedResolvedUrls: string[]
    includeAssets: boolean
  },
  options?: { tabId?: number },
): Promise<BuildHtmlBundleResult> {
  const data = await sendMessage<{ zipBase64: string; stats: BuildHtmlBundleResult['stats'] }>(
    { type: 'BUILD_HTML_BUNDLE', ...request },
    options?.tabId,
  )
  return { zipBytes: base64ToBytes(data.zipBase64), stats: data.stats }
}

export async function getActivePageMeta(): Promise<{ url: string; title: string; tabId?: number }> {
  const tab = await getActiveBrowserTab()
  return {
    url: tab?.url ?? '',
    title: tab?.title ?? '',
    tabId: tab?.id,
  }
}

export async function isActiveTabContentScriptReady(tabId?: number): Promise<boolean> {
  const tab = await resolveTargetTab(tabId).catch(() => undefined)
  if (!tab?.id || classifyTabUrl(tab.url)) return false
  if (await pingContentScript(tab.id)) return true
  if (isFileUrlTab(tab.url)) return false
  try {
    await ensureContentScriptInTab(tab.id)
    return true
  } catch {
    return false
  }
}

export function shouldUseFolderBuild(pageUrl: string): boolean {
  return isFileUrlTab(pageUrl)
}

// Saved from the extension page (a secure origin) rather than the report tab, so Chrome
// does not flag the ZIP as an insecure download when the report is served over http://.
export function downloadZip(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export { TabMessagingError }
