import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'
import { registerMessageHandler } from '@/core/messaging'
import { createLogger } from '@/core/logging'

const logger = createLogger('redirect-tracer')

import type { RedirectHop } from '@/core/web/redirectTrace'

export type RedirectTrace = {
  tabId: number
  hops: RedirectHop[]
}

type TraceStore = Record<string, RedirectTrace>

function tabKey(tabId: number): string {
  return String(tabId)
}

async function loadStore(): Promise<TraceStore> {
  return (await get<TraceStore>(STORAGE_KEYS.redirectTrace)) ?? {}
}

async function saveStore(store: TraceStore): Promise<void> {
  await set(STORAGE_KEYS.redirectTrace, store)
}

async function appendHop(tabId: number, hop: RedirectHop): Promise<void> {
  const store = await loadStore()
  const key = tabKey(tabId)
  const current = store[key] ?? { tabId, hops: [] }
  const last = current.hops[current.hops.length - 1]
  if (last?.url === hop.url) return
  current.hops.push(hop)
  if (current.hops.length > 40) current.hops.shift()
  store[key] = current
  await saveStore(store)
}

export function registerRedirectTracer(): void {
  chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return
    void appendHop(details.tabId, { url: details.url, at: Date.now() })
  })

  chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId !== 0) return
    void appendHop(details.tabId, { url: details.url, at: Date.now() })
  })

  chrome.webNavigation.onErrorOccurred.addListener((details) => {
    if (details.frameId !== 0) return
    void appendHop(details.tabId, { url: details.url, statusCode: 0, at: Date.now() })
  })

  chrome.tabs.onRemoved.addListener(async (tabId) => {
    const store = await loadStore()
    delete store[tabKey(tabId)]
    await saveStore(store)
  })

  registerMessageHandler('REDIRECT_TRACE_GET', async (message, sender) => {
    if (message.type !== 'REDIRECT_TRACE_GET') return null
    const tabId = message.tabId ?? sender.tab?.id
    if (tabId == null) return { hops: [] as RedirectHop[] }
    const store = await loadStore()
    return store[tabKey(tabId)]?.hops ?? []
  })

  registerMessageHandler('REDIRECT_TRACE_CLEAR', async (message, sender) => {
    if (message.type !== 'REDIRECT_TRACE_CLEAR') return null
    const tabId = message.tabId ?? sender.tab?.id
    if (tabId == null) return { cleared: false }
    const store = await loadStore()
    delete store[tabKey(tabId)]
    await saveStore(store)
    return { cleared: true }
  })

  logger.debug('registered')
}
