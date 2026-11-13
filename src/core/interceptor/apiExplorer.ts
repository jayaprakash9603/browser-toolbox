import { parseJson } from '@/core/engines/json'

import { headerValue, isForbiddenRequestHeader, isSensitiveHeaderName, stripForbiddenHeaders } from './apiSensitive'
import { queryShapeFromUrl } from './apiFinder'
import type {
  CaptureRecord,
  ExplorerAuth,
  ExplorerBodyMode,
  ExplorerDraft,
  ExplorerKv,
} from './apiFinderTypes'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function newKv(key = '', value = '', enabled = true): ExplorerKv {
  return { id: crypto.randomUUID(), enabled, key, value }
}

export function isMutatingMethod(method: string): boolean {
  return MUTATING.has(method.toUpperCase())
}

export function parseUrlParts(url: string): { originPath: string; params: ExplorerKv[] } {
  try {
    const parsed = new URL(url)
    const params = [...parsed.searchParams.entries()].map(([key, value]) => newKv(key, value))
    parsed.search = ''
    parsed.hash = ''
    return { originPath: parsed.toString(), params }
  } catch {
    return { originPath: url, params: [] }
  }
}

export function applyEnabledParams(baseUrl: string, params: ExplorerKv[]): string {
  try {
    const parsed = new URL(baseUrl)
    parsed.search = ''
    for (const param of params) {
      if (!param.enabled || !param.key.trim()) continue
      parsed.searchParams.append(param.key.trim(), param.value)
    }
    return parsed.toString()
  } catch {
    return baseUrl
  }
}

function bodyModeFromCapture(record: CaptureRecord): { mode: ExplorerBodyMode; text: string; form: ExplorerKv[] } {
  const mime = (headerValue(record.requestHeaders, 'content-type') ?? '').toLowerCase()
  const body = record.requestBody ?? ''
  if (!body) return { mode: 'none', text: '', form: [] }
  if (mime.includes('application/x-www-form-urlencoded')) {
    const form = [...new URLSearchParams(body).entries()].map(([key, value]) => newKv(key, value))
    return { mode: 'urlencoded', text: body, form }
  }
  if (mime.includes('multipart/form-data')) return { mode: 'formdata', text: body, form: [] }
  if (mime.includes('json') || body.trim().startsWith('{') || body.trim().startsWith('[')) {
    return { mode: 'json', text: body, form: [] }
  }
  return { mode: 'text', text: body, form: [] }
}

function authFromHeaders(headers: { name: string; value?: string }[] | undefined): ExplorerAuth {
  const authorization = headerValue(headers, 'authorization')
  if (!authorization) return { type: 'none' }
  if (/^bearer\s+/i.test(authorization)) return { type: 'bearer', token: authorization.replace(/^bearer\s+/i, '') }
  if (/^basic\s+/i.test(authorization)) {
    try {
      const decoded = atob(authorization.replace(/^basic\s+/i, ''))
      const idx = decoded.indexOf(':')
      return {
        type: 'basic',
        username: idx === -1 ? decoded : decoded.slice(0, idx),
        password: idx === -1 ? '' : decoded.slice(idx + 1),
      }
    } catch {
      return { type: 'custom', header: 'Authorization', value: authorization }
    }
  }
  return { type: 'custom', header: 'Authorization', value: authorization }
}

export function draftFromCapture(record: CaptureRecord, name?: string): ExplorerDraft {
  const { originPath, params } = parseUrlParts(record.url)
  const body = bodyModeFromCapture(record)
  const cookieHeader = headerValue(record.requestHeaders, 'cookie')
  return {
    id: crypto.randomUUID(),
    sourceOccurrenceId: record.id,
    name,
    method: record.method.toUpperCase() || 'GET',
    url: originPath,
    params,
    headers: (record.requestHeaders ?? [])
      .filter((header) => header.name && !isForbiddenRequestHeader(header.name))
      .map((header) => newKv(header.name, header.value ?? '')),
    auth: authFromHeaders(record.requestHeaders),
    bodyMode: body.mode,
    bodyText: body.text,
    formFields: body.form,
    cookies: cookieHeader
      ? cookieHeader.split(/;\s*/).map((part) => {
          const idx = part.indexOf('=')
          return idx === -1 ? newKv(part, '') : newKv(part.slice(0, idx), part.slice(idx + 1))
        })
      : [],
    sendCookies: false,
    timeoutMs: 30_000,
  }
}

export function validateExplorerDraft(draft: ExplorerDraft): string | null {
  let parsed: URL
  try {
    parsed = new URL(applyEnabledParams(draft.url, draft.params))
  } catch {
    return 'Enter a valid absolute URL.'
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 'Use an HTTP or HTTPS URL.'
  if (!draft.method.trim()) return 'Choose an HTTP method.'
  if (draft.bodyMode === 'json' && draft.bodyText.trim()) {
    const result = parseJson(draft.bodyText)
    if (!result.ok) {
      const loc =
        result.error.line != null && result.error.column != null
          ? ` (line ${result.error.line}, column ${result.error.column})`
          : ''
      return `${result.error.message}${loc}`
    }
  }
  return null
}

export function applyExplorerAuth(
  url: string,
  headers: Record<string, string>,
  auth: ExplorerAuth,
): { url: string; headers: Record<string, string> } {
  const next = { ...headers }
  switch (auth.type) {
    case 'bearer':
      if (auth.token) next.Authorization = `Bearer ${auth.token}`
      return { url, headers: next }
    case 'basic': {
      const token = btoa(`${auth.username}:${auth.password}`)
      next.Authorization = `Basic ${token}`
      return { url, headers: next }
    }
    case 'apiKey':
      if (auth.in === 'query') {
        try {
          const parsed = new URL(url)
          parsed.searchParams.set(auth.key, auth.value)
          return { url: parsed.toString(), headers: next }
        } catch {
          return { url, headers: next }
        }
      }
      if (auth.key) next[auth.key] = auth.value
      return { url, headers: next }
    case 'custom':
      if (auth.header) next[auth.header] = auth.value
      return { url, headers: next }
    default:
      return { url, headers: next }
  }
}

export function headersFromKv(rows: ExplorerKv[]): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const row of rows) {
    if (!row.enabled || !row.key.trim()) continue
    if (isForbiddenRequestHeader(row.key)) continue
    headers[row.key.trim()] = row.value
  }
  return stripForbiddenHeaders(headers)
}

export function buildExplorerBody(draft: ExplorerDraft): { body: string | null; contentType?: string } {
  switch (draft.bodyMode) {
    case 'none':
      return { body: null }
    case 'json':
      return { body: draft.bodyText, contentType: 'application/json' }
    case 'text':
      return { body: draft.bodyText, contentType: 'text/plain' }
    case 'urlencoded': {
      const params = new URLSearchParams()
      for (const field of draft.formFields) {
        if (!field.enabled || !field.key.trim()) continue
        params.append(field.key.trim(), field.value)
      }
      return { body: params.toString(), contentType: 'application/x-www-form-urlencoded' }
    }
    case 'formdata':
      return { body: draft.bodyText || null }
    default:
      return { body: null }
  }
}

export interface ExplorerWireRequest {
  method: string
  url: string
  headers: Record<string, string>
  body: string | null
  timeoutMs: number
  sendCookies: boolean
}

export function buildExplorerWireRequest(draft: ExplorerDraft): ExplorerWireRequest {
  const urlWithParams = applyEnabledParams(draft.url, draft.params)
  let headers = headersFromKv(draft.headers)
  const applied = applyExplorerAuth(urlWithParams, headers, draft.auth)
  headers = stripForbiddenHeaders(applied.headers)
  const { body, contentType } = buildExplorerBody(draft)
  if (contentType && !Object.keys(headers).some((name) => name.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = contentType
  }
  return {
    method: draft.method.toUpperCase(),
    url: applied.url,
    headers: stripForbiddenHeaders(headers),
    body,
    timeoutMs: draft.timeoutMs > 0 ? draft.timeoutMs : 30_000,
    sendCookies: draft.sendCookies,
  }
}

export function sanitizeDraftForSave(draft: ExplorerDraft, includeSecrets: boolean): ExplorerDraft {
  if (includeSecrets) return structuredClone(draft)
  const auth: ExplorerAuth =
    draft.auth.type === 'none'
      ? draft.auth
      : draft.auth.type === 'bearer'
        ? { type: 'bearer', token: '' }
        : draft.auth.type === 'basic'
          ? { ...draft.auth, password: '' }
          : draft.auth.type === 'apiKey'
            ? { ...draft.auth, value: '' }
            : { ...draft.auth, value: '' }
  return {
    ...structuredClone(draft),
    auth,
    headers: draft.headers.map((header) =>
      isSensitiveHeaderName(header.key) ? { ...header, value: '' } : header,
    ),
    cookies: draft.cookies.map((cookie) => ({ ...cookie, value: '' })),
    sendCookies: false,
  }
}

export function queryShapeOfDraft(draft: ExplorerDraft): string {
  return queryShapeFromUrl(applyEnabledParams(draft.url, draft.params))
}
