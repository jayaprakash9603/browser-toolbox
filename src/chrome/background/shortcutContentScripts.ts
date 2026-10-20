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
