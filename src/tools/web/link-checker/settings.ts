import { useCallback, useEffect, useRef, useState } from 'react'

import { DEFAULT_CHECK_SETTINGS, normalizeSettings, type CheckSettings } from '@/core/engines/linkChecker/report'

const SETTINGS_KEY = 'linkChecker.settings'

async function loadSettings(): Promise<CheckSettings> {
  try {
    const stored = (await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY]
    return normalizeSettings(stored)
  } catch {
    return DEFAULT_CHECK_SETTINGS
  }
}

export function useCheckSettings() {
  const [settings, setSettings] = useState<CheckSettings>(DEFAULT_CHECK_SETTINGS)
  const current = useRef(settings)
  const touched = useRef(false)

  useEffect(() => {
    let live = true
    void loadSettings().then((loaded) => {
      if (!live || touched.current) return
      current.current = loaded
      setSettings(loaded)
    })
    return () => {
      live = false
    }
  }, [])

  const update = useCallback((patch: Partial<CheckSettings>) => {
    touched.current = true
    const next = normalizeSettings({ ...current.current, ...patch })
    current.current = next
    setSettings(next)
    void Promise.resolve(chrome.storage.local.set({ [SETTINGS_KEY]: next })).catch(() => undefined)
  }, [])

  const reset = useCallback(() => update(DEFAULT_CHECK_SETTINGS), [update])

  return { settings, update, reset }
}
