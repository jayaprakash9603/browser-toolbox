import type { ApiTiming, CaptureRecord, NetLogEntry } from '@/core/interceptor'
import { mimeFromHeaders } from '@/core/interceptor/apiSensitive'

export interface NetworkRow {
  id: string
  method: string
  url: string
  status?: number
  type: string
  size?: number
  time?: number
  requestHeaders: { name: string; value: string }[]
  responseHeaders: { name: string; value: string }[]
  queryParams: { name: string; value: string }[]
  postData?: string
  modified?: boolean
  appliedRuleIds?: string[]
  effectiveUrl?: string
  ruleHits?: { ruleId: string; ruleName?: string; ruleType?: string; action?: string }[]
  error?: string
  startedAt?: number
  mimeType?: string
  timing?: ApiTiming
  /** Lazily loads the response body (DevTools HAR or captured). */
  getBody?: () => Promise<string>
  raw: unknown
}

export const TYPE_FILTERS = [
  'All',
  'Fetch/XHR',
  'JS',
  'CSS',
  'Img',
  'Media',
  'Font',
  'Doc',
  'WS',
  'Wasm',
  'Manifest',
  'Other',
] as const
export type TypeFilter = (typeof TYPE_FILTERS)[number]

export function normalizeType(raw: string | undefined): string {
  switch (raw) {
    case 'xmlhttprequest':
    case 'fetch':
    case 'xhr':
      return 'fetch/xhr'
    case 'script':
      return 'script'
    case 'stylesheet':
      return 'stylesheet'
    case 'image':
      return 'image'
    case 'media':
      return 'media'
    case 'font':
      return 'font'
    case 'main_frame':
    case 'sub_frame':
    case 'document':
      return 'document'
    case 'websocket':
      return 'websocket'
    default:
      return raw ?? 'other'
  }
}

export function matchesTypeFilter(row: NetworkRow, filter: TypeFilter): boolean {
  if (filter === 'All') return true
  const t = row.type
  switch (filter) {
    case 'Fetch/XHR':
      return t === 'fetch/xhr'
    case 'JS':
      return t === 'script'
    case 'CSS':
      return t === 'stylesheet'
    case 'Img':
      return t === 'image'
    case 'Media':
      return t === 'media'
    case 'Font':
      return t === 'font'
    case 'Doc':
      return t === 'document'
    case 'WS':
      return t === 'websocket'
    case 'Wasm':
      return t === 'wasm'
    case 'Manifest':
      return t === 'manifest'
    default:
      return !['fetch/xhr', 'script', 'stylesheet', 'image', 'media', 'font', 'document', 'websocket'].includes(t)
  }
}

export function parseQuery(url: string): { name: string; value: string }[] {
  try {
    return [...new URL(url).searchParams.entries()].map(([name, value]) => ({ name, value }))
  } catch {
    return []
  }
}

export function formatSize(bytes?: number): string {
  if (bytes == null || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Kb`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mb`
}

export function fromNetLog(entry: NetLogEntry): NetworkRow {
  const requestHeaders = (entry.requestHeaders ?? []).map((h) => ({ name: h.name, value: h.value ?? '' }))
  const responseHeaders = (entry.responseHeaders ?? []).map((h) => ({ name: h.name, value: h.value ?? '' }))
  return {
    id: entry.id,
    method: entry.method,
    url: entry.url,
    status: entry.status,
    type: normalizeType(entry.resourceType),
    size: entry.size,
    time: entry.durationMs != null ? Math.round(entry.durationMs) : undefined,
    requestHeaders,
    responseHeaders,
    queryParams: parseQuery(entry.url),
    postData: entry.requestBody,
    modified: entry.modified,
    appliedRuleIds: entry.appliedRuleIds,
    effectiveUrl: entry.effectiveUrl,
    ruleHits: entry.ruleHits,
    error: entry.error,
    startedAt: entry.startedAt,
    mimeType: mimeFromHeaders(responseHeaders) ?? mimeFromHeaders(requestHeaders),
    timing: entry.durationMs != null ? { totalMs: Math.round(entry.durationMs) } : undefined,
    getBody: entry.responseBody != null ? async () => entry.responseBody ?? '' : undefined,
    raw: entry,
  }
}

interface HarLike {
  request: {
    method: string
    url: string
    headers: { name: string; value: string }[]
    postData?: { text?: string }
  }
  response: {
    status: number
    headers: { name: string; value: string }[]
    content: { size?: number; mimeType?: string }
    _transferSize?: number
  }
  time: number
  startedDateTime?: string
  timings?: {
    blocked?: number
    dns?: number
    connect?: number
    ssl?: number
    send?: number
    wait?: number
    receive?: number
  }
  _resourceType?: string
  getContent?: (cb: (content: string, encoding: string) => void) => void
}

function timingFromHar(entry: HarLike): ApiTiming | undefined {
  const pick = (value?: number) => (value != null && value >= 0 ? Math.round(value) : undefined)
  const timing: ApiTiming = {
    blockedMs: pick(entry.timings?.blocked),
    dnsMs: pick(entry.timings?.dns),
    connectMs: pick(entry.timings?.connect),
    tlsMs: pick(entry.timings?.ssl),
    sendMs: pick(entry.timings?.send),
    waitMs: pick(entry.timings?.wait),
    receiveMs: pick(entry.timings?.receive),
    totalMs: pick(entry.time),
  }
  return Object.values(timing).some((value) => value != null) ? timing : undefined
}

export function fromHar(entry: HarLike, index: number): NetworkRow {
  const mime = entry.response.content?.mimeType ?? ''
  let type = normalizeType(entry._resourceType)
  if (type === 'other' && mime.includes('wasm')) type = 'wasm'
  if (type === 'other' && mime.includes('manifest')) type = 'manifest'
  return {
    id: `${index}:${entry.request.url}`,
    method: entry.request.method,
    url: entry.request.url,
    status: entry.response.status,
    type,
    size: entry.response._transferSize ?? entry.response.content?.size,
    time: Math.round(entry.time),
    requestHeaders: entry.request.headers,
    responseHeaders: entry.response.headers,
    queryParams: parseQuery(entry.request.url),
    postData: entry.request.postData?.text,
    startedAt: entry.startedDateTime ? Date.parse(entry.startedDateTime) : undefined,
    mimeType: mime || undefined,
    timing: timingFromHar(entry),
    getBody: entry.getContent
      ? () =>
          new Promise<string>((resolve) =>
            entry.getContent!((content, encoding) =>
              resolve(encoding === 'base64' ? content : (content ?? '')),
            ),
          )
      : undefined,
    raw: entry,
  }
}

export function rowToCapture(row: NetworkRow): CaptureRecord {
  return {
    id: row.id,
    method: row.method,
    url: row.url,
    status: row.status,
    resourceType: row.type === 'fetch/xhr' ? 'xmlhttprequest' : row.type,
    requestHeaders: row.requestHeaders,
    responseHeaders: row.responseHeaders,
    requestBody: row.postData,
    durationMs: row.time,
    size: row.size,
    startedAt: row.startedAt,
    error: row.error,
    mimeType: row.mimeType,
    timing: row.timing,
  }
}
