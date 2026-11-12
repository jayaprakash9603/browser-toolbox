import { ensureContentScriptInTab, getActiveWebTab } from '@/chrome/contentScriptClient'
import { clearFontInspectorTab, readFontInspectorTab, writeFontInspectorTab } from '@/core/design/fontInspectorState'
import { registerMessageHandler } from '@/core/messaging'
import { createLogger } from '@/core/logging'

const logger = createLogger('font-inspector')

async function ensureFontScripts(tabId: number): Promise<void> {
  try {
    await ensureContentScriptInTab(tabId, { allFrames: true })
  } catch (error) {
    logger.debug('all-frame font inject partial', error)
    await ensureContentScriptInTab(tabId).catch(() => undefined)
  }
}

async function broadcastFontInspector(tabId: number, enabled: boolean): Promise<void> {
  await chrome.tabs.sendMessage(tabId, { type: 'FONT_INSPECTOR_TOGGLE', enabled })
}

export async function pushFontInspectorToTab(
  tabId: number,
  enabled: boolean,
  options?: { frameId?: number; allFrames?: boolean },
): Promise<void> {
  await writeFontInspectorTab(tabId, enabled)
  try {
    await ensureFontScripts(tabId)
    if (!enabled) {
      await broadcastFontInspector(tabId, false)
      return
    }
    await broadcastFontInspector(tabId, false)
    if (options?.allFrames) {
      await chrome.tabs.sendMessage(tabId, { type: 'FONT_INSPECTOR_TOGGLE', enabled: true })
    } else {
      const frameId = options?.frameId ?? 0
      await chrome.tabs.sendMessage(tabId, { type: 'FONT_INSPECTOR_TOGGLE', enabled: true }, { frameId })
    }
  } catch (error) {
    logger.warn('font inspector apply failed', error)
    throw error
  }
}

export async function resolveFontInspectorForTab(tabId: number): Promise<boolean> {
  return readFontInspectorTab(tabId)
}

export async function toggleFontInspectorForTab(tabId: number, frameId = 0): Promise<boolean> {
  const current = await resolveFontInspectorForTab(tabId)
  const next = !current
  await pushFontInspectorToTab(tabId, next, { frameId })
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
    await pushFontInspectorToTab(tab.id, message.enabled, { allFrames: message.enabled })
    return { enabled: message.enabled, tabId: tab.id }
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    void clearFontInspectorTab(tabId)
  })
}
