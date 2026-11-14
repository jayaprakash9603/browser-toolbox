import { registrableDomain } from '@/core/protection/domain'

import { TRACKER_CATALOG } from './trackerCatalog'
import type { TrackerCategory, TrackerConfidence, TrackerRecord, TrackerStatus } from './types'

export function isThirdPartyHost(requestHost: string, pageHost: string): boolean {
  if (!requestHost || !pageHost) return false
  return registrableDomain(requestHost) !== registrableDomain(pageHost)
}

export function lookupTracker(hostname: string): {
  category: TrackerCategory
  confidence: TrackerConfidence
  source: string
} | null {
  const host = hostname.replace(/^www\./, '').toLowerCase()
  if (!host) return null
  const labels = host.split('.')
  for (let i = 0; i < labels.length - 1; i += 1) {
    const suffix = labels.slice(i).join('.')
    const hit = TRACKER_CATALOG[suffix]
    if (hit) return { category: hit, confidence: i === 0 ? 'high' : 'medium', source: 'local-catalog' }
  }
  return null
}

export function classifyRequest(input: {
  url: string
  pageUrl?: string
  resourceType?: string
  blocked?: boolean
  initiator?: string
  timestamp?: number
  tabId?: number
  requestId?: string
}): TrackerRecord | null {
  let hostname = ''
  try {
    hostname = new URL(input.url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
  let pageHost = ''
  try {
    if (input.pageUrl) pageHost = new URL(input.pageUrl).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    pageHost = ''
  }
  const thirdParty = pageHost ? isThirdPartyHost(hostname, pageHost) : true
  const match = lookupTracker(hostname)
  if (!match) return null
  const status: TrackerStatus = input.blocked ? 'blocked' : thirdParty ? 'detected' : 'observed'
  return {
    id: `${input.requestId ?? hostname}:${input.timestamp ?? 0}`,
    domain: hostname,
    category: match.category,
    requestType: input.resourceType ?? 'other',
    thirdParty,
    status,
    timestamp: input.timestamp ?? Date.now(),
    matchedRule: match.source,
    initiator: input.initiator,
    confidence: match.confidence,
    source: match.source,
    url: input.url,
    tabId: input.tabId,
  }
}

export function groupTrackers(records: TrackerRecord[]): Array<{
  domain: string
  category: TrackerCategory
  count: number
  blocked: number
  allowed: number
  thirdParty: boolean
  confidence: TrackerConfidence
}> {
  const map = new Map<string, ReturnType<typeof groupTrackers>[number]>()
  for (const record of records) {
    const current = map.get(record.domain) ?? {
      domain: record.domain,
      category: record.category,
      count: 0,
      blocked: 0,
      allowed: 0,
      thirdParty: record.thirdParty,
      confidence: record.confidence,
    }
    current.count += 1
    if (record.status === 'blocked') current.blocked += 1
    else current.allowed += 1
    current.thirdParty = current.thirdParty || record.thirdParty
    map.set(record.domain, current)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}
