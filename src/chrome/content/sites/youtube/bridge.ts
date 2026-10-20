import { PAGE_CMD_KEY, PAGE_EVT_KEY } from '@/core/sites/youtube/constants'

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
