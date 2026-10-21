import { ensureContentScriptInTab, getActiveBrowserTab } from '@/chrome/contentScriptClient'
import type {
  DetectCandidate,
  ScrapeConfig,
  ScrapeJobState,
  ScrapeRow,
  ScraperPickMode,
} from '@/core/scraper'
import { sendMessage } from '@/core/messaging'

async function tabMessage<T>(tabId: number, message: object): Promise<T> {
  await ensureContentScriptInTab(tabId)
  const res = (await chrome.tabs.sendMessage(tabId, message)) as {
    ok: boolean
    data?: T
    error?: string
  }
  if (!res?.ok) throw new Error(res?.error ?? 'Page script unavailable.')
  return res.data as T
}

export async function resolveScraperTab(): Promise<{ tabId: number; url: string }> {
  const tab = await getActiveBrowserTab()
  if (tab?.id == null) throw new Error('No active tab.')
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
  return sendMessage({ type: 'SCRAPER_JOB_START', tabId, config, rows })
}

export async function stopJob(tabId: number) {
  return sendMessage({ type: 'SCRAPER_JOB_STOP', tabId })
}

export async function getJob(tabId: number): Promise<ScrapeJobState | { phase: 'idle' }> {
  const data = await sendMessage<ScrapeJobState | { phase: 'idle' }>({ type: 'SCRAPER_JOB_GET', tabId })
  return data ?? { phase: 'idle' }
}
