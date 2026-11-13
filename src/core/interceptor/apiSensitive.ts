const SENSITIVE_HEADER =
  /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api-key|x-auth-token|x-access-token|x-csrf-token|x-xsrf-token)$/i

const SENSITIVE_FIELD = /password|secret|token|authorization|api[_-]?key|credential|cookie/i

const FORBIDDEN_REQUEST_HEADERS = new Set([
  'accept-charset',
  'accept-encoding',
  'access-control-request-headers',
  'access-control-request-method',
  'connection',
  'content-length',
  'cookie',
  'cookie2',
  'date',
  'dnt',
  'expect',
  'host',
  'keep-alive',
  'origin',
  'referer',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'via',
])

export function isSensitiveHeaderName(name: string): boolean {
  return SENSITIVE_HEADER.test(name.trim()) || SENSITIVE_FIELD.test(name)
}

export function isForbiddenRequestHeader(name: string): boolean {
  const lower = name.trim().toLowerCase()
  if (FORBIDDEN_REQUEST_HEADERS.has(lower)) return true
  return lower.startsWith('sec-') || lower.startsWith('proxy-')
}

export function redactHeaderValue(name: string, value: string, includeSecrets = false): string {
  if (includeSecrets) return value
  return isSensitiveHeaderName(name) ? '[REDACTED]' : value
}

export function filterHeadersForCopy(
  headers: { name: string; value?: string }[] | undefined,
  includeSecrets = false,
): { name: string; value: string }[] {
  const out: { name: string; value: string }[] = []
  for (const header of headers ?? []) {
    if (!header.value) continue
    if (!includeSecrets && isSensitiveHeaderName(header.name)) continue
    out.push({ name: header.name, value: header.value })
  }
  return out
}

export function stripForbiddenHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(headers)) {
    if (isForbiddenRequestHeader(name)) continue
    out[name] = value
  }
  return out
}

export function headerValue(
  headers: { name: string; value?: string }[] | undefined,
  name: string,
): string | undefined {
  const lower = name.toLowerCase()
  return headers?.find((header) => header.name.toLowerCase() === lower)?.value
}

export function mimeFromHeaders(
  headers: { name: string; value?: string }[] | undefined,
): string | undefined {
  return headerValue(headers, 'content-type')?.split(';')[0]?.trim().toLowerCase()
}
