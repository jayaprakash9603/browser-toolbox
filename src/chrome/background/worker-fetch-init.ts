import { isForbiddenRequestHeader } from '@/core/interceptor/apiSensitive'

/** Chrome extension service workers reject `redirect: 'manual'` and some header names. */
export function sanitizeWorkerFetchInit(init?: RequestInit): RequestInit | undefined {
  if (!init) return init
  const next: RequestInit = { ...init }
  if (next.redirect === 'manual') next.redirect = 'follow'
  if (next.headers) next.headers = sanitizeWorkerHeaders(next.headers)
  return next
}

export function sanitizeWorkerHeaders(headers: HeadersInit): Record<string, string> {
  const entries: Array<[string, string]> =
    headers instanceof Headers
      ? [...headers.entries()]
      : Array.isArray(headers)
        ? headers.map(([name, value]) => [name, String(value)])
        : Object.entries(headers).map(([name, value]) => [name, String(value)])

  const out: Record<string, string> = {}
  for (const [name, value] of entries) {
    const key = name.trim()
    if (!key || isForbiddenRequestHeader(key)) continue
    try {
      new Headers({ [key]: value })
      out[key] = value
    } catch {
      /* skip names/values the Fetch Headers constructor rejects */
    }
  }
  return out
}

export function classifyWorkerFetchError(error: unknown, url: string): Error {
  if (!(error instanceof Error)) return new TypeError(String(error))
  const message = error.message
  if (/Failed to execute 'fetch'/i.test(message)) {
    if (/redirect/i.test(message)) {
      return new TypeError('Could not follow redirects from the extension worker. Try the request again.', {
        cause: error,
      })
    }
    if (/header/i.test(message)) {
      return new TypeError(
        'A request header cannot be set by the extension. Disable Host, Origin, Referer, Cookie, or Sec-* headers and send again.',
        { cause: error },
      )
    }
    return new TypeError(`Could not send ${url} from the extension worker. Disable forbidden headers and try again.`, {
      cause: error,
    })
  }
  return error
}
