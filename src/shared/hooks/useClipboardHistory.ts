import { useCallback, useEffect, useState } from 'react'

import { getHistory, type ClipboardEntry } from '@/core/clipboard'
import { STORAGE_KEYS } from '@/core/constants'
import { eventBus } from '@/core/events'

export function useClipboardHistory() {
  const [entries, setEntries] = useState<ClipboardEntry[]>([])

  const refresh = useCallback(async () => {
    const history = await getHistory()
    setEntries(history)
  }, [])

  useEffect(() => {
    let live = true
    void getHistory().then((list) => {
      if (live) setEntries(list)
    })
    const off = eventBus.on('CLIPBOARD_UPDATED', () => void refresh())
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && STORAGE_KEYS.clipboardHistory in changes) void refresh()
    }
    chrome.storage.onChanged.addListener(onStorage)
    return () => {
      live = false
      off()
      chrome.storage.onChanged.removeListener(onStorage)
    }
  }, [refresh])

  return { entries, refresh }
}
