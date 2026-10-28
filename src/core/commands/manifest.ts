/** Command ids registered in chrome manifest (global scope only). Keep in sync with registry.ts */
export const MANIFEST_COMMAND_IDS = [
  'open-command-palette',
  'pick-element',
  'capture-screenshot',
  'toggle-pip',
  'toggle-recording',
  'add-page-task',
  'pick-color',
  'form-fill',
  'form-clear',
] as const

type ManifestCommandId = (typeof MANIFEST_COMMAND_IDS)[number]

const DESCRIPTIONS: Record<ManifestCommandId, string> = {
  'open-command-palette': '__MSG_commandPaletteDescription__',
  'pick-element': '__MSG_commandPickElement__',
  'capture-screenshot': '__MSG_commandCaptureScreenshot__',
  'toggle-pip': '__MSG_commandTogglePip__',
  'toggle-recording': '__MSG_commandToggleRecording__',
  'add-page-task': '__MSG_commandAddPageTask__',
  'pick-color': '__MSG_commandPickColor__',
  'form-fill': '__MSG_commandFormFill__',
  'form-clear': '__MSG_commandFormClear__',
}

/**
 * Chrome keys a few commands out of the box. Form keys are pressed while typing in a field, where
 * the in-page shortcut listener stays quiet, and on sites without access, where it never runs.
 * Chrome allows at most four of these.
 */
/** Clear uses Ctrl+Shift+C so it can win over Chrome’s “Inspect element” shortcut on the page. */
const SUGGESTED_KEYS: Partial<Record<ManifestCommandId, { default: string; mac: string }>> = {
  'form-fill': { default: 'Ctrl+Shift+F', mac: 'Command+Shift+F' },
  'form-clear': { default: 'Ctrl+Shift+C', mac: 'Command+Shift+C' },
}

export interface ManifestCommand {
  description: string
  suggested_key?: { default: string; mac: string }
}

/** Other commands are registered without suggested keys; bindings come from Settings and sync on startup. */
export function buildManifestCommands(): Record<string, ManifestCommand> {
  const commands: Record<string, ManifestCommand> = {}
  for (const id of MANIFEST_COMMAND_IDS) {
    const suggested = SUGGESTED_KEYS[id]
    commands[id] = suggested ? { description: DESCRIPTIONS[id], suggested_key: suggested } : { description: DESCRIPTIONS[id] }
  }
  return commands
}
