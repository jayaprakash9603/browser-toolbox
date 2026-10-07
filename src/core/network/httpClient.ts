import { hasHostAccess } from '@/core/permissions/originPermissions'

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

export type HttpMethod = (typeof HTTP_METHODS)[number]

export interface HttpRequest {
  url: string
  method: HttpMethod
  headers: Headers
  body: string
}

export interface HttpResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  durationMs: number
}

export const MAX_RESPONSE_BYTES = 1_048_576

const REQUEST_TIMEOUT_MS = 20_000
const SENSITIVE_FIELD = /password|secret|token|authorization|api[_-]?key|credential/i

export function parseRequestUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Enter a valid absolute URL.')
  }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
    throw new Error('Use an HTTP or HTTPS URL without embedded credentials.')
  }
  return url
}

export function parseRequestHeaders(value: string): Headers {
  let parsed: unknown
  try {
    parsed = JSON.parse(value || '{}')
  } catch {
    throw new Error('Headers must be valid JSON.')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Headers must be a JSON object of string values.')
  }

  const headers = new Headers()
  for (const [name, headerValue] of Object.entries(parsed)) {
    if (typeof headerValue !== 'string') {
      throw new Error('Every header value must be a string.')
    }
    headers.set(name, headerValue)
  }
  return headers
}

export async function sendHttpRequest(
  request: HttpRequest,
  fetcher: typeof fetch = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<HttpResponse> {
  const url = parseRequestUrl(request.url)
  if (!(await hasHostAccess(url.href))) {
    throw new Error('Grant access to this host before sending the request.')
  }
  if (request.method === 'GET' && request.body.trim()) {
    throw new Error(`${request.method} requests cannot include a body.`)
  }

  const controller = new AbortController()
  const startedAt = performance.now()
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetcher(url, {
      method: request.method,
      headers: request.headers,
      ...(request.method !== 'GET' && request.body ? { body: request.body } : {}),
      signal: controller.signal,
    })
    const body = await readResponseBody(response)
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body,
      durationMs: Math.round(performance.now() - startedAt),
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Response exceeds the 1 MiB limit.') {
      throw new Error(error.message, { cause: error })
    }
    if (controller.signal.aborted) {
      throw new Error(`Request timed out after ${timeoutMs / 1000} seconds.`, { cause: error })
    }
    throw new Error('Request failed. Check host access, CORS, and the target server.', {
      cause: error,
    })
  } finally {
    globalThis.clearTimeout(timeout)
  }
}

export function redactJsonSecrets(body: string): string {
  let value: unknown
  try {
    value = JSON.parse(body)
  } catch {
    return body
  }
  return JSON.stringify(redactValue(value), null, 2)
}

export function redactResponseHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      SENSITIVE_FIELD.test(key) ? '[REDACTED]' : value,
    ]),
  )
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue)
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_FIELD.test(key) ? '[REDACTED]' : redactValue(entry),
    ]),
  )
}

async function readResponseBody(response: Response): Promise<string> {
  const length = Number(response.headers.get('content-length'))
  if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES) {
    await response.body?.cancel()
    throw new Error('Response exceeds the 1 MiB limit.')
  }

  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel()
      throw new Error('Response exceeds the 1 MiB limit.')
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}