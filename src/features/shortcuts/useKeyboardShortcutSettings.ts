import { useCallback, useEffect, useState } from 'react'

import {
  getKeyboardShortcutsState,
  updateKeyboardShortcutsState,
  type KeyboardShortcutsState,
} from '@/core/commands'

export function useKeyboardShortcutSettings() {
  const [state, setState] = useState<KeyboardShortcutsState | null>(null)

  const refresh = useCallback(async () => {
    setState(await getKeyboardShortcutsState())
  }, [])

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

  const patch = useCallback(async (next: Partial<KeyboardShortcutsState>) => {
    setState(await updateKeyboardShortcutsState(next))
  }, [])

  return { state, patch, refresh }
}
