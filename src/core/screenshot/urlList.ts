import { isRestrictedCaptureUrl } from './restricted'

export const MAX_BATCH_URLS = 50

export interface ParsedUrlList {
  urls: string[]
  /** Entries that are not web addresses. */
  invalid: string[]
  /** Web addresses the browser never lets extensions capture. */
  blocked: string[]
  duplicates: number
  /** Valid URLs past the batch limit. */
  overflow: number
}

/** A capturable absolute URL for `input`, adding https:// to bare hosts such as `example.com/docs`. */
export function normalizeCaptureUrl(input: string): string | null {
  const value = input.trim()
  if (!value) return null
  const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value) || /^file:/i.test(value)
  let url: URL
  try {
    url = new URL(hasScheme ? value : `https://${value}`)
  } catch {
    return null
  }
  if (url.protocol === 'file:') return url.href
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  const host = url.hostname
  if (host !== 'localhost' && !host.includes('.') && !host.startsWith('[')) return null
  return url.href
}

/**
 * Pasted text as a capture list: one URL per line, or several split by spaces or commas.
 * Lines starting with `#` are comments.
 */
export function parseUrlList(text: string, max = MAX_BATCH_URLS): ParsedUrlList {
  const result: ParsedUrlList = { urls: [], invalid: [], blocked: [], duplicates: 0, overflow: 0 }
  const seen = new Set<string>()
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue
    for (const token of line.split(/[\s,]+/)) {
      if (!token) continue
      const url = normalizeCaptureUrl(token)
      if (!url) {
        result.invalid.push(token)
      } else if (isRestrictedCaptureUrl(url)) {
        result.blocked.push(token)
      } else if (seen.has(url)) {
        result.duplicates += 1
      } else {
        seen.add(url)
        if (result.urls.length < max) result.urls.push(url)
        else result.overflow += 1
      }
    }
  }
  return result
}

/** `text` with each of `urls` it doesn't already list appended on its own line. */
export function appendUrls(text: string, urls: readonly string[]): string {
  const present = new Set(parseUrlList(text, Number.POSITIVE_INFINITY).urls)
  const added = urls.filter((url) => {
    const normalized = normalizeCaptureUrl(url)
    if (!normalized || present.has(normalized)) return false
    present.add(normalized)
    return true
  })
  if (added.length === 0) return text
  const base = text.replace(/\s+$/, '')
  return base ? `${base}\n${added.join('\n')}` : added.join('\n')
}
