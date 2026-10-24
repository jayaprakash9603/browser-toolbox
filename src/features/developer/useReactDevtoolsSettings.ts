import { useCallback, useEffect, useState } from 'react'

import {
  getReactDevtoolsState,
  setReactDevtoolsState,
  type ReactDevtoolsState,
} from '@/core/reactDevtools/state'
import { STORAGE_KEYS } from '@/core/constants'

export function useReactDevtoolsSettings() {
  const [state, setState] = useState<ReactDevtoolsState | null>(null)

  const refresh = useCallback(async () => {
    setState(await getReactDevtoolsState())
  }, [])

  useEffect(() => {
    // Initial load from extension storage (same pattern as usePipSettings).
    void getReactDevtoolsState().then(setState)
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[STORAGE_KEYS.reactDevtools]) {
        setState(changes[STORAGE_KEYS.reactDevtools].newValue as ReactDevtoolsState)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [refresh])

  const patch = useCallback(async (next: Partial<ReactDevtoolsState>) => {
    setState(await setReactDevtoolsState(next))
  }, [])

  return { state, patch, refresh }
}
