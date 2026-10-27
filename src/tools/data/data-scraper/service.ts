import {
  TabMessagingError,
  classifyTabUrl,
  ensureContentScriptInTab,
  getActiveWebTab,
} from '@/chrome/contentScriptClient'
import type {
  DetectCandidate,
  ScrapeConfig,
  ScrapeJobState,
  ScrapeRow,
  ScraperPickMode,
} from '@/core/scraper'
import { sendMessage } from '@/core/messaging'
import { requestSiteAccess } from '@/core/permissions/siteAccess'

function friendlyTabError(error: unknown): string {
  if (error instanceof TabMessagingError) {
    switch (error.code) {
      case 'RESTRICTED_PAGE':
        return 'Open a normal website tab, click it once, then run Auto-detect again. (Extension and browser system pages cannot be scraped.)'
      case 'FILE_URL_ACCESS':
        return 'Enable “Allow access to file URLs” for this extension in chrome://extensions, then reload the file page.'
      case 'INJECT_FAILED':
        return `Could not attach to this page: ${error.message}`
      case 'CONTENT_SCRIPT_UNAVAILABLE':
        return 'Could not reach the page script. Reload the tab and try again.'
      case 'NO_TAB':
        return 'No browser tab found. Open a website first.'
      default:
        return error.message
    }
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong talking to the page.'
}

async function tabMessage<T>(tabId: number, message: object): Promise<T> {
  try {
    await ensureContentScriptInTab(tabId)
    const res = (await chrome.tabs.sendMessage(tabId, message)) as {
      ok: boolean
      data?: T
      error?: string
    }
    if (!res?.ok) throw new Error(res?.error ?? 'Page script did not respond. Reload the tab and try again.')
    return res.data as T
  } catch (error) {
    throw new Error(friendlyTabError(error))
  }
}

export async function resolveScraperTab(): Promise<{ tabId: number; url: string }> {
  const tab = await getActiveWebTab()
  if (tab?.id == null) {
    throw new Error('No website tab found. Open the page you want to scrape, click it, then try again.')
  }
  const blocked = classifyTabUrl(tab.url)
  if (blocked) {
    throw new Error(friendlyTabError(new TabMessagingError(blocked)))
  }
  return { tabId: tab.id, url: tab.url ?? '' }
}

export async function detectGrid(tabId: number, candidateIndex = 0) {
  return tabMessage<{
    candidate: DetectCandidate
    candidateIndex: number
    candidateCount: number
  }>(tabId, { type: 'SCRAPER_DETECT', candidateIndex })
}

export async function extractRows(tabId: number, config: ScrapeConfig) {
  return tabMessage<{ rows: ScrapeRow[] }>(tabId, { type: 'SCRAPER_EXTRACT', config })
}

export async function suggestNext(tabId: number) {
  return tabMessage<{ selector?: string }>(tabId, { type: 'SCRAPER_SUGGEST_NEXT' })
}

export async function startPick(tabId: number, mode: ScraperPickMode, rowSelector?: string) {
  return tabMessage<{ active: boolean }>(tabId, {
    type: 'SCRAPER_PICK_START',
    mode,
    rowSelector,
  })
}

export async function cancelPick(tabId: number) {
  return tabMessage<{ active: boolean }>(tabId, { type: 'SCRAPER_PICK_CANCEL' })
}

export async function clearHighlights(tabId: number) {
  return tabMessage(tabId, { type: 'SCRAPER_CLEAR' })
}

export async function startJob(tabId: number, config: ScrapeConfig, rows: ScrapeRow[]) {
  // activeTab can end when pagination navigates the tab, so keep access to the site for the whole run.
  const tab = await chrome.tabs.get(tabId).catch(() => undefined)
  await requestSiteAccess(tab?.url)
  return sendMessage({ type: 'SCRAPER_JOB_START', tabId, config, rows })
}

export async function stopJob(tabId: number) {
  return sendMessage({ type: 'SCRAPER_JOB_STOP', tabId })
}

export async function getJob(tabId: number): Promise<ScrapeJobState | { phase: 'idle' }> {
  const data = await sendMessage<ScrapeJobState | { phase: 'idle' }>({ type: 'SCRAPER_JOB_GET', tabId })
  return data ?? { phase: 'idle' }
}
