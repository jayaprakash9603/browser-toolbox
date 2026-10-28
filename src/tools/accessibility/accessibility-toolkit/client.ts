import { classifyTabUrl, getActiveBrowserTab, isFileUrlTab } from '@/chrome/contentScriptClient'
import type { A11yAuditOptions, A11yPageScan } from '@/core/engines/a11y'
import type { PageLoadResult } from '@/tools/seo/pageDataClient'

import { auditPage } from './inPage/audit'
import {
  DEFAULT_AIDS,
  applyPageAids,
  clearPageHighlight,
  highlightOnPage,
  type A11yAidCounts,
  type A11yAidState,
  type HighlightTarget,
  type HighlightTone,
} from './inPage/aids'

async function runInTab<Args extends unknown[], Result>(
  tabId: number,
  func: (...args: Args) => Result,
  args: Args,
): Promise<Result | undefined> {
  const [first] = await chrome.scripting.executeScript({ target: { tabId }, func, args })
  return first?.result as Result | undefined
}

export async function scanActiveTab(options: A11yAuditOptions): Promise<PageLoadResult<A11yPageScan>> {
  const tab = await getActiveBrowserTab()
  if (tab?.id == null) return { ok: false, code: 'NO_TAB' }
  const restriction = classifyTabUrl(tab.url)
  if (restriction) return { ok: false, code: restriction }
  try {
    const scan = await runInTab(tab.id, auditPage, [options])
    if (!scan) return { ok: false, code: 'CONTENT_SCRIPT_UNAVAILABLE' }
    return { ok: true, data: scan, tabId: tab.id, tabUrl: tab.url ?? '' }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, code: isFileUrlTab(tab.url) ? 'FILE_URL_ACCESS' : 'INJECT_FAILED', message }
  }
}

export async function locateOnPage(
  tabId: number,
  targets: HighlightTarget[],
  tone: HighlightTone,
  scroll = true,
): Promise<number> {
  try {
    return (await runInTab(tabId, highlightOnPage, [targets, tone, scroll])) ?? 0
  } catch {
    return 0
  }
}

export async function clearLocate(tabId: number): Promise<void> {
  await runInTab(tabId, clearPageHighlight, []).catch(() => undefined)
}

export async function setPageAids(tabId: number, state: A11yAidState): Promise<A11yAidCounts | null> {
  try {
    return (await runInTab(tabId, applyPageAids, [state])) ?? null
  } catch {
    return null
  }
}

export async function resetPage(tabId: number): Promise<void> {
  await Promise.allSettled([setPageAids(tabId, DEFAULT_AIDS), clearLocate(tabId)])
}
