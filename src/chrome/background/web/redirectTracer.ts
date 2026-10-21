import { STORAGE_KEYS } from '@/core/constants'
import { registerMessageHandler } from '@/core/messaging'
import { createLogger } from '@/core/logging'

import type { RedirectHop } from '@/core/web/redirectTrace'

const logger = createLogger('redirect-tracer')

export type RedirectTrace = {
  tabId: number
  hops: RedirectHop[]
}

type TraceStore = Record<string, RedirectTrace>

const SESSION_FLUSH_MS = 500
const store: TraceStore = {}
let sessionFlushTimer: ReturnType<typeof setTimeout> | null = null
let loaded = false

function tabKey(tabId: number): string {
  return String(tabId)
}

function scheduleSessionPersist(): void {
  if (sessionFlushTimer) return
  sessionFlushTimer = setTimeout(() => {
    sessionFlushTimer = null
    void chrome.storage.session.set({ [STORAGE_KEYS.redirectTraceSession]: store })
  }, SESSION_FLUSH_MS)
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return
  loaded = true
  const session = await chrome.storage.session.get(STORAGE_KEYS.redirectTraceSession)
  const stored = session[STORAGE_KEYS.redirectTraceSession] as TraceStore | undefined
  if (stored) Object.assign(store, stored)
}

function appendHop(tabId: number, hop: RedirectHop): void {
  void ensureLoaded().then(() => {
    const key = tabKey(tabId)
    const current = store[key] ?? { tabId, hops: [] }
    const last = current.hops[current.hops.length - 1]
    if (last?.url === hop.url) return
    current.hops.push(hop)
    if (current.hops.length > 40) current.hops.shift()
    store[key] = current
    scheduleSessionPersist()
  })
}

export function registerRedirectTracer(): void {
  chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return
    appendHop(details.tabId, { url: details.url, at: Date.now() })
  })

  chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId !== 0) return
    appendHop(details.tabId, { url: details.url, at: Date.now() })
  })

  chrome.webNavigation.onErrorOccurred.addListener((details) => {
    if (details.frameId !== 0) return
    appendHop(details.tabId, { url: details.url, statusCode: 0, at: Date.now() })
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    void ensureLoaded().then(() => {
      delete store[tabKey(tabId)]
      scheduleSessionPersist()
    })
  })

  registerMessageHandler('REDIRECT_TRACE_GET', async (message, sender) => {
    if (message.type !== 'REDIRECT_TRACE_GET') return null
    const tabId = message.tabId ?? sender.tab?.id
    if (tabId == null) return { hops: [] as RedirectHop[] }
    await ensureLoaded()
    return store[tabKey(tabId)]?.hops ?? []
  })

  registerMessageHandler('REDIRECT_TRACE_CLEAR', async (message, sender) => {
    if (message.type !== 'REDIRECT_TRACE_CLEAR') return null
    const tabId = message.tabId ?? sender.tab?.id
    if (tabId == null) return { cleared: false }
    await ensureLoaded()
    delete store[tabKey(tabId)]
    scheduleSessionPersist()
    return { cleared: true }
  })

  logger.debug('registered')
}
