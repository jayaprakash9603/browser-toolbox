import {
  DEFAULT_KEYBOARD_SHORTCUTS_STATE,
  findCommandForKeyEvent,
  getKeyboardShortcutsState,
  getToolboxCommand,
} from '@/core/commands'
import { parseChromeShortcut } from '@/core/commands/accelerator'
import { registerMessageHandler } from '@/core/messaging'
import { createLogger } from '@/core/logging'
import { requestOpenCommandPalette } from '@/core/panel/navigationSession'

import { getActiveWebTab } from '@/chrome/contentScriptClient'

import { executeToolboxCommand } from './executeCommand'
import { injectShortcutDispatcherIntoOpenTabs, syncShortcutContentScripts } from './shortcutContentScripts'
import { syncManifestShortcuts } from './syncManifestShortcuts'

const logger = createLogger('shortcuts')

let shortcutState: import('@/core/commands').KeyboardShortcutsState = {
  ...DEFAULT_KEYBOARD_SHORTCUTS_STATE,
}

async function refreshShortcutState(): Promise<void> {
  shortcutState = await getKeyboardShortcutsState()
}

function isWebTab(tab: chrome.tabs.Tab | undefined): tab is chrome.tabs.Tab {
  return Boolean(tab?.url && /^(https?|file):/i.test(tab.url))
}

function primePanelOpen(commandId: string, sender: chrome.runtime.MessageSender): void {
  const def = getToolboxCommand(commandId)
  if (!def?.opensPanel) return
  const windowId = sender.tab?.windowId
  if (windowId == null) return
  void chrome.sidePanel.open({ windowId }).catch((error) => logger.warn('side panel open failed', error))
}

export function registerShortcuts(): void {
  registerMessageHandler('SHORTCUT_KEY_EVENT', (message, sender) => {
    if (message.type !== 'SHORTCUT_KEY_EVENT') return
    const commandId = findCommandForKeyEvent(message.modifiers, shortcutState, 'global')
    if (!commandId) return { handled: false as const }
    logger.debug('shortcut', commandId)
    primePanelOpen(commandId, sender)
    if (commandId === 'open-command-palette') {
      void requestOpenCommandPalette()
    }
    const tabPromise = isWebTab(sender.tab) ? Promise.resolve(sender.tab) : getActiveWebTab()
    void tabPromise
      .then((tab) => executeToolboxCommand(commandId, tab))
      .catch((error) => logger.warn('shortcut command failed', commandId, error))
    return { handled: true as const }
  })

  void syncShortcutContentScripts(true)

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.keyboardShortcuts) {
      const next = changes.keyboardShortcuts.newValue as typeof shortcutState | undefined
      void refreshShortcutState()
      void syncShortcutContentScripts(true)
      void syncManifestShortcuts(next)
    }
  })
}

const FORM_COMMANDS = new Set(['form-fill', 'form-clear'])

/**
 * Chrome keeps the keys an install was first given, so after fill and clear swapped keys Chrome may
 * still report Ctrl+Shift+F as "form-clear". The key actually pressed decides, as the app's settings bind it.
 * Only the form pair is resolved: the extra await would cost panel-opening commands their user gesture.
 */
export async function resolveChromeCommand(command: string): Promise<string> {
  if (!FORM_COMMANDS.has(command)) return command
  const commands = await chrome.commands.getAll().catch(() => [] as chrome.commands.Command[])
  const pressed = parseChromeShortcut(commands.find((item) => item.name === command)?.shortcut)
  if (!pressed) return command
  const bound = findCommandForKeyEvent(pressed, await getKeyboardShortcutsState(), 'global')
  return bound && FORM_COMMANDS.has(bound) ? bound : command
}

export async function initShortcutsOnStartup(): Promise<void> {
  await refreshShortcutState()
  await syncManifestShortcuts(shortcutState)
  await syncShortcutContentScripts(true)
  await injectShortcutDispatcherIntoOpenTabs()
}
