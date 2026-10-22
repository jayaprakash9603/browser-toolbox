import { findCommandForKeyEvent, getKeyboardShortcutsState } from '@/core/commands'
import { registerMessageHandler } from '@/core/messaging'
import { createLogger } from '@/core/logging'

import { getActiveWebTab } from '@/chrome/contentScriptClient'

import { executeToolboxCommand } from './executeCommand'
import { injectShortcutDispatcherIntoOpenTabs, syncShortcutContentScripts } from './shortcutContentScripts'

const logger = createLogger('shortcuts')

function isWebTab(tab: chrome.tabs.Tab | undefined): tab is chrome.tabs.Tab {
  return Boolean(tab?.url && /^(https?|file):/i.test(tab.url))
}

export function registerShortcuts(): void {
  registerMessageHandler('SHORTCUT_KEY_EVENT', async (message, sender) => {
    if (message.type !== 'SHORTCUT_KEY_EVENT') return
    const state = await getKeyboardShortcutsState()
    const commandId = findCommandForKeyEvent(message.modifiers, state, 'global')
    if (!commandId) return { handled: false as const }
    logger.debug('shortcut', commandId)
    // Pressed inside the side panel or a toolbox tab: act on the page the user is looking at.
    const tab = isWebTab(sender.tab) ? sender.tab : await getActiveWebTab()
    // Captures take seconds; answer now so the page can suppress the key's default action.
    void executeToolboxCommand(commandId, tab).catch((error) =>
      logger.warn('shortcut command failed', commandId, error),
    )
    return { handled: true }
  })

  void syncShortcutContentScripts(true)

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.keyboardShortcuts) {
      void syncShortcutContentScripts(true)
    }
  })
}

export async function initShortcutsOnStartup(): Promise<void> {
  await syncShortcutContentScripts(true)
  await injectShortcutDispatcherIntoOpenTabs()
}
