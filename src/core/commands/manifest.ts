import { getToolboxCommand } from './registry'

/** Command ids registered in chrome manifest (global scope only). Keep in sync with registry.ts */
export const MANIFEST_COMMAND_IDS = [
  'open-command-palette',
  'pick-element',
  'capture-screenshot',
  'toggle-pip',
  'toggle-recording',
  'add-page-task',
  'pick-color',
] as const

const DESCRIPTIONS: Record<(typeof MANIFEST_COMMAND_IDS)[number], string> = {
  'open-command-palette': '__MSG_commandPaletteDescription__',
  'pick-element': '__MSG_commandPickElement__',
  'capture-screenshot': '__MSG_commandCaptureScreenshot__',
  'toggle-pip': '__MSG_commandTogglePip__',
  'toggle-recording': '__MSG_commandToggleRecording__',
  'add-page-task': '__MSG_commandAddPageTask__',
  'pick-color': '__MSG_commandPickColor__',
}

/** Manifest commands use registry defaults as suggested keys; in-app settings can override via content scripts. */
export function buildManifestCommands(): Record<
  string,
  { description: string; suggested_key?: { default: string; mac: string } }
> {
  const commands: Record<
    string,
    { description: string; suggested_key?: { default: string; mac: string } }
  > = {}
  for (const id of MANIFEST_COMMAND_IDS) {
    const def = getToolboxCommand(id)
    commands[id] = {
      description: DESCRIPTIONS[id],
      ...(def
        ? { suggested_key: { default: def.binding.default, mac: def.binding.mac } }
        : {}),
    }
  }
  return commands
}
