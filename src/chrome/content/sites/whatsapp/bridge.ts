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
