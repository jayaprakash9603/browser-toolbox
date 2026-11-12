import {
  DEFAULT_INSPECTOR_LABELS,
  DEFAULT_INSPECTOR_OPTIONS,
} from '@/chrome/content/pageInspector/model'
import { ensureContentScriptInTab, getActiveWebTab } from '@/chrome/contentScriptClient'
import {
  clearElementInspectorTab,
  readElementInspectorTab,
  writeElementInspectorTab,
} from '@/core/design/elementInspectorState'
import { registerMessageHandler } from '@/core/messaging'
import { createLogger } from '@/core/logging'

const logger = createLogger('element-inspector')

async function ensureInspectorScripts(tabId: number): Promise<void> {
  try {
    await ensureContentScriptInTab(tabId, { allFrames: true })
  } catch (error) {
    logger.debug('all-frame inject partial', error)
    await ensureContentScriptInTab(tabId).catch(() => undefined)
  }
}

async function broadcastInspectorOff(tabId: number): Promise<void> {
  await ensureInspectorScripts(tabId)
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PAGE_INSPECTOR_SET', options: { enabled: false } })
  } catch (error) {
    logger.debug('disable inspector in all frames failed', error)
  }
}

export async function pushElementInspectorToTab(
  tabId: number,
  enabled: boolean,
  options?: { frameId?: number; labels?: Record<string, string> },
): Promise<void> {
  await writeElementInspectorTab(tabId, enabled)
  if (!enabled) {
    await broadcastInspectorOff(tabId)
    return
  }

  const frameId = options?.frameId ?? 0
  const labels = { ...DEFAULT_INSPECTOR_LABELS, ...options?.labels }
  await ensureInspectorScripts(tabId)
  await broadcastInspectorOff(tabId)
  try {
    await chrome.tabs.sendMessage(
      tabId,
      {
        type: 'PAGE_INSPECTOR_SET',
        options: { ...DEFAULT_INSPECTOR_OPTIONS, enabled: true },
        labels,
      },
      { frameId },
    )
  } catch (error) {
    logger.warn('enable element inspector in frame failed', error)
    throw error
  }
}

export async function resolveElementInspectorForTab(tabId: number): Promise<boolean> {
  return readElementInspectorTab(tabId)
}

export async function toggleElementInspectorForTab(tabId: number, frameId = 0): Promise<boolean> {
  const current = await resolveElementInspectorForTab(tabId)
  const next = !current
  await pushElementInspectorToTab(tabId, next, { frameId })
  return next
}

export function registerElementInspector(): void {
  registerMessageHandler('PAGE_INSPECTOR_TAB_STATE', async (message, sender) => {
    if (message.type !== 'PAGE_INSPECTOR_TAB_STATE' || sender.tab?.id == null) return
    await writeElementInspectorTab(sender.tab.id, message.enabled)
    return { synced: true }
  })

  registerMessageHandler('PAGE_INSPECTOR_PANEL_GET', async () => {
    const tab = await getActiveWebTab()
    if (tab?.id == null) return { enabled: false, tabId: null }
    const enabled = await resolveElementInspectorForTab(tab.id)
    return { enabled, tabId: tab.id }
  })

  registerMessageHandler('PAGE_INSPECTOR_PANEL_SET', async (message) => {
    if (message.type !== 'PAGE_INSPECTOR_PANEL_SET') return
    const tab = await getActiveWebTab()
    if (tab?.id == null) throw new Error('No page tab to inspect.')
    await pushElementInspectorToTab(tab.id, message.enabled, { frameId: 0, labels: message.labels })
    return { enabled: message.enabled, tabId: tab.id }
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    void clearElementInspectorTab(tabId)
  })
}
