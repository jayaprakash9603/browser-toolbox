export type CommandScope = 'global' | 'panel'

export interface CommandKeyBinding {
  default: string
  mac: string
}

export interface ToolboxCommandDef {
  id: string
  titleKey: string
  descriptionMessage: string
  scope: CommandScope
  binding: CommandKeyBinding
  opensPanel?: boolean
  toolId?: string
}

export interface KeyboardShortcutsState {
  /** Chrome accelerator string, or null to disable the shortcut */
  bindings: Partial<Record<string, string | null>>
}

export interface KeyModifiers {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}
