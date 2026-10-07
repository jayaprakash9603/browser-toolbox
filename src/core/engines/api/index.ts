import { compareText } from '@/core/engines/diff'
import { formatJson, parseJson } from '@/core/engines/json'
import {
  redactJsonSecrets,
  redactResponseHeaders,
  sendHttpRequest,
  type HttpRequest,
  type HttpResponse,
} from '@/core/network/httpClient'

export {
  HTTP_METHODS,
  parseRequestUrl,
  parseRequestHeaders,
  type HttpMethod,
} from '@/core/network/httpClient'

export type ResponseFormat = 'json' | 'xml' | 'html' | 'text'

export { sendHttpRequest, redactJsonSecrets, redactResponseHeaders }
export type { HttpRequest, HttpResponse }

export async function executeRequest(
  request: HttpRequest,
  fetcher?: typeof fetch,
): Promise<HttpResponse> {
  return sendHttpRequest(request, fetcher)
}

export function detectResponseFormat(body: string): ResponseFormat {
  const trimmed = body.trim()
  if (!trimmed) return 'text'
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && parseJson(trimmed).ok) return 'json'
  if (trimmed.startsWith('<') && trimmed.includes('>')) return 'xml'
  if (/<html[\s>]/i.test(trimmed) || /<!DOCTYPE html/i.test(trimmed)) return 'html'
  return 'text'
}

export function formatResponseBody(body: string, format: ResponseFormat): string {
  if (format !== 'json') return body
  const formatted = formatJson(body)
  return formatted.ok ? formatted.value : body
}

export function diffResponseBodies(expected: string, actual: string) {
  return compareText(expected, actual, 'lines')
}
