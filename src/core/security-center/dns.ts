import { DEFAULT_DNS_PROVIDER_NAME, DEFAULT_DNS_PROVIDER_URL } from './constants'
import type { DnsLookupResult, DnsRecordType, DNSRecord } from './types'

const TYPE_CODES: Record<DnsRecordType, number> = {
  A: 1,
  NS: 2,
  CNAME: 5,
  MX: 15,
  TXT: 16,
  AAAA: 28,
}

export function isValidLookupName(value: string): boolean {
  const trimmed = value.trim().toLowerCase().replace(/\.$/, '')
  if (!trimmed || trimmed.length > 253) return false
  if (trimmed.includes('/') || trimmed.includes(':') && !trimmed.includes('.')) return false
  return /^[a-z0-9._-]+$/i.test(trimmed) && trimmed.includes('.')
}

interface DohAnswer {
  name?: string
  type?: number
  TTL?: number
  data?: string
}

interface DohResponse {
  Status?: number
  Answer?: DohAnswer[]
  Comment?: string
}

export function parseDohResponse(
  json: DohResponse,
  query: string,
  type: DnsRecordType,
  provider: string,
): DnsLookupResult {
  const codeToType = new Map(Object.entries(TYPE_CODES).map(([name, code]) => [code, name as DnsRecordType]))
  const records: DNSRecord[] = (json.Answer ?? [])
    .filter((answer) => typeof answer.data === 'string')
    .map((answer) => ({
      type: codeToType.get(answer.type ?? -1) ?? type,
      name: String(answer.name ?? query),
      data: String(answer.data).replace(/^"|"$/g, ''),
      ttl: typeof answer.TTL === 'number' ? answer.TTL : undefined,
    }))
  if (json.Status && json.Status !== 0 && !records.length) {
    return {
      query,
      type,
      records: [],
      provider,
      timestamp: Date.now(),
      error: json.Comment || `DNS status ${json.Status}`,
    }
  }
  return { query, type, records, provider, timestamp: Date.now() }
}

export async function lookupDns(options: {
  name: string
  type: DnsRecordType
  providerUrl?: string
  providerName?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}): Promise<DnsLookupResult> {
  const name = options.name.trim().toLowerCase().replace(/\.$/, '')
  const provider = options.providerName || DEFAULT_DNS_PROVIDER_NAME
  if (!isValidLookupName(name)) {
    return {
      query: name,
      type: options.type,
      records: [],
      provider,
      timestamp: Date.now(),
      error: 'Enter a domain name such as example.com.',
    }
  }
  const endpoint = new URL(options.providerUrl || DEFAULT_DNS_PROVIDER_URL)
  endpoint.searchParams.set('name', name)
  endpoint.searchParams.set('type', options.type)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000)
  try {
    const fetchImpl = options.fetchImpl ?? fetch
    const response = await fetchImpl(endpoint.toString(), {
      headers: { accept: 'application/dns-json' },
      signal: controller.signal,
    })
    if (!response.ok) {
      return {
        query: name,
        type: options.type,
        records: [],
        provider,
        timestamp: Date.now(),
        error: `Provider returned HTTP ${response.status}.`,
      }
    }
    const json = (await response.json()) as DohResponse
    return parseDohResponse(json, name, options.type, provider)
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError'
    return {
      query: name,
      type: options.type,
      records: [],
      provider,
      timestamp: Date.now(),
      error: aborted ? 'The DNS provider timed out.' : 'The DNS lookup failed.',
    }
  } finally {
    clearTimeout(timer)
  }
}

export interface DnsHistoryEntry extends DnsLookupResult {
  id: string
}

export function rememberDnsLookup(history: DnsHistoryEntry[], result: DnsLookupResult, limit = 30): DnsHistoryEntry[] {
  const entry: DnsHistoryEntry = { ...result, id: `${result.timestamp}:${result.query}:${result.type}` }
  return [entry, ...history.filter((item) => item.id !== entry.id)].slice(0, limit)
}
