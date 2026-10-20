import type { PageInfo } from '@/chrome/content/index'
import type { SeoPageData } from '@/core/engines/seo/types'
import {
  TabMessagingError,
  classifyTabUrl,
  ensureContentScriptInTab,
  getActiveBrowserTab,
  isFileUrlTab,
} from '@/chrome/contentScriptClient'
import type { ExtensionResponse } from '@/core/messaging/types'

export type PageLoadErrorCode = TabMessagingError['code']

export type PageLoadResult<T> =
  | { ok: true; data: T; tabId: number; tabUrl: string }
  | { ok: false; code: PageLoadErrorCode; message?: string }

async function prepareTab(): Promise<chrome.tabs.Tab> {
  const tab = await getActiveBrowserTab()
  if (tab?.id == null) throw new TabMessagingError('NO_TAB')
  const restriction = classifyTabUrl(tab.url)
  if (restriction) throw new TabMessagingError(restriction)
  try {
    await ensureContentScriptInTab(tab.id)
  } catch (error: unknown) {
    if (error instanceof TabMessagingError && isFileUrlTab(tab.url)) {
      if (error.code === 'INJECT_FAILED' || error.code === 'CONTENT_SCRIPT_UNAVAILABLE') {
        throw new TabMessagingError('FILE_URL_ACCESS', error.message)
      }
    }
    throw error
  }
  return tab
}

async function sendToTab<T>(type: string): Promise<T> {
  const tab = await prepareTab()
  const response = (await chrome.tabs.sendMessage(tab.id!, { type })) as ExtensionResponse<T>
  if (!response?.ok) {
    throw new TabMessagingError('CONTENT_SCRIPT_UNAVAILABLE', response?.error)
  }
  return response.data
}

export async function loadPageInfo(): Promise<PageLoadResult<PageInfo>> {
  try {
    const tab = await prepareTab()
    const data = await sendToTab<PageInfo>('GET_PAGE_INFO')
    return { ok: true, data, tabId: tab.id!, tabUrl: tab.url ?? '' }
  } catch (error: unknown) {
    if (error instanceof TabMessagingError) {
      return { ok: false, code: error.code, message: error.message }
    }
    return { ok: false, code: 'CONTENT_SCRIPT_UNAVAILABLE' }
  }
}

export async function loadSeoPageData(): Promise<PageLoadResult<SeoPageData>> {
  try {
    const tab = await prepareTab()
    const data = await sendToTab<SeoPageData>('GET_SEO_DATA')
    return { ok: true, data, tabId: tab.id!, tabUrl: tab.url ?? '' }
  } catch (error: unknown) {
    if (error instanceof TabMessagingError) {
      return { ok: false, code: error.code, message: error.message }
    }
    return { ok: false, code: 'CONTENT_SCRIPT_UNAVAILABLE' }
  }
}

export function pageLoadErrorKey(code: PageLoadErrorCode): string {
  switch (code) {
    case 'NO_TAB':
      return 'seo.errorNoTab'
    case 'RESTRICTED_PAGE':
      return 'seo.errorRestricted'
    case 'FILE_URL_ACCESS':
      return 'seo.errorFileUrl'
    case 'INJECT_FAILED':
      return 'seo.errorInject'
    default:
      return 'seo.noPage'
  }
}
