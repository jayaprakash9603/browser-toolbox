import {
  getEffectiveBinding,
  getKeyboardShortcutsState,
  isMacPlatform,
  type KeyboardShortcutsState,
} from '@/core/commands'
import { MANIFEST_COMMAND_IDS } from '@/core/commands/manifest'
import { createLogger } from '@/core/logging'

const logger = createLogger('command-sync')

type CommandsWithUpdate = typeof chrome.commands & {
  update(details: { name: string; shortcut?: string }): Promise<void>
}

/** Applies in-app shortcut settings to chrome.commands (backup path when content scripts cannot run). */
export async function syncManifestShortcuts(state?: KeyboardShortcutsState): Promise<void> {
  const shortcuts = state ?? (await getKeyboardShortcutsState())
  const mac = isMacPlatform()
  const commands = chrome.commands as CommandsWithUpdate
  if (typeof commands.update !== 'function') return
  await Promise.all(
    MANIFEST_COMMAND_IDS.map(async (id) => {
      const binding = getEffectiveBinding(id, shortcuts, mac)
      try {
        await commands.update({
          name: id,
          shortcut: binding ?? '',
        })
      } catch (error) {
        logger.warn('commands.update failed', id, error)
      }
    }),
  )
}
