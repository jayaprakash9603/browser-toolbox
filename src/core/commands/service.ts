import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

import { isMacPlatform, parseAccelerator } from './accelerator'
import { getToolboxCommand, TOOLBOX_COMMANDS } from './registry'
import type { KeyboardShortcutsState, ToolboxCommandDef } from './types'

export const DEFAULT_KEYBOARD_SHORTCUTS_STATE: KeyboardShortcutsState = {
  bindings: {},
}

export async function getKeyboardShortcutsState(): Promise<KeyboardShortcutsState> {
  const stored = await get<Partial<KeyboardShortcutsState>>(STORAGE_KEYS.keyboardShortcuts)
  if (!stored) return { ...DEFAULT_KEYBOARD_SHORTCUTS_STATE }
  return {
    bindings: { ...stored.bindings },
  }
}

export async function updateKeyboardShortcutsState(
  patch: Partial<KeyboardShortcutsState>,
): Promise<KeyboardShortcutsState> {
  const current = await getKeyboardShortcutsState()
  const next: KeyboardShortcutsState = {
    bindings: patch.bindings ?? current.bindings,
  }
  await set(STORAGE_KEYS.keyboardShortcuts, next)
  return next
}

export async function setCommandBinding(commandId: string, binding: string | null): Promise<KeyboardShortcutsState> {
  const current = await getKeyboardShortcutsState()
  const bindings = { ...current.bindings, [commandId]: binding }
  return updateKeyboardShortcutsState({ bindings })
}

export async function resetCommandBinding(commandId: string): Promise<KeyboardShortcutsState> {
  const current = await getKeyboardShortcutsState()
  const bindings = { ...current.bindings }
  delete bindings[commandId]
  return updateKeyboardShortcutsState({ bindings })
}

export function defaultBindingForCommand(command: ToolboxCommandDef, mac = isMacPlatform()): string {
  return mac ? command.binding.mac : command.binding.default
}

export function getEffectiveBinding(
  commandId: string,
  state: KeyboardShortcutsState,
  mac = isMacPlatform(),
): string | null {
  const command = getToolboxCommand(commandId)
  if (!command) return null
  const override = state.bindings[commandId]
  if (override === null) return null
  if (typeof override === 'string' && override.trim()) return override.trim()
  return defaultBindingForCommand(command, mac)
}

export function findCommandForKeyEvent(
  modifiers: import('./types').KeyModifiers,
  state: KeyboardShortcutsState,
  scope: 'global' | 'panel' | 'any' = 'any',
  mac = isMacPlatform(),
): string | null {
  for (const command of TOOLBOX_COMMANDS) {
    if (scope !== 'any' && command.scope !== scope) continue
    const binding = getEffectiveBinding(command.id, state, mac)
    if (!binding) continue
    const parsed = parseAccelerator(binding)
    if (!parsed) continue
    if (
      parsed.key.toLowerCase() === modifiers.key.toLowerCase() &&
      parsed.ctrl === modifiers.ctrl &&
      parsed.alt === modifiers.alt &&
      parsed.shift === modifiers.shift &&
      parsed.meta === modifiers.meta
    ) {
      return command.id
    }
  }
  return null
}

export function listBindingConflicts(
  commandId: string,
  accelerator: string,
  state: KeyboardShortcutsState,
  mac = isMacPlatform(),
): string[] {
  const conflicts: string[] = []
  for (const command of TOOLBOX_COMMANDS) {
    if (command.id === commandId) continue
    const binding = getEffectiveBinding(command.id, state, mac)
    if (binding && binding.toLowerCase() === accelerator.toLowerCase()) conflicts.push(command.id)
  }
  return conflicts
}
