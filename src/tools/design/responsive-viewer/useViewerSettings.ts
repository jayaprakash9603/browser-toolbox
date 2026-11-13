import { useEffect, useState } from 'react'

import { hydrateSettings, loadSettings, storeSettings, type ViewerSettings } from './devices'

export function useViewerSettings() {
  const [settings, setSettings] = useState<ViewerSettings>(loadSettings)

  useEffect(() => {
    let active = true
    void hydrateSettings().then((stored) => {
      if (active && stored) setSettings(stored)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => storeSettings(settings), [settings])

  return [settings, setSettings] as const
}
