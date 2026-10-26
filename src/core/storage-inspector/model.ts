export type StorageArea = 'local' | 'session'
export type ValueKind = 'json' | 'jwt' | 'url' | 'number' | 'boolean' | 'timestamp' | 'empty' | 'text'
export type SortKey = 'name' | 'size' | 'type'

export interface StorageEntry {
  key: string
  value: string
  kind: ValueKind
  /** Approximate bytes used (key + value, UTF-16 as browsers count quota). */
  bytes: number
}

export const VALUE_KINDS: readonly ValueKind[] = ['json', 'jwt', 'url', 'number', 'boolean', 'timestamp', 'empty', 'text']

const MIN_TIMESTAMP_S = 946684800 // 2000-01-01
const MAX_TIMESTAMP_S = 4102444800 // 2100-01-01

export function parseJson(value: string): unknown | undefined {
  const text = value.trim()
  if (!text || !/^[[{"]/.test(text)) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function base64UrlDecode(part: string): string | null {
  try {
    const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

export interface JwtParts {
  header: unknown
  payload: unknown
  expiresAt: number | null
}

export function decodeJwt(value: string): JwtParts | null {
  const parts = value.trim().split('.')
  if (parts.length !== 3 || parts.some((p) => !/^[\w-]*$/.test(p)) || !parts[0] || !parts[1]) return null
  const header = base64UrlDecode(parts[0])
  const payload = base64UrlDecode(parts[1])
  if (header == null || payload == null) return null
  try {
    const h = JSON.parse(header) as unknown
    const p = JSON.parse(payload) as unknown
    if (typeof h !== 'object' || h === null || typeof p !== 'object' || p === null) return null
    const exp = (p as { exp?: unknown }).exp
    return { header: h, payload: p, expiresAt: typeof exp === 'number' ? exp * 1000 : null }
  } catch {
    return null
  }
}

/** Epoch seconds or milliseconds that land between 2000 and 2100, as milliseconds. */
export function asTimestamp(value: string): number | null {
  const text = value.trim()
  if (!/^\d{10}(\d{3})?$/.test(text)) return null
  const n = Number(text)
  const seconds = text.length === 13 ? n / 1000 : n
  return seconds >= MIN_TIMESTAMP_S && seconds <= MAX_TIMESTAMP_S ? (text.length === 13 ? n : n * 1000) : null
}

export function detectKind(value: string): ValueKind {
  const text = value.trim()
  if (!text) return 'empty'
  if (decodeJwt(text)) return 'jwt'
  if (parseJson(text) !== undefined) return 'json'
  if (/^(true|false)$/i.test(text)) return 'boolean'
  if (asTimestamp(text) != null) return 'timestamp'
  if (/^-?\d+(\.\d+)?$/.test(text)) return 'number'
  if (/^https?:\/\/\S+$/i.test(text)) return 'url'
  return 'text'
}

export function byteSize(key: string, value: string): number {
  return (key.length + value.length) * 2
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function toEntries(record: Record<string, string>): StorageEntry[] {
  return Object.entries(record).map(([key, value]) => ({
    key,
    value,
    kind: detectKind(value),
    bytes: byteSize(key, value),
  }))
}

export function totalBytes(entries: readonly StorageEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.bytes, 0)
}

export function kindCounts(entries: readonly StorageEntry[]): Partial<Record<ValueKind, number>> {
  const counts: Partial<Record<ValueKind, number>> = {}
  for (const entry of entries) counts[entry.kind] = (counts[entry.kind] ?? 0) + 1
  return counts
}

export function filterEntries(
  entries: readonly StorageEntry[],
  query: string,
  kind: ValueKind | 'all',
  sort: SortKey,
): StorageEntry[] {
  const q = query.trim().toLowerCase()
  const result = entries.filter(
    (entry) =>
      (kind === 'all' || entry.kind === kind) &&
      (!q || entry.key.toLowerCase().includes(q) || entry.value.toLowerCase().includes(q)),
  )
  const byName = (a: StorageEntry, b: StorageEntry) => a.key.localeCompare(b.key, undefined, { numeric: true })
  if (sort === 'size') return result.sort((a, b) => b.bytes - a.bytes || byName(a, b))
  if (sort === 'type') return result.sort((a, b) => a.kind.localeCompare(b.kind) || byName(a, b))
  return result.sort(byName)
}

/** Pretty-printed JSON when the value is JSON, otherwise the value unchanged. */
export function prettyValue(value: string): string {
  const parsed = parseJson(value)
  return parsed === undefined ? value : JSON.stringify(parsed, null, 2)
}

export function minifyJson(value: string): string | null {
  const parsed = parseJson(value)
  return parsed === undefined ? null : JSON.stringify(parsed)
}

export function exportJson(record: Record<string, string>): string {
  return JSON.stringify(record, null, 2)
}

export type ImportResult = { ok: true; entries: Record<string, string> } | { ok: false; error: 'invalid' | 'shape' | 'empty' }

/** Accepts a `{ key: value }` object; non-string values are stored as their JSON text. */
export function parseImport(text: string): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalid' }
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return { ok: false, error: 'shape' }
  const entries: Record<string, string> = {}
  for (const [key, value] of Object.entries(data)) {
    entries[key] = typeof value === 'string' ? value : JSON.stringify(value)
  }
  return Object.keys(entries).length === 0 ? { ok: false, error: 'empty' } : { ok: true, entries }
}
