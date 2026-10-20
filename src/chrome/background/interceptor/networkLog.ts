import {
  INTERCEPTOR_NETLOG_PORT,
  INTERCEPTOR_SESSION_LOG_KEY,
  getInterceptorState,
  matchRules,
  type NetLogEntry,
} from '@/core/interceptor'
import { createLogger } from '@/core/logging'

const logger = createLogger('interceptor-netlog')

type Pending = Partial<NetLogEntry> & { requestId: string; tabId: number }

const pending = new Map<string, Pending>()
const buffers = new Map<number, NetLogEntry[]>()
const ports = new Set<chrome.runtime.Port>()
let recording = true
let logSize = 1000

function entryKey(tabId: number, requestId: string): string {
  return `${tabId}:${requestId}`
}

function broadcast(entry: NetLogEntry): void {
  for (const port of ports) {
    try {
      port.postMessage({ type: 'entry', entry })
    } catch {
      ports.delete(port)
    }
  }
}

function pushEntry(tabId: number, entry: NetLogEntry): void {
  const buf = buffers.get(tabId) ?? []
  buf.push(entry)
  while (buf.length > logSize) buf.shift()
  buffers.set(tabId, buf)
  void chrome.storage.session.set({ [INTERCEPTOR_SESSION_LOG_KEY]: serializeBuffers() })
  broadcast(entry)
}

function serializeBuffers(): Record<number, NetLogEntry[]> {
  const out: Record<number, NetLogEntry[]> = {}
  for (const [tabId, entries] of buffers) out[tabId] = entries
  return out
}

async function annotateRules(entry: Pending): Promise<string[]> {
  const state = await getInterceptorState()
  if (state.settings.paused) return []
  const matched = matchRules(state.rules, {
    url: entry.url ?? '',
    method: entry.method,
    resourceType: entry.resourceType,
  })
  return matched.map((r: { id: string }) => r.id)
}

export function getLogForTab(tabId: number): NetLogEntry[] {
  return buffers.get(tabId) ?? []
}

export function clearLog(tabId?: number): void {
  if (tabId === undefined) {
    buffers.clear()
  } else {
    buffers.delete(tabId)
  }
  void chrome.storage.session.set({ [INTERCEPTOR_SESSION_LOG_KEY]: serializeBuffers() })
}

export function setRecording(on: boolean): void {
  recording = on
}

export function connectNetlogPort(port: chrome.runtime.Port): void {
  if (port.name !== INTERCEPTOR_NETLOG_PORT) return
  ports.add(port)
  port.onDisconnect.addListener(() => ports.delete(port))
}

async function loadBuffers(): Promise<void> {
  const session = await chrome.storage.session.get(INTERCEPTOR_SESSION_LOG_KEY)
  const stored = session[INTERCEPTOR_SESSION_LOG_KEY] as Record<number, NetLogEntry[]> | undefined
  if (!stored) return
  for (const [key, entries] of Object.entries(stored)) {
    buffers.set(Number(key), entries)
  }
}

export async function initNetworkLog(): Promise<void> {
  await loadBuffers()
  const state = await getInterceptorState()
  logSize = state.settings.logSize

  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (!recording || details.tabId < 0) return
      const key = entryKey(details.tabId, details.requestId)
      pending.set(key, {
        id: key,
        requestId: details.requestId,
        tabId: details.tabId,
        startedAt: details.timeStamp,
        method: details.method,
        url: details.url,
        resourceType: details.type,
        appliedRuleIds: [],
        modified: false,
      })
    },
    { urls: ['<all_urls>'] },
  )

  chrome.webRequest.onSendHeaders.addListener(
    (details) => {
      const key = entryKey(details.tabId, details.requestId)
      const p = pending.get(key)
      if (!p) return
      p.requestHeaders = details.requestHeaders?.map((h) => ({
        name: h.name,
        value: h.value,
      }))
    },
    { urls: ['<all_urls>'] },
    ['requestHeaders'],
  )

  chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
      const key = entryKey(details.tabId, details.requestId)
      const p = pending.get(key)
      if (!p) return
      p.status = details.statusCode
      p.responseHeaders = details.responseHeaders?.map((h) => ({
        name: h.name,
        value: h.value,
      }))
    },
    { urls: ['<all_urls>'] },
    ['responseHeaders'],
  )

  const finalize = async (details: {
    tabId: number
    requestId: string
    timeStamp: number
    statusCode?: number
    error?: string
  }) => {
    const key = entryKey(details.tabId, details.requestId)
    const p = pending.get(key)
    if (!p || !p.url) return
    pending.delete(key)
    const ruleIds = await annotateRules(p)
    const entry: NetLogEntry = {
      id: p.id ?? key,
      tabId: p.tabId,
      requestId: p.requestId,
      startedAt: p.startedAt ?? details.timeStamp,
      completedAt: details.timeStamp,
      method: p.method ?? 'GET',
      url: p.url,
      status: p.status ?? details.statusCode,
      resourceType: p.resourceType,
      requestHeaders: p.requestHeaders,
      responseHeaders: p.responseHeaders,
      requestBody: p.requestBody,
      responseBody: p.responseBody,
      durationMs: details.timeStamp - (p.startedAt ?? details.timeStamp),
      appliedRuleIds: [...(p.appliedRuleIds ?? []), ...ruleIds],
      modified: ruleIds.length > 0 || Boolean(p.modified),
      fromPageScript: p.fromPageScript,
      error: (details as { error?: string }).error,
    }
    pushEntry(details.tabId, entry)
  }

  chrome.webRequest.onCompleted.addListener(
    (details) => void finalize(details),
    { urls: ['<all_urls>'] },
  )

  chrome.webRequest.onErrorOccurred.addListener(
    (details) => void finalize(details),
    { urls: ['<all_urls>'] },
  )
}

export function mergePageEvent(
  tabId: number,
  requestId: string,
  patch: Partial<NetLogEntry>,
): void {
  const key = entryKey(tabId, requestId)
  const p = pending.get(key)
  if (p) {
    Object.assign(p, patch, { modified: true, fromPageScript: true })
    return
  }
  const buf = buffers.get(tabId) ?? []
  const idx = buf.findIndex((e) => e.url === patch.url && !e.completedAt)
  if (idx >= 0) {
    buf[idx] = { ...buf[idx], ...patch, modified: true, fromPageScript: true }
    buffers.set(tabId, buf)
    broadcast(buf[idx])
  }
}

export async function refreshLogSize(): Promise<void> {
  const state = await getInterceptorState()
  logSize = state.settings.logSize
}

logger.debug('network log module loaded')
