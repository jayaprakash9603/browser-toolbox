import type { ScanHtmlBundleResult } from '@/chrome/content/htmlBundle'
import {
  TabMessagingError,
  classifyTabUrl,
  ensureContentScriptInTab,
  getActiveBrowserTab,
  isFileUrlTab,
  pingContentScript,
} from '@/chrome/contentScriptClient'
import { DEFAULT_MAX_PAGES, MAX_PAGES_CEILING } from '@/core/engines/htmlArchive'
import type { HtmlBundleJobRequest } from '@/core/htmlBundleJob'
import type { ExtensionMessage, ExtensionResponse } from '@/core/messaging/types'
import { requestAllSitesAccess } from '@/core/permissions/siteAccess'

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

async function prepareTab(tab: chrome.tabs.Tab): Promise<void> {
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
}

async function sendMessage<T>(payload: object, tabId?: number): Promise<T> {
  const tab = await resolveTargetTab(tabId)
  await prepareTab(tab)

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

async function sendToBackground<T>(message: ExtensionMessage): Promise<T> {
  const response = (await chrome.runtime.sendMessage(message)) as ExtensionResponse<T> | undefined
  if (!response) throw new Error('The extension background is not responding. Reload the extension.')
  if (!response.ok) throw new Error(response.error)
  return response.data
}

export async function startHtmlBundleJob(input: {
  tabId?: number
  pageUrl: string
  pageTitle: string
  fileName: string
  pageCount: number
  request: HtmlBundleJobRequest
}): Promise<string> {
  // Stylesheets, fonts and images are often on other origins than the page itself.
  await requestAllSitesAccess()
  const tab = await resolveTargetTab(input.tabId)
  await prepareTab(tab)
  const { jobId } = await sendToBackground<{ jobId: string }>({
    type: 'START_HTML_BUNDLE_JOB',
    tabId: tab.id!,
    pageUrl: input.pageUrl,
    pageTitle: input.pageTitle,
    fileName: input.fileName,
    pageCount: input.pageCount,
    request: input.request,
  })
  return jobId
}

export async function cancelHtmlBundleJob(jobId: string): Promise<void> {
  await sendToBackground({ type: 'CANCEL_HTML_BUNDLE_JOB', jobId })
}

const PAGE_LIMIT_KEY = 'htmlBundle.maxPages'

export function clampPageLimit(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MAX_PAGES
  return Math.min(MAX_PAGES_CEILING, Math.max(1, Math.round(value)))
}

export async function loadPageLimit(): Promise<number> {
  const stored = await chrome.storage.local.get(PAGE_LIMIT_KEY)
  const value = stored[PAGE_LIMIT_KEY]
  return typeof value === 'number' ? clampPageLimit(value) : DEFAULT_MAX_PAGES
}

export async function savePageLimit(value: number): Promise<void> {
  await chrome.storage.local.set({ [PAGE_LIMIT_KEY]: clampPageLimit(value) })
}

export async function getActivePageMeta(): Promise<{ url: string; title: string; tabId?: number }> {
  const tab = await getActiveBrowserTab()
  return {
    url: tab?.url ?? '',
    title: tab?.title ?? '',
    tabId: tab?.id,
  }
}

/** Reads `document.title` from the report tab (more accurate than `tab.title` for file:// reports). */
export async function getDocumentTitleFromTab(tabId?: number): Promise<string> {
  const info = await sendMessage<{ title: string }>({ type: 'GET_PAGE_INFO' }, tabId)
  return info.title?.trim() ?? ''
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
