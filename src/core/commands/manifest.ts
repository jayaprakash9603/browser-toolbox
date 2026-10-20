/** Command ids registered in chrome manifest (global scope only). Keep in sync with registry.ts */
export const MANIFEST_COMMAND_IDS = [
  'open-command-palette',
  'pick-element',
  'capture-screenshot',
  'toggle-pip',
] as const

const DESCRIPTIONS: Record<(typeof MANIFEST_COMMAND_IDS)[number], string> = {
  'open-command-palette': '__MSG_commandPaletteDescription__',
  'pick-element': '__MSG_commandPickElement__',
  'capture-screenshot': '__MSG_commandCaptureScreenshot__',
  'toggle-pip': '__MSG_commandTogglePip__',
}

/** Manifest command entries (no suggested_key — shortcuts are managed in extension settings). */
export function buildManifestCommands(): Record<string, { description: string }> {
  const commands: Record<string, { description: string }> = {}
  for (const id of MANIFEST_COMMAND_IDS) {
    commands[id] = { description: DESCRIPTIONS[id] }
  }
  return commands
}
