import type { ToolboxCommandDef } from './types'

export const TOOLBOX_COMMANDS: ToolboxCommandDef[] = [
  {
    id: 'panel-search',
    titleKey: 'shortcuts.commands.panelSearch',
    descriptionMessage: '',
    scope: 'panel',
    binding: { default: 'Ctrl+K', mac: 'Command+K' },
  },
  {
    id: 'open-command-palette',
    titleKey: 'shortcuts.commands.commandPalette',
    descriptionMessage: '__MSG_commandPaletteDescription__',
    scope: 'global',
    binding: { default: 'Ctrl+Shift+Space', mac: 'Command+Shift+Space' },
    opensPanel: true,
  },
  {
    id: 'pick-element',
    titleKey: 'shortcuts.commands.pickElement',
    descriptionMessage: '__MSG_commandPickElement__',
    scope: 'global',
    binding: { default: 'Ctrl+Shift+E', mac: 'Command+Shift+E' },
    opensPanel: true,
  },
  {
    id: 'capture-screenshot',
    titleKey: 'shortcuts.commands.captureScreenshot',
    descriptionMessage: '__MSG_commandCaptureScreenshot__',
    scope: 'global',
    binding: { default: 'Ctrl+Shift+S', mac: 'Command+Shift+S' },
    opensPanel: true,
  },
  {
    id: 'toggle-pip',
    titleKey: 'shortcuts.commands.togglePip',
    descriptionMessage: '__MSG_commandTogglePip__',
    scope: 'global',
    binding: { default: 'Alt+P', mac: 'Alt+P' },
    opensPanel: false,
    toolId: 'browser.picture-in-picture',
  },
]

export const GLOBAL_TOOLBOX_COMMANDS = TOOLBOX_COMMANDS.filter((c) => c.scope === 'global')
export const PANEL_TOOLBOX_COMMANDS = TOOLBOX_COMMANDS.filter((c) => c.scope === 'panel')

export function getToolboxCommand(id: string): ToolboxCommandDef | undefined {
  return TOOLBOX_COMMANDS.find((command) => command.id === id)
}
