import { ensureContentScriptInTab, getActiveBrowserTab } from '@/chrome/contentScriptClient'
import type { ExtensionResponse } from '@/core/messaging/types'

export async function sendToActiveTab<T>(message: Record<string, unknown>): Promise<T | null> {
  const tab = await getActiveBrowserTab()
  if (tab?.id == null) return null
  try {
    await ensureContentScriptInTab(tab.id)
    const response = (await chrome.tabs.sendMessage(tab.id, message)) as ExtensionResponse<T>
    if (response?.ok) return response.data
    return null
  } catch {
    return null
  }
}

export async function getActiveTabId(): Promise<number | null> {
  const tab = await getActiveBrowserTab()
  return tab?.id ?? null
}
