import { useCallback, useEffect, useState } from 'react'

import {
  findCommandForKeyEvent,
  getKeyboardShortcutsState,
  keyModifiersFromKeyboardEvent,
  type KeyboardShortcutsState,
} from '@/core/commands'

export function usePanelShortcuts() {
  const [state, setState] = useState<KeyboardShortcutsState | null>(null)

  useEffect(() => {
    void getKeyboardShortcutsState().then(setState)
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.keyboardShortcuts) {
        setState(changes.keyboardShortcuts.newValue as KeyboardShortcutsState)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const resolvePanelCommand = useCallback(
    (event: KeyboardEvent): string | null => {
      if (!state) return null
      const modifiers = keyModifiersFromKeyboardEvent(event)
      return findCommandForKeyEvent(modifiers, state, 'panel')
    },
    [state],
  )

  /** Page content scripts don't run in toolbox pages, so global shortcuts are forwarded from here. */
  const forwardGlobalShortcut = useCallback(
    (event: KeyboardEvent): boolean => {
      if (!state || event.repeat) return false
      const modifiers = keyModifiersFromKeyboardEvent(event)
      if (!findCommandForKeyEvent(modifiers, state, 'global')) return false
      void chrome.runtime.sendMessage({ type: 'SHORTCUT_KEY_EVENT', modifiers }).catch(() => undefined)
      return true
    },
    [state],
  )

  return { state, resolvePanelCommand, forwardGlobalShortcut }
}
