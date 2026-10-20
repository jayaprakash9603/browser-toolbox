import { useCallback, useEffect, useState } from 'react'

import {
  getYoutubeEnhancerState,
  updateYoutubeEnhancerState,
  type YoutubeEnhancerState,
  type YoutubeFeatureValue,
} from '@/core/sites/youtube'

export function useYoutubeSettings() {
  const [state, setState] = useState<YoutubeEnhancerState | null>(null)

  const refresh = useCallback(async () => {
    setState(await getYoutubeEnhancerState())
  }, [])

  useEffect(() => {
    void getYoutubeEnhancerState().then(setState)
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.youtubeEnhancer) {
        setState(changes.youtubeEnhancer.newValue as YoutubeEnhancerState)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const patch = useCallback(async (next: Partial<YoutubeEnhancerState> & { values?: Record<string, YoutubeFeatureValue> }) => {
    setState(await updateYoutubeEnhancerState(next))
  }, [])

  return { state, patch, refresh }
}
