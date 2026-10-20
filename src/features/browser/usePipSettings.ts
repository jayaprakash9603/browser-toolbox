import { useCallback, useEffect, useState } from 'react'

import { getPipState, updatePipState, type PipState } from '@/core/pip'

export function usePipSettings() {
  const [state, setState] = useState<PipState | null>(null)

  const refresh = useCallback(async () => {
    setState(await getPipState())
  }, [])

  useEffect(() => {
    void getPipState().then(setState)
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.pip) {
        setState(changes.pip.newValue as PipState)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const patch = useCallback(async (next: Partial<PipState>) => {
    setState(await updatePipState(next))
  }, [])

  return { state, patch, refresh }
}
