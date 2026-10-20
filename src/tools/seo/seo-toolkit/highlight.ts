import type { SeoHighlightKind } from '@/core/engines/seo/types'
import {
  ensureContentScriptInTab,
  getActiveBrowserTab,
  classifyTabUrl,
} from '@/chrome/contentScriptClient'
import type { ExtensionResponse } from '@/core/messaging/types'

export async function highlightOnPage(kind: SeoHighlightKind): Promise<number> {
  const tab = await getActiveBrowserTab()
  if (tab?.id == null || classifyTabUrl(tab.url)) return 0
  await ensureContentScriptInTab(tab.id)
  const response = (await chrome.tabs.sendMessage(tab.id, {
    type: 'SEO_HIGHLIGHT',
    kind,
  })) as ExtensionResponse<{ count: number }>
  return response?.ok ? response.data.count : 0
}

export async function clearHighlightOnPage(): Promise<void> {
  const tab = await getActiveBrowserTab()
  if (tab?.id == null) return
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'SEO_CLEAR_HIGHLIGHT' })
  } catch {
    /* tab closed */
  }
}
