import { defaultBindingForCommand, formatAcceleratorDisplay, getToolboxCommand, isMacPlatform } from '@/core/commands'

export function getSearchShortcutLabel(): string {
  const command = getToolboxCommand('panel-search')
  if (!command) return isMacPlatform() ? '⌘K' : 'Ctrl K'
  return formatAcceleratorDisplay(defaultBindingForCommand(command))
}

/** @deprecated use getSearchShortcutLabel() */
export const SEARCH_SHORTCUT_LABEL = getSearchShortcutLabel()
