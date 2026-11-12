import { useCallback, useEffect, useRef, useState } from 'react'

import { getHistory, type ClipboardEntry } from '@/core/clipboard'
import { STORAGE_KEYS } from '@/core/constants'
import { eventBus } from '@/core/events'

const REFRESH_DEBOUNCE_MS = 120

export function useClipboardHistory() {
  const [entries, setEntries] = useState<ClipboardEntry[]>([])
  const refreshTimer = useRef<number | undefined>(undefined)

  const refresh = useCallback(async () => {
    const history = await getHistory()
    setEntries(history)
  }, [])

  const scheduleRefresh = useCallback(() => {
    window.clearTimeout(refreshTimer.current)
    refreshTimer.current = window.setTimeout(() => {
      void refresh()
    }, REFRESH_DEBOUNCE_MS)
  }, [refresh])

  useEffect(() => {
    let live = true
    void getHistory().then((list) => {
      if (live) setEntries(list)
    })
    const off = eventBus.on('CLIPBOARD_UPDATED', scheduleRefresh)
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && STORAGE_KEYS.clipboardHistory in changes) scheduleRefresh()
    }
    chrome.storage.onChanged.addListener(onStorage)
    return () => {
      live = false
      window.clearTimeout(refreshTimer.current)
      off()
      chrome.storage.onChanged.removeListener(onStorage)
    }
  }, [refresh, scheduleRefresh])

  return { entries, refresh }
}
