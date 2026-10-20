export {
  acceleratorFromKeyboardEvent,
  formatAcceleratorDisplay,
  isMacPlatform,
  keyModifiersFromKeyboardEvent,
  matchesAccelerator,
  parseAccelerator,
} from './accelerator'
export { buildManifestCommands } from './manifest'
export {
  GLOBAL_TOOLBOX_COMMANDS,
  getToolboxCommand,
  PANEL_TOOLBOX_COMMANDS,
  TOOLBOX_COMMANDS,
} from './registry'
export {
  DEFAULT_KEYBOARD_SHORTCUTS_STATE,
  findCommandForKeyEvent,
  getEffectiveBinding,
  getKeyboardShortcutsState,
  listBindingConflicts,
  resetCommandBinding,
  setCommandBinding,
  updateKeyboardShortcutsState,
  defaultBindingForCommand,
} from './service'
export type { CommandKeyBinding, CommandScope, KeyboardShortcutsState, KeyModifiers, ToolboxCommandDef } from './types'

import { getToolboxCommand } from './registry'

/** @deprecated Use getToolboxCommand */
export function getCommand(id: string) {
  return getToolboxCommand(id)
}
