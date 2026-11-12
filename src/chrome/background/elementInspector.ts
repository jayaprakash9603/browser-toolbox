import {
  DEFAULT_INSPECTOR_LABELS,
  DEFAULT_INSPECTOR_OPTIONS,
  type PageInspectorState,
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

type TabMessageResponse = { ok?: boolean; data?: PageInspectorState }

async function ensureInspectorScripts(tabId: number): Promise<void> {
  try {
    await ensureContentScriptInTab(tabId, { allFrames: true })
  } catch (error) {
    logger.debug('all-frame inject partial', error)
    await ensureContentScriptInTab(tabId).catch(() => undefined)
  }
}

async function queryMainFrameInspector(tabId: number): Promise<boolean | null> {
  try {
    await ensureInspectorScripts(tabId)
    const res = (await chrome.tabs.sendMessage(
      tabId,
      { type: 'PAGE_INSPECTOR_GET' },
      { frameId: 0 },
    )) as TabMessageResponse | undefined
    if (res?.ok && res.data?.options) return res.data.options.enabled
  } catch (error) {
    logger.debug('element inspector query failed', error)
  }
  return null
}

export async function pushElementInspectorToTab(
  tabId: number,
  enabled: boolean,
  labelOverrides?: Record<string, string>,
): Promise<void> {
  await writeElementInspectorTab(tabId, enabled)
  await ensureInspectorScripts(tabId)
  const labels = { ...DEFAULT_INSPECTOR_LABELS, ...labelOverrides }
  await chrome.tabs.sendMessage(tabId, {
    type: 'PAGE_INSPECTOR_SET',
    options: enabled
      ? { ...DEFAULT_INSPECTOR_OPTIONS, enabled: true }
      : { enabled: false },
    labels,
  })
}

export async function resolveElementInspectorForTab(tabId: number): Promise<boolean> {
  const fromPage = await queryMainFrameInspector(tabId)
  if (fromPage != null) {
    await writeElementInspectorTab(tabId, fromPage)
    return fromPage
  }
  return readElementInspectorTab(tabId)
}

export async function toggleElementInspectorForTab(tabId: number): Promise<boolean> {
  const current = await resolveElementInspectorForTab(tabId)
  const next = !current
  await pushElementInspectorToTab(tabId, next)
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
    await pushElementInspectorToTab(tab.id, message.enabled, message.labels)
    return { enabled: message.enabled, tabId: tab.id }
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    void clearElementInspectorTab(tabId)
  })
}
