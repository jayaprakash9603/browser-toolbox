import { useCallback, useEffect, useState } from 'react'

import { STORAGE_KEYS } from '@/core/constants'
import { sendMessage } from '@/core/messaging'
import {
  DOWNLOAD_MANAGER_SESSION_KEY,
  normalizeDownloadManagerState,
  type DownloadLiveSnapshot,
  type DownloadManagerSettings,
  type DownloadManagerState,
} from '@/core/download-manager'

export function useDownloadManagerState() {
  const [state, setState] = useState<DownloadManagerState | null>(null)

  const reload = useCallback(async () => {
    const data = await sendMessage<DownloadManagerState>({ type: 'DOWNLOAD_MANAGER_GET_STATE' })
    if (data) setState(data)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, area) => {
      if (area === 'local' && changes[STORAGE_KEYS.downloadManager]) {
        setState(normalizeDownloadManagerState(changes[STORAGE_KEYS.downloadManager].newValue as Partial<DownloadManagerState>))
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const patchSettings = useCallback(async (patch: Partial<DownloadManagerSettings>) => {
    const settings = await sendMessage<DownloadManagerSettings>({ type: 'DOWNLOAD_MANAGER_PATCH_SETTINGS', patch })
    if (settings) setState((prev) => (prev ? { ...prev, settings } : prev))
    return settings ?? null
  }, [])

  return { state, reload, patchSettings }
}

export function useDownloadLiveSnapshot(pollActive = true) {
  const [snapshot, setSnapshot] = useState<DownloadLiveSnapshot | null>(null)

  const refresh = useCallback(async () => {
    const data = await sendMessage<{ snapshot: DownloadLiveSnapshot; state: DownloadManagerState }>({
      type: 'DOWNLOAD_MANAGER_GET_SNAPSHOT',
    })
    if (data) setSnapshot(data.snapshot)
    return data
  }, [])

  useEffect(() => {
    void refresh()
    const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, area) => {
      if (area === 'session' && changes[DOWNLOAD_MANAGER_SESSION_KEY]) {
        setSnapshot(changes[DOWNLOAD_MANAGER_SESSION_KEY].newValue as DownloadLiveSnapshot)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    const id = pollActive ? window.setInterval(() => void refresh(), 5000) : undefined
    return () => {
      chrome.storage.onChanged.removeListener(listener)
      if (id != null) window.clearInterval(id)
    }
  }, [refresh, pollActive])

  return { snapshot, refresh }
}
