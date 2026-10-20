import type { AnalyticsRange } from '@/core/sites/whatsapp/analytics'
import type { ChatExportOptions } from '@/core/sites/whatsapp/chatExport'
import { PAGE_CMD_KEY, PAGE_EVT_KEY } from '@/core/sites/whatsapp/constants'

export function postToMain(command: string, payload?: unknown): void {
  window.postMessage({ [PAGE_CMD_KEY]: command, payload }, location.origin || '*')
}

export function onMainEvent(handler: (event: string, payload: unknown) => void): void {
  window.addEventListener('message', (e) => {
    if (e.source !== window) return
    const data = e.data as Record<string, unknown> | null
    if (!data || typeof data !== 'object') return
    const evt = data[PAGE_EVT_KEY]
    if (typeof evt === 'string') handler(evt, data.payload)
  })
}

let reqSeq = 0

/** Sends `query` to the main world and resolves with its `queryResult` rows (empty on timeout). */
export function queryMain(kind: string, timeoutMs = 15000): Promise<Record<string, string>[]> {
  const reqId = `q${Date.now()}_${++reqSeq}`
  return new Promise((resolve) => {
    const finish = (rows: Record<string, string>[]) => {
      window.removeEventListener('message', listener)
      clearTimeout(timer)
      resolve(rows)
    }
    const listener = (e: MessageEvent) => {
      if (e.source !== window) return
      const data = e.data as Record<string, unknown> | null
      if (!data || data[PAGE_EVT_KEY] !== 'queryResult') return
      const p = data.payload as { reqId?: string; rows?: Record<string, string>[] } | undefined
      if (p?.reqId === reqId) finish(Array.isArray(p.rows) ? p.rows : [])
    }
    const timer = setTimeout(() => finish([]), timeoutMs)
    window.addEventListener('message', listener)
    postToMain('query', { kind, reqId })
  })
}

export function exportChatMain(
  options: ChatExportOptions,
  timeoutMs = 60_000,
): Promise<{ filename: string; mime: string; content: string } | null> {
  const reqId = `ec${Date.now()}_${++reqSeq}`
  return new Promise((resolve) => {
    const finish = (file: { filename: string; mime: string; content: string } | null) => {
      window.removeEventListener('message', listener)
      clearTimeout(timer)
      resolve(file)
    }
    const listener = (e: MessageEvent) => {
      if (e.source !== window) return
      const data = e.data as Record<string, unknown> | null
      if (!data || data[PAGE_EVT_KEY] !== 'exportChatResult') return
      const p = data.payload as { reqId?: string; file?: { filename: string; mime: string; content: string } | null }
      if (p?.reqId === reqId) finish(p.file ?? null)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    window.addEventListener('message', listener)
    postToMain('exportChat', { reqId, options })
  })
}

export function analyticsMain(
  range: AnalyticsRange,
  onProgress?: (message: string) => void,
  timeoutMs = 120_000,
): Promise<import('@/core/sites/whatsapp/analytics').RawDataset | null> {
  const reqId = `an${Date.now()}_${++reqSeq}`
  return new Promise((resolve) => {
    const finish = (dataset: import('@/core/sites/whatsapp/analytics').RawDataset | null) => {
      window.removeEventListener('message', listener)
      clearTimeout(timer)
      resolve(dataset)
    }
    const listener = (e: MessageEvent) => {
      if (e.source !== window) return
      const data = e.data as Record<string, unknown> | null
      if (!data) return
      const evt = data[PAGE_EVT_KEY]
      const p = data.payload as { reqId?: string; message?: string; dataset?: import('@/core/sites/whatsapp/analytics').RawDataset }
      if (evt === 'analyticsProgress' && p?.reqId === reqId && p.message) onProgress?.(p.message)
      if (evt === 'analyticsResult' && p?.reqId === reqId) finish(p.dataset ?? null)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    window.addEventListener('message', listener)
    postToMain('analytics', { reqId, range })
  })
}
