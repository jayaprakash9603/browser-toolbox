export interface ToolboxCommand {
  id: string
  title: string
  suggestedKey?: string
  macKey?: string
  toolId?: string
  opensPanel: boolean
}

export const TOOLBOX_COMMANDS: ToolboxCommand[] = [
  {
    id: 'open-command-palette',
    title: 'Open command palette',
    suggestedKey: 'Ctrl+Shift+Space',
    macKey: 'Command+Shift+Space',
    opensPanel: true,
  },
  {
    id: 'pick-element',
    title: 'Pick element on page',
    suggestedKey: 'Ctrl+Shift+E',
    macKey: 'Command+Shift+E',
    opensPanel: true,
  },
  {
    id: 'capture-screenshot',
    title: 'Capture screenshot',
    suggestedKey: 'Ctrl+Shift+S',
    macKey: 'Command+Shift+S',
    opensPanel: true,
  },
]

export function getCommand(id: string): ToolboxCommand | undefined {
  return TOOLBOX_COMMANDS.find((command) => command.id === id)
}
