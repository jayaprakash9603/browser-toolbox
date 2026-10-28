import { useCallback, useEffect, useRef, useState } from 'react'

import type { FormActionResult } from '@/core/form-memory/model'
import { sendMessage } from '@/core/messaging'

const POLL_MS = 2500
const INSPECT_TIMEOUT_MS = 8000

const UNAVAILABLE: FormActionResult = {
  ok: false,
  reason: 'unavailable',
  filled: 0,
  cleared: 0,
  total: 0,
  populated: 0,
  matched: 0,
  saved: 0,
  shared: 0,
  review: 0,
  learn: true,
}

function inspect(): Promise<FormActionResult | undefined> {
  return Promise.race([
    sendMessage<FormActionResult>({ type: 'FORM_MEMORY_RUN', action: 'inspect' }),
    new Promise<undefined>((resolve) => window.setTimeout(() => resolve(undefined), INSPECT_TIMEOUT_MS)),
  ])
}

/**
 * What the active tab's form looks like right now (how many values are on it, how many are saved
 * for it). It is checked once when shown and when the tab changes; `poll` keeps it fresh so the
 * action button can flip between fill and clear.
 */
export function useFormPage(active: boolean, poll: boolean, pageKey: string | undefined) {
  const [info, setInfo] = useState<FormActionResult | null>(null)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      setInfo((await inspect()) ?? UNAVAILABLE)
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    if (!active) return
    const kick = window.setTimeout(() => void refresh(), 0)
    const timer = poll
      ? window.setInterval(() => {
          if (document.visibilityState === 'visible') void refresh()
        }, POLL_MS)
      : undefined
    const onTab = () => void refresh()
    const onUpdated = (_tabId: number, change: { status?: string }, tab: chrome.tabs.Tab) => {
      if (change.status === 'complete' && tab.active) void refresh()
    }
    chrome.tabs?.onActivated?.addListener(onTab)
    chrome.tabs?.onUpdated?.addListener(onUpdated)
    return () => {
      window.clearTimeout(kick)
      window.clearInterval(timer)
      chrome.tabs?.onActivated?.removeListener(onTab)
      chrome.tabs?.onUpdated?.removeListener(onUpdated)
    }
  }, [active, poll, pageKey, refresh])

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
