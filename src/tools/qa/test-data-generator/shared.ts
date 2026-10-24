import { useCallback, useRef, useState } from 'react'

export function downloadText(text: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Tracks a short-lived "copied" flag keyed by id, so many copy buttons can share one hook. */
export function useCopyFlag(timeout = 1200) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const copy = useCallback(
    async (text: string, id: string) => {
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        return
      }
      setCopiedId(id)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopiedId(null), timeout)
    },
    [timeout],
  )
  return { copiedId, copy }
}

export const PREVIEW_LIMIT = 50
