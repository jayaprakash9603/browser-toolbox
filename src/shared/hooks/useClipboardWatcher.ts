import { useEffect, useRef } from 'react'

import { addClipboardEntry, readClipboardText } from '@/core/clipboard'
import { eventBus } from '@/core/events'
import { getSettings } from '@/features/settings/settingsService'

const POLL_MS = 450

/**
 * While the clipboard manager is visible, watch the system clipboard and append new
 * copies immediately (settings: record text copied while the panel is open).
 */
export function useClipboardWatcher(active = true): void {
  const lastText = useRef<string | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    let timer: number | undefined

    const captureIfNew = async () => {
      if (cancelled) return
      const settings = await getSettings()
      if (!settings.clipboardHistoryEnabled) return
      let text: string
      try {
        text = await readClipboardText()
      } catch {
        return
      }
      if (!text.trim() || text === lastText.current) return
      lastText.current = text
      await addClipboardEntry(text)
    }

    const start = () => {
      void captureIfNew()
      timer = window.setInterval(() => void captureIfNew(), POLL_MS)
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') void captureIfNew()
    }

    start()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    const offClear = eventBus.on('CLEAR_DATA', ({ scope }) => {
      if (scope === 'clipboardHistory' || scope === 'all') lastText.current = null
    })

    return () => {
      cancelled = true
      if (timer !== undefined) clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      offClear()
    }
  }, [active])
}
