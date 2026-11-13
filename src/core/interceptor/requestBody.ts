import { MAX_CAPTURE_BODY_BYTES } from './constants'

export function truncateBody(value: string, maxBytes = MAX_CAPTURE_BODY_BYTES): { text: string; truncated: boolean } {
  if (value.length <= maxBytes) return { text: value, truncated: false }
  return { text: value.slice(0, maxBytes), truncated: true }
}

export function decodeBytes(bytes: ArrayBuffer | Uint8Array, maxBytes = MAX_CAPTURE_BODY_BYTES): {
  text: string
  truncated: boolean
} {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const truncated = view.byteLength > maxBytes
  const slice = truncated ? view.subarray(0, maxBytes) : view
  return { text: new TextDecoder('utf-8', { fatal: false }).decode(slice), truncated }
}

export interface SerializedBody {
  text: string
  truncated: boolean
}

type WebRequestBody =
  | {
      error?: string
      formData?: Record<string, (string | ArrayBuffer)[]>
      raw?: Array<{ bytes?: ArrayBuffer; file?: string }>
    }
  | undefined

/** Serialize chrome.webRequest requestBody (formData / raw) without inventing content. */
export function serializeWebRequestBody(body: WebRequestBody, maxBytes = MAX_CAPTURE_BODY_BYTES): SerializedBody | undefined {
  if (!body || body.error) return undefined
  if (body.formData && Object.keys(body.formData).length > 0) {
    const params = new URLSearchParams()
    for (const [key, values] of Object.entries(body.formData)) {
      for (const value of values) {
        params.append(key, typeof value === 'string' ? value : decodeBytes(value).text)
      }
    }
    return truncateBody(params.toString(), maxBytes)
  }
  if (!body.raw?.length) return undefined
  const chunks: Uint8Array[] = []
  let total = 0
  for (const part of body.raw) {
    if (!part.bytes) continue
    const view = new Uint8Array(part.bytes)
    const next = Math.min(view.byteLength, Math.max(0, maxBytes - total))
    if (next > 0) chunks.push(view.subarray(0, next))
    total += view.byteLength
    if (total >= maxBytes) break
  }
  if (!chunks.length) return undefined
  const merged = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0))
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { text: new TextDecoder('utf-8', { fatal: false }).decode(merged), truncated: total > maxBytes }
}
