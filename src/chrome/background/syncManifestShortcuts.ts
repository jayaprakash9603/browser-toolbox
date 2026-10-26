import {
  getEffectiveBinding,
  getKeyboardShortcutsState,
  isMacPlatform,
  type KeyboardShortcutsState,
} from '@/core/commands'
import { MANIFEST_COMMAND_IDS } from '@/core/commands/manifest'
import { createLogger } from '@/core/logging'

const logger = createLogger('command-sync')

/** Applies in-app shortcut settings to chrome.commands (backup path when content scripts cannot run). */
export async function syncManifestShortcuts(state?: KeyboardShortcutsState): Promise<void> {
  const shortcuts = state ?? (await getKeyboardShortcutsState())
  const mac = isMacPlatform()
  await Promise.all(
    MANIFEST_COMMAND_IDS.map(async (id) => {
      const binding = getEffectiveBinding(id, shortcuts, mac)
      try {
        await chrome.commands.update({
          name: id,
          shortcut: binding ?? '',
        })
      } catch (error) {
        logger.warn('commands.update failed', id, error)
      }
    }),
  )
}
