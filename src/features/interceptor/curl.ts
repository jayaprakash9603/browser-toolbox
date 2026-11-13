import { filterHeadersForCopy } from '@/core/interceptor/apiSensitive'
import type { NetLogEntry } from '@/core/interceptor'

export interface CopyableRequest {
  method: string
  url: string
  requestHeaders?: { name: string; value?: string }[]
  requestBody?: string
  responseHeaders?: { name: string; value?: string }[]
  responseBody?: string
  status?: number
}

export interface CopyOptions {
  includeSecrets?: boolean
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

export function toCopyable(entry: NetLogEntry | CopyableRequest): CopyableRequest {
  return {
    method: entry.method,
    url: 'url' in entry ? entry.url : '',
    requestHeaders: entry.requestHeaders,
    requestBody: 'requestBody' in entry ? entry.requestBody : undefined,
    responseHeaders: 'responseHeaders' in entry ? entry.responseHeaders : undefined,
    responseBody: 'responseBody' in entry ? entry.responseBody : undefined,
    status: entry.status,
  }
}

export function entryToCurl(entry: NetLogEntry | CopyableRequest, options: CopyOptions = {}): string {
  const req = toCopyable(entry)
  const parts = ['curl', '--request', req.method.toUpperCase(), quote(req.url)]
  for (const header of filterHeadersForCopy(req.requestHeaders, options.includeSecrets)) {
    parts.push('--header', quote(`${header.name}: ${header.value}`))
  }
  if (req.requestBody) parts.push('--data', quote(req.requestBody))
  return parts.join(' ')
}

export function entryToFetch(entry: NetLogEntry | CopyableRequest, options: CopyOptions = {}): string {
  const req = toCopyable(entry)
  const headers: Record<string, string> = {}
  for (const header of filterHeadersForCopy(req.requestHeaders, options.includeSecrets)) {
    headers[header.name] = header.value
  }
  const init: Record<string, unknown> = { method: req.method.toUpperCase(), headers }
  if (req.requestBody) init.body = req.requestBody
  return `fetch(${JSON.stringify(req.url)}, ${JSON.stringify(init, null, 2)})`
}

export function entryToRequestJson(entry: NetLogEntry | CopyableRequest, options: CopyOptions = {}): string {
  const req = toCopyable(entry)
  return JSON.stringify(
    {
      method: req.method.toUpperCase(),
      url: req.url,
      headers: filterHeadersForCopy(req.requestHeaders, options.includeSecrets),
      body: req.requestBody ?? null,
      status: req.status ?? null,
    },
    null,
    2,
  )
}

export function headersToText(
  headers: { name: string; value?: string }[] | undefined,
  options: CopyOptions = {},
): string {
  return filterHeadersForCopy(headers, options.includeSecrets)
    .map((header) => `${header.name}: ${header.value}`)
    .join('\n')
}
