import {
  SECURITY_NETLOG_PORT,
  toNetworkRecord,
  type NetworkRequestRecord,
} from '@/core/security-center'
import { getSecurityCenterSettings } from '@/core/security-center'
import { createLogger } from '@/core/logging'

const logger = createLogger('security-netlog')

type Pending = Partial<NetworkRequestRecord> & { requestId: string; tabId: number }

const pending = new Map<string, Pending>()
const buffers = new Map<number, NetworkRequestRecord[]>()
const ports = new Set<chrome.runtime.Port>()
const pageUrlByTab = new Map<number, string>()
let capturePaused = false
let logSize = 400
let listenersAttached = false

function key(tabId: number, requestId: string): string {
  return `${tabId}:${requestId}`
}

function broadcast(entry: NetworkRequestRecord): void {
  for (const port of ports) {
    try {
      port.postMessage({ type: 'entry', entry })
    } catch {
      ports.delete(port)
    }
  }
}

function push(entry: NetworkRequestRecord): void {
  if (capturePaused) return
  const buf = buffers.get(entry.tabId) ?? []
  const existing = buf.findIndex((item) => item.id === entry.id)
  if (existing >= 0) buf[existing] = { ...buf[existing], ...entry }
  else buf.push(entry)
  while (buf.length > logSize) buf.shift()
  buffers.set(entry.tabId, buf)
  broadcast(entry)
}

function tabUrl(tabId: number, fallback?: string): string | undefined {
  return pageUrlByTab.get(tabId) ?? fallback
}

const onBeforeRequest = (details: chrome.webRequest.OnBeforeRequestDetails): undefined => {
  if (details.tabId < 0) return undefined
  if (details.type === 'main_frame' && details.url) pageUrlByTab.set(details.tabId, details.url)
  pending.set(key(details.tabId, details.requestId), {
    requestId: details.requestId,
    tabId: details.tabId,
    url: details.url,
    method: details.method,
    resourceType: details.type,
    timestamp: details.timeStamp,
    initiator: details.initiator,
  })
  return undefined
}

function finalize(
  details: {
    tabId: number
    requestId: string
    url: string
    method: string
    type: string
    timeStamp: number
    statusCode?: number
    responseHeaders?: chrome.webRequest.HttpHeader[]
  },
  extra?: Partial<NetworkRequestRecord>,
): void {
  if (details.tabId < 0) return
  const current = pending.get(key(details.tabId, details.requestId)) ?? {
    requestId: details.requestId,
    tabId: details.tabId,
    url: details.url,
    method: details.method,
    timestamp: details.timeStamp,
  }
  pending.delete(key(details.tabId, details.requestId))
  push(
    toNetworkRecord({
      requestId: current.requestId,
      tabId: current.tabId,
      url: current.url ?? details.url,
      method: current.method ?? details.method,
      status: details.statusCode ?? extra?.status,
      resourceType: current.resourceType ?? details.type,
      timestamp: current.timestamp ?? details.timeStamp,
      completedAt: details.timeStamp,
      initiator: current.initiator,
      pageUrl: tabUrl(details.tabId, details.type === 'main_frame' ? details.url : undefined),
      requestHeaders: current.requestHeaders,
      responseHeaders: details.responseHeaders?.map((header) => ({ name: header.name, value: header.value })),
      error: extra?.error,
      blocked: extra?.blocked,
    }),
  )
}

const onCompleted = (details: chrome.webRequest.OnCompletedDetails): undefined => {
  finalize(details)
  return undefined
}

const onErrorOccurred = (details: chrome.webRequest.OnErrorOccurredDetails): undefined => {
  const blocked = details.error === 'net::ERR_BLOCKED_BY_CLIENT' || details.error === 'net::ERR_BLOCKED_BY_RESPONSE'
  finalize(details, { error: details.error, blocked, status: blocked ? 0 : undefined })
  return undefined
}

function attach(): void {
  if (listenersAttached) return
  if (!chrome.webRequest?.onBeforeRequest) return
  chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, { urls: ['http://*/*', 'https://*/*'] })
  chrome.webRequest.onCompleted.addListener(onCompleted, { urls: ['http://*/*', 'https://*/*'] }, ['responseHeaders'])
  chrome.webRequest.onErrorOccurred.addListener(onErrorOccurred, { urls: ['http://*/*', 'https://*/*'] })
  listenersAttached = true
}

function detach(): void {
  if (!listenersAttached || !chrome.webRequest?.onBeforeRequest) return
  chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequest)
  chrome.webRequest.onCompleted.removeListener(onCompleted)
  chrome.webRequest.onErrorOccurred.removeListener(onErrorOccurred)
  listenersAttached = false
}

function maybeAttach(): void {
  if (ports.size > 0) attach()
  else detach()
}

export function getNetworkLog(tabId?: number): NetworkRequestRecord[] {
  if (tabId == null) return [...buffers.values()].flat()
  return buffers.get(tabId) ?? []
}

export function clearNetworkLog(tabId?: number): void {
  if (tabId == null) {
    buffers.clear()
    pending.clear()
    return
  }
  buffers.delete(tabId)
}

export function setCapturePaused(paused: boolean): void {
  capturePaused = paused
}

export function isCapturePaused(): boolean {
  return capturePaused
}

export function connectNetlogPort(port: chrome.runtime.Port): void {
  ports.add(port)
  void getSecurityCenterSettings().then((settings) => {
    logSize = settings.networkLogSize
  })
  maybeAttach()
  port.onDisconnect.addListener(() => {
    ports.delete(port)
    maybeAttach()
  })
}

export function registerSecurityNetlog(): void {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== SECURITY_NETLOG_PORT) return
    connectNetlogPort(port)
  })
  chrome.tabs.onRemoved.addListener((tabId) => {
    buffers.delete(tabId)
    pageUrlByTab.delete(tabId)
  })
  logger.debug('netlog ready')
}
