import { registrableDomain } from '@/core/protection/domain'

import { classifyRequest } from './trackers'
import type { NetworkRequestRecord, NetworkResourceKind } from './types'

const TYPE_MAP: Record<string, NetworkResourceKind> = {
  main_frame: 'document',
  sub_frame: 'document',
  xmlhttprequest: 'xhr',
  ping: 'xhr',
  script: 'script',
  stylesheet: 'stylesheet',
  image: 'image',
  font: 'font',
  media: 'media',
  object: 'other',
  websocket: 'other',
  other: 'other',
}

export function resourceKind(
  resourceType: string | undefined,
  blocked: boolean,
  error?: string,
): NetworkResourceKind {
  if (blocked) return 'blocked'
  if (error) return 'failed'
  return TYPE_MAP[resourceType ?? ''] ?? 'other'
}

export function toNetworkRecord(input: {
  requestId: string
  tabId: number
  url: string
  method: string
  status?: number
  resourceType?: string
  timestamp: number
  completedAt?: number
  initiator?: string
  pageUrl?: string
  error?: string
  blocked?: boolean
  requestHeaders?: { name: string; value?: string }[]
  responseHeaders?: { name: string; value?: string }[]
}): NetworkRequestRecord {
  let hostname = ''
  try {
    hostname = new URL(input.url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    hostname = ''
  }
  let pageHost = ''
  try {
    if (input.pageUrl) pageHost = new URL(input.pageUrl).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    pageHost = ''
  }
  const blocked = Boolean(input.blocked)
  const tracker = classifyRequest({
    url: input.url,
    pageUrl: input.pageUrl,
    resourceType: input.resourceType,
    blocked,
    initiator: input.initiator,
    timestamp: input.timestamp,
    tabId: input.tabId,
    requestId: input.requestId,
  })
  return {
    id: `${input.tabId}:${input.requestId}`,
    requestId: input.requestId,
    tabId: input.tabId,
    url: input.url,
    hostname,
    method: input.method,
    status: input.status,
    resourceType: input.resourceType ?? 'other',
    kind: resourceKind(input.resourceType, blocked, input.error),
    timestamp: input.timestamp,
    completedAt: input.completedAt,
    initiator: input.initiator,
    thirdParty: pageHost ? registrableDomain(hostname) !== registrableDomain(pageHost) : false,
    trackerCategory: tracker?.category,
    error: input.error,
    blocked,
    requestHeaders: input.requestHeaders,
    responseHeaders: input.responseHeaders,
  }
}

export function matchesNetworkFilters(
  record: NetworkRequestRecord,
  filters: { query?: string; kind?: string; thirdParty?: boolean },
): boolean {
  if (filters.kind && filters.kind !== 'all' && record.kind !== filters.kind) return false
  if (filters.thirdParty && !record.thirdParty) return false
  const query = filters.query?.trim().toLowerCase()
  if (!query) return true
  return [record.url, record.hostname, record.method, record.initiator, record.error]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(query))
}
