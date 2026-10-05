import { useCallback, useEffect, useState } from 'react'

import { getHistory, type ClipboardEntry } from '@/core/clipboard'
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
    return () => {
      live = false
      off()
    }
  }, [refresh])

  return { entries, refresh }
}
