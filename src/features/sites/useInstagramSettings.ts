import { useCallback, useEffect, useState } from 'react'

import {
  getInstagramEnhancerState,
  updateInstagramEnhancerState,
  type InstagramEnhancerState,
  type InstagramFeatureValue,
} from '@/core/sites/instagram'

export function useInstagramSettings() {
  const [state, setState] = useState<InstagramEnhancerState | null>(null)

  const refresh = useCallback(async () => {
    setState(await getInstagramEnhancerState())
  }, [])

  useEffect(() => {
    void getInstagramEnhancerState().then(setState)
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.instagramEnhancer) {
        setState(changes.instagramEnhancer.newValue as InstagramEnhancerState)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const patch = useCallback(
    async (next: Partial<InstagramEnhancerState> & { values?: Record<string, InstagramFeatureValue> }) => {
      setState(await updateInstagramEnhancerState(next))
    },
    [],
  )

  return { state, patch, refresh }
}
