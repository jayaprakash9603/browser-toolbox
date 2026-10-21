import {
  INTERCEPTOR_NETLOG_PORT,
  INTERCEPTOR_SESSION_LOG_KEY,
  getInterceptorState,
  isRuleActive,
  matchRules,
  type InterceptorRuleHit,
  type InterceptorState,
  type NetLogEntry,
} from '@/core/interceptor'
import { createLogger } from '@/core/logging'

import { hitsWithActions, notifyTabRuleToast } from './ruleToast'

const logger = createLogger('interceptor-netlog')

type Pending = Partial<NetLogEntry> & { requestId: string; tabId: number }

const pending = new Map<string, Pending>()
const buffers = new Map<number, NetLogEntry[]>()
const ports = new Set<chrome.runtime.Port>()
let logSize = 1000
let cachedState: InterceptorState | null = null
let sessionFlushTimer: ReturnType<typeof setTimeout> | null = null
let redirectListenerAttached = false
let recordListenersAttached = false

const SESSION_FLUSH_MS = 1000

function entryKey(tabId: number, requestId: string): string {
  return `${tabId}:${requestId}`
}

function hasActiveRules(state: InterceptorState): boolean {
  if (state.settings.paused) return false
  return state.rules.some((r) => isRuleActive(r, state.groups))
}

function shouldAttachListeners(): boolean {
  return ports.size > 0 || (cachedState != null && hasActiveRules(cachedState))
}

function shouldRecordEntries(): boolean {
  return ports.size > 0
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

function serializeBuffers(): Record<number, NetLogEntry[]> {
  const out: Record<number, NetLogEntry[]> = {}
  for (const [tabId, entries] of buffers) out[tabId] = entries
  return out
}

function scheduleSessionFlush(): void {
  if (sessionFlushTimer) return
  sessionFlushTimer = setTimeout(() => {
    sessionFlushTimer = null
    void chrome.storage.session.set({ [INTERCEPTOR_SESSION_LOG_KEY]: serializeBuffers() })
  }, SESSION_FLUSH_MS)
}

function pushEntry(tabId: number, entry: NetLogEntry): void {
  if (!shouldRecordEntries()) return
  const buf = buffers.get(tabId) ?? []
  buf.push(entry)
  while (buf.length > logSize) buf.shift()
  buffers.set(tabId, buf)
  scheduleSessionFlush()
  broadcast(entry)
}

function annotateRules(entry: Pending): InterceptorRuleHit[] {
  const state = cachedState
  if (!state || state.settings.paused) return []
  const matched = matchRules(
    state.rules,
    {
      url: entry.url ?? '',
      method: entry.method,
      resourceType: entry.resourceType,
    },
    state.groups,
  )
  return hitsWithActions(
    matched.map((r) => ({
      ruleId: r.id,
      ruleName: r.name,
      ruleType: r.type,
      action: 'matched',
    })),
  )
}

function mergeRuleHits(
  existing: InterceptorRuleHit[] | undefined,
  incoming: InterceptorRuleHit[] | undefined,
): InterceptorRuleHit[] {
  const out = [...(existing ?? [])]
  for (const hit of incoming ?? []) {
    if (!out.some((h) => h.ruleId === hit.ruleId && h.action === hit.action)) out.push(hit)
  }
  return out
}

export function invalidateCachedInterceptorState(state?: InterceptorState): void {
  cachedState = state ?? null
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

export function connectNetlogPort(port: chrome.runtime.Port): void {
  if (port.name !== INTERCEPTOR_NETLOG_PORT) return
  ports.add(port)
  port.onDisconnect.addListener(() => {
    ports.delete(port)
    void updateNetlogListeners()
  })
  void updateNetlogListeners()
}

async function loadBuffers(): Promise<void> {
  const session = await chrome.storage.session.get(INTERCEPTOR_SESSION_LOG_KEY)
  const stored = session[INTERCEPTOR_SESSION_LOG_KEY] as Record<number, NetLogEntry[]> | undefined
  if (!stored) return
  for (const [key, entries] of Object.entries(stored)) {
    buffers.set(Number(key), entries)
  }
}

const onBeforeRequest = (details: chrome.webRequest.OnBeforeRequestDetails): undefined => {
  if (!shouldRecordEntries() || details.tabId < 0) return undefined
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
  return undefined
}

const onBeforeRedirect = (details: chrome.webRequest.OnBeforeRedirectDetails): undefined => {
  if (details.tabId < 0) return undefined
  const key = entryKey(details.tabId, details.requestId)
  const p = pending.get(key)
  if (!p) return undefined
  p.modified = true
  p.effectiveUrl = details.redirectUrl
  const hits = annotateRules(p)
  p.ruleHits = mergeRuleHits(p.ruleHits, hits)
  p.appliedRuleIds = [...new Set([...(p.appliedRuleIds ?? []), ...hits.map((h) => h.ruleId)])]
  void notifyTabRuleToast(details.tabId, p.url ?? details.url, hits)
  return undefined
}

const onSendHeaders = (details: chrome.webRequest.OnSendHeadersDetails): undefined => {
  if (!shouldRecordEntries()) return undefined
  const key = entryKey(details.tabId, details.requestId)
  const p = pending.get(key)
  if (!p) return undefined
  p.requestHeaders = details.requestHeaders?.map((h: chrome.webRequest.HttpHeader) => ({
    name: h.name,
    value: h.value,
  }))
  return undefined
}

const onHeadersReceived = (details: chrome.webRequest.OnHeadersReceivedDetails): undefined => {
  if (!shouldRecordEntries()) return undefined
  const key = entryKey(details.tabId, details.requestId)
  const p = pending.get(key)
  if (!p) return undefined
  p.status = details.statusCode
  p.responseHeaders = details.responseHeaders?.map((h: chrome.webRequest.HttpHeader) => ({
    name: h.name,
    value: h.value,
  }))
  return undefined
}

const finalize = (details: {
  tabId: number
  requestId: string
  timeStamp: number
  statusCode?: number
  error?: string
}) => {
  if (!shouldRecordEntries()) return
  const key = entryKey(details.tabId, details.requestId)
  const p = pending.get(key)
  if (!p || !p.url) return
  pending.delete(key)
  const hits = annotateRules(p)
  const mergedHits = mergeRuleHits(p.ruleHits, hits)
  const ruleIds = [...new Set([...(p.appliedRuleIds ?? []), ...mergedHits.map((h) => h.ruleId)])]
  const entry: NetLogEntry = {
    id: p.id ?? key,
    tabId: p.tabId,
    requestId: p.requestId,
    startedAt: p.startedAt ?? details.timeStamp,
    completedAt: details.timeStamp,
    method: p.method ?? 'GET',
    url: p.url,
    effectiveUrl: p.effectiveUrl,
    status: p.status ?? details.statusCode,
    resourceType: p.resourceType,
    requestHeaders: p.requestHeaders,
    responseHeaders: p.responseHeaders,
    requestBody: p.requestBody,
    responseBody: p.responseBody,
    durationMs: details.timeStamp - (p.startedAt ?? details.timeStamp),
    appliedRuleIds: ruleIds,
    ruleHits: mergedHits,
    modified:
      ruleIds.length > 0 ||
      Boolean(p.modified) ||
      (details as { error?: string }).error === 'net::ERR_BLOCKED_BY_CLIENT',
    fromPageScript: p.fromPageScript,
    error: (details as { error?: string }).error,
  }
  pushEntry(details.tabId, entry)
  if (entry.error === 'net::ERR_BLOCKED_BY_CLIENT' && mergedHits.length) {
    void notifyTabRuleToast(details.tabId, entry.url, mergedHits)
  }
}

const onCompleted = (details: chrome.webRequest.OnCompletedDetails): undefined => {
  finalize(details)
  return undefined
}

const onErrorOccurred = (details: chrome.webRequest.OnErrorOccurredDetails): undefined => {
  finalize(details)
  return undefined
}

function attachRedirectListener(): void {
  if (redirectListenerAttached) return
  redirectListenerAttached = true
  chrome.webRequest.onBeforeRedirect.addListener(onBeforeRedirect, { urls: ['<all_urls>'] })
}

function detachRedirectListener(): void {
  if (!redirectListenerAttached) return
  redirectListenerAttached = false
  try {
    chrome.webRequest.onBeforeRedirect.removeListener(onBeforeRedirect)
  } catch {
    /* already removed */
  }
}

function attachRecordListeners(): void {
  if (recordListenersAttached) return
  recordListenersAttached = true
  chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, { urls: ['<all_urls>'] })
  chrome.webRequest.onSendHeaders.addListener(onSendHeaders, { urls: ['<all_urls>'] }, ['requestHeaders'])
  chrome.webRequest.onHeadersReceived.addListener(
    onHeadersReceived,
    { urls: ['<all_urls>'] },
    ['responseHeaders'],
  )
  chrome.webRequest.onCompleted.addListener(onCompleted, { urls: ['<all_urls>'] })
  chrome.webRequest.onErrorOccurred.addListener(onErrorOccurred, { urls: ['<all_urls>'] })
}

function detachRecordListeners(): void {
  if (!recordListenersAttached) return
  recordListenersAttached = false
  try {
    chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequest)
    chrome.webRequest.onSendHeaders.removeListener(onSendHeaders)
    chrome.webRequest.onHeadersReceived.removeListener(onHeadersReceived)
    chrome.webRequest.onCompleted.removeListener(onCompleted)
    chrome.webRequest.onErrorOccurred.removeListener(onErrorOccurred)
  } catch {
    /* already removed */
  }
}

export async function updateNetlogListeners(state?: InterceptorState): Promise<void> {
  if (state) cachedState = state
  if (!cachedState) cachedState = await getInterceptorState()
  if (shouldAttachListeners()) attachRedirectListener()
  else detachRedirectListener()
  if (shouldRecordEntries()) attachRecordListeners()
  else {
    detachRecordListeners()
    pending.clear()
  }
}

export async function initNetworkLog(): Promise<void> {
  await loadBuffers()
  cachedState = await getInterceptorState()
  logSize = cachedState.settings.logSize
  await updateNetlogListeners(cachedState)
}

export function mergePageEvent(
  tabId: number,
  requestId: string,
  patch: Partial<NetLogEntry>,
): void {
  const key = entryKey(tabId, requestId)
  const p = pending.get(key)
  const mergePatch = (base: Pending | NetLogEntry): Partial<NetLogEntry> => {
    const hits = mergeRuleHits(base.ruleHits, patch.ruleHits)
    const ids = [...new Set([...(base.appliedRuleIds ?? []), ...(patch.appliedRuleIds ?? []), ...hits.map((h) => h.ruleId)])]
    return {
      ...patch,
      appliedRuleIds: ids,
      ruleHits: hits,
      modified: true,
      fromPageScript: true,
    }
  }
  if (p) {
    Object.assign(p, mergePatch(p))
    return
  }
  const pendingByUrl = [...pending.entries()].find(
    ([k, row]) => k.startsWith(`${tabId}:`) && row.url === patch.url,
  )
  if (pendingByUrl) {
    Object.assign(pendingByUrl[1], mergePatch(pendingByUrl[1]))
    return
  }
  const buf = buffers.get(tabId) ?? []
  const idx = buf.findIndex((e) => e.url === patch.url)
  if (idx >= 0) {
    buf[idx] = { ...buf[idx], ...mergePatch(buf[idx]) }
    buffers.set(tabId, buf)
    broadcast(buf[idx])
  }
}

export async function refreshLogSize(state?: InterceptorState): Promise<void> {
  const resolved = state ?? cachedState ?? await getInterceptorState()
  logSize = resolved.settings.logSize
}

logger.debug('network log module loaded')
