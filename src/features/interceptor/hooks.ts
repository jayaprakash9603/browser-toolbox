import { useCallback, useEffect, useState } from 'react'

import {
  INTERCEPTOR_NETLOG_PORT,
  getInterceptorState,
  subscribeInterceptorState,
  updateInterceptorSettings,
  type InterceptorSettings,
  type InterceptorState,
  type NetLogEntry,
} from '@/core/interceptor'
import { sendMessage } from '@/core/messaging'

export function useInterceptorState() {
  const [state, setState] = useState<InterceptorState | null>(null)

  useEffect(() => {
    void getInterceptorState().then(setState)
    return subscribeInterceptorState(setState)
  }, [])

  const patchSettings = useCallback(async (patch: Partial<InterceptorSettings>) => {
    const settings = await updateInterceptorSettings(patch)
    setState((prev: InterceptorState | null) => (prev ? { ...prev, settings } : prev))
    void sendMessage({ type: 'INTERCEPTOR_SYNC' })
    return settings
  }, [])

  return { state, setState, patchSettings }
}

const NETLOG_UI_BATCH_MS = 250

export function useInterceptorLog(tabId?: number) {
  const [entries, setEntries] = useState<NetLogEntry[]>([])

  useEffect(() => {
    let port: chrome.runtime.Port | undefined
    const pending: NetLogEntry[] = []
    let batchTimer: ReturnType<typeof setTimeout> | null = null
    const flushBatch = () => {
      batchTimer = null
      if (!pending.length) return
      const batch = pending.splice(0, pending.length)
      setEntries((prev) => [...prev, ...batch].slice(-2000))
    }
    const connect = () => {
      port = chrome.runtime.connect({ name: INTERCEPTOR_NETLOG_PORT })
      port.onMessage.addListener((msg: { type: string; entry: NetLogEntry }) => {
        if (msg.type === 'entry') {
          if (tabId == null || msg.entry.tabId === tabId) {
            pending.push(msg.entry)
            if (!batchTimer) batchTimer = setTimeout(flushBatch, NETLOG_UI_BATCH_MS)
          }
        }
      })
    }
    connect()
    void sendMessage<NetLogEntry[]>({ type: 'INTERCEPTOR_GET_LOG', tabId }).then((data) => {
      if (Array.isArray(data)) setEntries(data)
    })
    return () => {
      if (batchTimer) clearTimeout(batchTimer)
      port?.disconnect()
    }
  }, [tabId])

  const clear = useCallback(() => {
    void sendMessage({ type: 'INTERCEPTOR_CLEAR_LOG', tabId })
    setEntries([])
  }, [tabId])

  return { entries, clear }
}
