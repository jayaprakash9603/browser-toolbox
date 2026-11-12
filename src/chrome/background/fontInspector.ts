import { broadcastToTabFrames, ensureContentScriptInTab, getActiveWebTab } from '@/chrome/contentScriptClient'
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

export async function pushFontInspectorToTab(tabId: number, enabled: boolean): Promise<void> {
  await writeFontInspectorTab(tabId, enabled)
  try {
    await ensureFontScripts(tabId)
    await broadcastToTabFrames(tabId, { type: 'FONT_INSPECTOR_TOGGLE', enabled })
  } catch (error) {
    logger.warn('font inspector apply failed', error)
    throw error
  }
}

export async function resolveFontInspectorForTab(tabId: number): Promise<boolean> {
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

  registerMessageHandler('FONT_INSPECTOR_SHOW', async (message, sender) => {
    if (message.type !== 'FONT_INSPECTOR_SHOW' || sender.tab?.id == null) return
    try {
      await chrome.tabs.sendMessage(sender.tab.id, message, { frameId: 0 })
    } catch {
      await broadcastToTabFrames(sender.tab.id, message)
    }
    return { relayed: true }
  })

  registerMessageHandler('FONT_INSPECTOR_HIDE', async (_message, sender) => {
    if (sender.tab?.id == null) return
    await chrome.tabs.sendMessage(sender.tab.id, { type: 'FONT_INSPECTOR_HIDE' }, { frameId: 0 }).catch(() => undefined)
    return { relayed: true }
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    void clearFontInspectorTab(tabId)
  })
}
