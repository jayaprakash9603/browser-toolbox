import { useCallback, useEffect, useRef, useState } from 'react'

import type { FormActionResult } from '@/core/form-memory/model'
import { sendMessage } from '@/core/messaging'

const POLL_MS = 2500

/**
 * What the active tab's form looks like right now (how many values are on it, how many are saved
 * for it), refreshed while the panel is visible so the action button can flip between fill and clear.
 */
export function useFormPage(active: boolean, pageKey: string | undefined) {
  const [info, setInfo] = useState<FormActionResult | null>(null)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const next = await sendMessage<FormActionResult>({ type: 'FORM_MEMORY_RUN', action: 'inspect' })
      if (next) setInfo(next)
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    if (!active) return
    const kick = window.setTimeout(() => void refresh(), 0)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, POLL_MS)
    const onTab = () => void refresh()
    chrome.tabs?.onActivated?.addListener(onTab)
    return () => {
      window.clearTimeout(kick)
      window.clearInterval(timer)
      chrome.tabs?.onActivated?.removeListener(onTab)
    }
  }, [active, pageKey, refresh])

  const run = useCallback(
    async (action: 'fill' | 'clear' | 'save') => {
      const result = await sendMessage<FormActionResult>({ type: 'FORM_MEMORY_RUN', action })
      if (result) setInfo(result)
      void refresh()
      return result
    },
    [refresh],
  )

  return { info, refresh, run }
}
