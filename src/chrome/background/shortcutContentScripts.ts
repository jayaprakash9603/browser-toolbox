import { createLogger } from '@/core/logging'

import { reconcileContentScripts } from './scriptRegistry'

const logger = createLogger('shortcut-scripts')

export const SHORTCUT_DISPATCHER_SCRIPT_ID = 'toolbox-shortcuts'
const SHORTCUT_DISPATCHER_JS = 'sites/scripts/shortcut-dispatcher.js'

export function buildShortcutDispatcherScript(): chrome.scripting.RegisteredContentScript {
  return {
    id: SHORTCUT_DISPATCHER_SCRIPT_ID,
    js: [SHORTCUT_DISPATCHER_JS],
    matches: ['<all_urls>'],
    runAt: 'document_start',
    allFrames: true,
  }
}

export async function syncShortcutContentScripts(enabled: boolean): Promise<void> {
  const scripts = enabled ? [buildShortcutDispatcherScript()] : []
  try {
    await reconcileContentScripts([SHORTCUT_DISPATCHER_SCRIPT_ID], scripts)
  } catch (error) {
    logger.warn('registerContentScripts failed', error)
  }
}

/** Registered scripts only reach new page loads; tabs open before an install/reload need it injected. */
export async function injectShortcutDispatcherIntoOpenTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*', 'file://*/*'] })
  for (const tab of tabs) {
    if (tab.id == null || tab.discarded) continue
    void chrome.scripting
      .executeScript({ target: { tabId: tab.id, allFrames: true }, files: [SHORTCUT_DISPATCHER_JS] })
      .catch(() => undefined)
  }
}
