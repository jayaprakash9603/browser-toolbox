import { useEffect, useState } from 'react'

import { getSettings, type Settings } from '@/features/settings/settingsService'

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    void getSettings().then(setSettings)
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area === 'local' && changes.settings) {
        void getSettings().then(setSettings)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  return settings
}
