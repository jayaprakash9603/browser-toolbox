import type { NetLogEntry } from '@/core/interceptor'

export function entryToCurl(entry: NetLogEntry): string {
  const parts = ['curl', '-X', entry.method, `'${entry.url.replace(/'/g, "'\\''")}'`]
  for (const h of entry.requestHeaders ?? []) {
    if (h.value) parts.push('-H', `'${h.name}: ${h.value.replace(/'/g, "'\\''")}'`)
  }
  if (entry.requestBody) {
    parts.push('-d', `'${entry.requestBody.replace(/'/g, "'\\''")}'`)
  }
  return parts.join(' ')
}

export function entryToFetch(entry: NetLogEntry): string {
  const headers: Record<string, string> = {}
  for (const h of entry.requestHeaders ?? []) {
    if (h.value) headers[h.name] = h.value
  }
  const init: Record<string, unknown> = { method: entry.method, headers }
  if (entry.requestBody) init.body = entry.requestBody
  return `fetch(${JSON.stringify(entry.url)}, ${JSON.stringify(init, null, 2)})`
}
