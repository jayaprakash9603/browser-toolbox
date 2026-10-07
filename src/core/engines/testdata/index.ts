const FIRST_NAMES = ['Ada', 'Grace', 'Alan', 'Edsger', 'Barbara', 'Donald', 'Margaret', 'Linus', 'Radia', 'Dennis', 'Katherine', 'Tim', 'Frances', 'Claude', 'Hedy', 'Anita']
const LAST_NAMES = ['Lovelace', 'Hopper', 'Turing', 'Dijkstra', 'Liskov', 'Knuth', 'Hamilton', 'Torvalds', 'Perlman', 'Ritchie', 'Johnson', 'Berners-Lee', 'Allen', 'Shannon', 'Lamarr', 'Borg']
const DOMAINS = ['example.com', 'test.dev', 'sample.org', 'demo.io', 'mail.example']
const STREETS = ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine Rd', 'Elm Blvd']
const CITIES = ['Springfield', 'Riverton', 'Lakewood', 'Fairview', 'Greenville', 'Bristol']
const WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima']

function rand(max: number): number {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return buffer[0] % max
}

function pick<T>(items: readonly T[]): T {
  return items[rand(items.length)]
}

export function generateName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
}

export function generateEmail(): string {
  const first = pick(FIRST_NAMES).toLowerCase()
  const last = pick(LAST_NAMES).toLowerCase().replace(/-/g, '')
  return `${first}.${last}${rand(100)}@${pick(DOMAINS)}`
}

export function generatePhone(): string {
  return `+1-${200 + rand(800)}-${200 + rand(800)}-${1000 + rand(9000)}`
}

export function generateAddress(): string {
  return `${100 + rand(9900)} ${pick(STREETS)}, ${pick(CITIES)}, ${10000 + rand(89999)}`
}

export function generateNumber(min = 0, max = 1000): number {
  return min + rand(max - min + 1)
}

export function generateString(length = 12): string {
  return Array.from({ length }, () => pick(WORDS)).join(' ').slice(0, length).replace(/ [a-z]*$/i, '') || 'alpha'
}

export function generateBoolean(): boolean {
  return rand(2) === 1
}

export function generateDate(startYear = 2020, endYear = 2030): string {
  const start = Date.UTC(startYear, 0, 1)
  const end = Date.UTC(endYear, 11, 31)
  const time = start + rand(Math.floor((end - start) / 86400000)) * 86400000
  return new Date(time).toISOString().slice(0, 10)
}

export type TestDataKind = 'name' | 'email' | 'phone' | 'address' | 'uuid' | 'date' | 'number' | 'string' | 'boolean'

export const TEST_DATA_KINDS: { id: TestDataKind; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'address', label: 'Address' },
  { id: 'uuid', label: 'UUID' },
  { id: 'date', label: 'Date' },
  { id: 'number', label: 'Number' },
  { id: 'string', label: 'String' },
  { id: 'boolean', label: 'Boolean' },
]

function uuid(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function generateValue(kind: TestDataKind): string {
  switch (kind) {
    case 'name': return generateName()
    case 'email': return generateEmail()
    case 'phone': return generatePhone()
    case 'address': return generateAddress()
    case 'uuid': return uuid()
    case 'date': return generateDate()
    case 'number': return String(generateNumber())
    case 'string': return generateString()
    case 'boolean': return String(generateBoolean())
  }
}

export function generateRows(kinds: TestDataKind[], count: number): Record<string, string>[] {
  const total = Math.min(Math.max(1, count), 1000)
  return Array.from({ length: total }, () => {
    const row: Record<string, string> = {}
    for (const kind of kinds) row[kind] = generateValue(kind)
    return row
  })
}

export function rowsToJson(rows: Record<string, string>[]): string {
  return JSON.stringify(rows, null, 2)
}

function escapeCsv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function rowsToCsv(rows: Record<string, string>[]): string {
  if (rows.length === 0) return ''
  const columns = Object.keys(rows[0])
  const lines = [columns.join(',')]
  for (const row of rows) lines.push(columns.map((c) => escapeCsv(row[c] ?? '')).join(','))
  return lines.join('\n')
}

export const HTTP_STATUS_CODES: { code: number; name: string; category: string; hint: string }[] = [
  { code: 100, name: 'Continue', category: 'Informational', hint: 'Interim response; the client should continue the request.' },
  { code: 101, name: 'Switching Protocols', category: 'Informational', hint: 'Server is switching protocols (e.g. to WebSocket).' },
  { code: 200, name: 'OK', category: 'Success', hint: 'Request succeeded.' },
  { code: 201, name: 'Created', category: 'Success', hint: 'Resource created; common for POST responses.' },
  { code: 202, name: 'Accepted', category: 'Success', hint: 'Accepted for async processing; not yet complete.' },
  { code: 204, name: 'No Content', category: 'Success', hint: 'Success with an empty body.' },
  { code: 301, name: 'Moved Permanently', category: 'Redirect', hint: 'Resource permanently moved; update bookmarks/links.' },
  { code: 302, name: 'Found', category: 'Redirect', hint: 'Temporary redirect; keep the original URL.' },
  { code: 304, name: 'Not Modified', category: 'Redirect', hint: 'Cached version is still valid.' },
  { code: 307, name: 'Temporary Redirect', category: 'Redirect', hint: 'Temporary redirect preserving the method.' },
  { code: 308, name: 'Permanent Redirect', category: 'Redirect', hint: 'Permanent redirect preserving the method.' },
  { code: 400, name: 'Bad Request', category: 'Client error', hint: 'Malformed request — check syntax, parameters and body.' },
  { code: 401, name: 'Unauthorized', category: 'Client error', hint: 'Missing or invalid authentication credentials.' },
  { code: 403, name: 'Forbidden', category: 'Client error', hint: 'Authenticated but not allowed; check permissions.' },
  { code: 404, name: 'Not Found', category: 'Client error', hint: 'Resource does not exist; verify the URL.' },
  { code: 405, name: 'Method Not Allowed', category: 'Client error', hint: 'HTTP method not supported on this endpoint.' },
  { code: 408, name: 'Request Timeout', category: 'Client error', hint: 'Client took too long; retry.' },
  { code: 409, name: 'Conflict', category: 'Client error', hint: 'State conflict, e.g. duplicate or version mismatch.' },
  { code: 413, name: 'Payload Too Large', category: 'Client error', hint: 'Request body exceeds the server limit.' },
  { code: 415, name: 'Unsupported Media Type', category: 'Client error', hint: 'Content-Type not accepted by the server.' },
  { code: 422, name: 'Unprocessable Content', category: 'Client error', hint: 'Well-formed but semantically invalid (validation errors).' },
  { code: 429, name: 'Too Many Requests', category: 'Client error', hint: 'Rate limited; back off and retry later.' },
  { code: 500, name: 'Internal Server Error', category: 'Server error', hint: 'Generic server failure; check server logs.' },
  { code: 501, name: 'Not Implemented', category: 'Server error', hint: 'Server does not support the functionality.' },
  { code: 502, name: 'Bad Gateway', category: 'Server error', hint: 'Upstream server sent an invalid response; check proxies.' },
  { code: 503, name: 'Service Unavailable', category: 'Server error', hint: 'Server overloaded or down; retry later.' },
  { code: 504, name: 'Gateway Timeout', category: 'Server error', hint: 'Upstream server timed out; check dependencies.' },
]
