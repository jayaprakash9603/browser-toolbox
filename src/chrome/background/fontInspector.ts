import { ensureContentScriptInTab, getActiveWebTab } from '@/chrome/contentScriptClient'
import { clearFontInspectorTab, readFontInspectorTab, writeFontInspectorTab } from '@/core/design/fontInspectorState'
import { registerMessageHandler } from '@/core/messaging'
import { createLogger } from '@/core/logging'

const logger = createLogger('font-inspector')

type TabMessageResponse = { ok?: boolean; data?: { enabled?: boolean } }

async function queryContentFontState(tabId: number): Promise<boolean | null> {
  try {
    await ensureContentScriptInTab(tabId)
    const res = (await chrome.tabs.sendMessage(tabId, { type: 'FONT_INSPECTOR_GET' })) as
      | TabMessageResponse
      | undefined
    if (res?.ok && typeof res.data?.enabled === 'boolean') return res.data.enabled
  } catch (error) {
    logger.debug('font inspector query failed', error)
  }
  return null
}

export async function pushFontInspectorToTab(tabId: number, enabled: boolean): Promise<void> {
  await writeFontInspectorTab(tabId, enabled)
  try {
    await ensureContentScriptInTab(tabId)
    await chrome.tabs.sendMessage(tabId, { type: 'FONT_INSPECTOR_TOGGLE', enabled })
  } catch (error) {
    logger.warn('font inspector apply failed', error)
    throw error
  }
}

export async function resolveFontInspectorForTab(tabId: number): Promise<boolean> {
  const fromPage = await queryContentFontState(tabId)
  if (fromPage != null) {
    await writeFontInspectorTab(tabId, fromPage)
    return fromPage
  }
  return readFontInspectorTab(tabId)
}

export async function toggleFontInspectorForTab(tabId: number): Promise<boolean> {
  const current = await resolveFontInspectorForTab(tabId)
  const next = !current
  await pushFontInspectorToTab(tabId, next)
  return next
}

export function registerFontInspector(): void {
  registerMessageHandler('FONT_INSPECTOR_TAB_STATE', async (message, sender) => {
    if (message.type !== 'FONT_INSPECTOR_TAB_STATE' || sender.tab?.id == null) return
    await writeFontInspectorTab(sender.tab.id, message.enabled)
    return { synced: true }
  })

  registerMessageHandler('FONT_INSPECTOR_PANEL_GET', async () => {
    const tab = await getActiveWebTab()
    if (tab?.id == null) return { enabled: false, tabId: null }
    const enabled = await resolveFontInspectorForTab(tab.id)
    return { enabled, tabId: tab.id }
  })

  registerMessageHandler('FONT_INSPECTOR_PANEL_SET', async (message) => {
    if (message.type !== 'FONT_INSPECTOR_PANEL_SET') return
    const tab = await getActiveWebTab()
    if (tab?.id == null) throw new Error('No page tab to inspect.')
    await pushFontInspectorToTab(tab.id, message.enabled)
    return { enabled: message.enabled, tabId: tab.id }
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    void clearFontInspectorTab(tabId)
  })
}
