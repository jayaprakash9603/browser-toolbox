import { findCommandForKeyEvent, getKeyboardShortcutsState } from '@/core/commands'
import { registerMessageHandler } from '@/core/messaging'
import { createLogger } from '@/core/logging'

import { executeToolboxCommand } from './executeCommand'
import { syncShortcutContentScripts } from './shortcutContentScripts'

const logger = createLogger('shortcuts')

export function registerShortcuts(): void {
  registerMessageHandler('SHORTCUT_KEY_EVENT', async (message, sender) => {
    if (message.type !== 'SHORTCUT_KEY_EVENT') return
    const state = await getKeyboardShortcutsState()
    const commandId = findCommandForKeyEvent(message.modifiers, state, 'global')
    if (!commandId) return { handled: false as const }
    logger.debug('shortcut', commandId)
    await executeToolboxCommand(commandId, sender.tab)
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
}
