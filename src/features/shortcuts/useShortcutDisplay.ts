import { useMemo } from 'react'

import { formatAcceleratorDisplay, getEffectiveBinding, getToolboxCommand, defaultBindingForCommand } from '@/core/commands'

import { useKeyboardShortcutSettings } from './useKeyboardShortcutSettings'

export function useShortcutDisplay(commandId: string): string {
  const { state } = useKeyboardShortcutSettings()
  return useMemo(() => {
    const command = getToolboxCommand(commandId)
    if (!command) return ''
    if (!state) return formatAcceleratorDisplay(defaultBindingForCommand(command))
    const binding = getEffectiveBinding(commandId, state)
    if (!binding) return '—'
    return formatAcceleratorDisplay(binding)
  }, [commandId, state])
}
