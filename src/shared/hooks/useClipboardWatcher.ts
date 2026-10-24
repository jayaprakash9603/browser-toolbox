import { useEffect } from 'react'

import { addClipboardEntry } from '@/core/clipboard'
import { readCopySelection } from '@/core/clipboard/readCopySelection'

/**
 * Records copies while the Clipboard Manager is on screen.
 * Page copies arrive through the content script (no polling). Copies made inside
 * the panel are read from the selection here, because the async clipboard read
 * stalls for seconds when the side panel is not focused.
 */
export function useClipboardWatcher(active = true): void {
  useEffect(() => {
    if (!active) return

    void chrome.runtime
      .sendMessage({ type: 'CLIPBOARD_WATCH', active: true })
      .catch(() => undefined)

    const onEdit = (event: ClipboardEvent) => {
      const custom = event.clipboardData?.getData('text/plain')
      const text = custom || (event.defaultPrevented ? '' : readCopySelection(document))
      if (!text.trim()) return
      void addClipboardEntry(text)
    }
    document.addEventListener('copy', onEdit)
    document.addEventListener('cut', onEdit)

    return () => {
      document.removeEventListener('copy', onEdit)
      document.removeEventListener('cut', onEdit)
      void chrome.runtime
        .sendMessage({ type: 'CLIPBOARD_WATCH', active: false })
        .catch(() => undefined)
    }
  }, [active])
}
