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

  return { state, resolvePanelCommand }
}
