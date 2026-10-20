import { createLogger } from '@/core/logging'

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
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [SHORTCUT_DISPATCHER_SCRIPT_ID] })
  } catch {
    /* not registered */
  }
  if (!enabled) return
  try {
    await chrome.scripting.registerContentScripts([buildShortcutDispatcherScript()])
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
