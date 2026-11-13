type HeaderRow = [string, string]

interface CaptureState {
  requestId: string
  url: string
  method: string
  chromeRequestId?: string
  rows: HeaderRow[]
}

const pendingByRequestId = new Map<string, CaptureState>()
const byChromeRequestId = new Map<string, CaptureState>()

let listenersAttached = false

function hasWebRequestApi(): boolean {
  return Boolean(chrome.webRequest?.onBeforeRequest && chrome.webRequest?.onHeadersReceived)
}

function hrefOf(url: string): string {
  try {
    return new URL(url).href
  } catch {
    return url
  }
}

function methodsEqual(a?: string, b?: string): boolean {
  return (a ?? 'GET').toUpperCase() === (b ?? 'GET').toUpperCase()
}

function chromeHeadersToRows(list?: chrome.webRequest.HttpHeader[]): HeaderRow[] {
  if (!list?.length) return []
  const rows: HeaderRow[] = []
  for (const header of list) {
    const name = header.name?.trim()
    if (!name) continue
    rows.push([name, header.value ?? ''])
  }
  return rows
}

const onBeforeRequest = (
  details: chrome.webRequest.OnBeforeRequestDetails,
): chrome.webRequest.BlockingResponse | undefined => {
  if (details.tabId !== -1) return undefined
  for (const capture of pendingByRequestId.values()) {
    if (capture.chromeRequestId !== undefined) continue
    if (hrefOf(details.url) !== hrefOf(capture.url)) continue
    if (!methodsEqual(details.method, capture.method)) continue
    capture.chromeRequestId = details.requestId
    byChromeRequestId.set(details.requestId, capture)
    return undefined
  }
  return undefined
}

const onHeadersReceived = (
  details: chrome.webRequest.OnHeadersReceivedDetails,
): chrome.webRequest.BlockingResponse | undefined => {
  const capture = byChromeRequestId.get(details.requestId)
  if (!capture) return undefined
  capture.rows = chromeHeadersToRows(details.responseHeaders)
  return undefined
}

const onCompleted = (details: chrome.webRequest.OnCompletedDetails): void => {
  byChromeRequestId.delete(details.requestId)
}

const onErrorOccurred = (details: chrome.webRequest.OnErrorOccurredDetails): void => {
  byChromeRequestId.delete(details.requestId)
}

function attachListeners(): void {
  if (listenersAttached || !hasWebRequestApi()) return
  listenersAttached = true
  const filter = { urls: ['<all_urls>'] as string[] }
  chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, filter)
  chrome.webRequest.onHeadersReceived.addListener(onHeadersReceived, filter, [
    'responseHeaders',
    'extraHeaders',
  ])
  chrome.webRequest.onCompleted.addListener(onCompleted, filter)
  chrome.webRequest.onErrorOccurred.addListener(onErrorOccurred, filter)
}

async function webRequestGranted(): Promise<boolean> {
  if (!hasWebRequestApi()) return false
  try {
    return await chrome.permissions.contains({ permissions: ['webRequest'] })
  } catch {
    return false
  }
}

export function initApiClientResponseHeaderCapture(): void {
  attachListeners()
}

export async function registerApiClientHeaderCapture(
  requestId: string,
  url: string,
  method: string,
): Promise<void> {
  if (!requestId) return
  if (!(await webRequestGranted())) return
  attachListeners()
  pendingByRequestId.set(requestId, {
    requestId,
    url,
    method,
    rows: [],
  })
}

export function takeApiClientCapturedHeaders(requestId: string): HeaderRow[] | null {
  const capture = pendingByRequestId.get(requestId)
  pendingByRequestId.delete(requestId)
  if (!capture || capture.rows.length === 0) return null
  return capture.rows
}

export function resetApiClientResponseHeaderCaptureForTests(): void {
  listenersAttached = false
  pendingByRequestId.clear()
  byChromeRequestId.clear()
}
