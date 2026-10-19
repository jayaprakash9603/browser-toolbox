import { useCallback, useEffect, useState } from 'react'

import { getAdblockState, updateAdblockState, type AdblockState } from '@/core/adblock'

export function useAdblock() {
  const [state, setState] = useState<AdblockState | null>(null)

  const refresh = useCallback(async () => {
    setState(await getAdblockState())
  }, [])

  useEffect(() => {
    void getAdblockState().then(setState)
    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area === 'local' && changes.adblock) {
        setState(changes.adblock.newValue as AdblockState)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const patch = useCallback(async (next: Partial<AdblockState>) => {
    setState(await updateAdblockState(next))
  }, [])

  return { state, patch, refresh }
}
