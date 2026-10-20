import { useCallback, useEffect, useState } from 'react'

import {
  getImageDownloaderSettings,
  updateImageDownloaderSettings,
  type ImageDownloaderSettings,
} from '@/core/imageDownloader'

export function useImageDownloaderSettings() {
  const [state, setState] = useState<ImageDownloaderSettings | null>(null)

  useEffect(() => {
    void getImageDownloaderSettings().then(setState)
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.imageDownloader) {
        setState(changes.imageDownloader.newValue as ImageDownloaderSettings)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const patch = useCallback(async (next: Partial<ImageDownloaderSettings>) => {
    setState(await updateImageDownloaderSettings(next))
  }, [])

  return { state, patch }
}
