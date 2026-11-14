import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

import { MAX_EVENTS } from './constants'
import type { SecurityEvent } from './types'

function randomId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function redactSecrets(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b(?:api[_-]?key|token|password|secret|authorization)\s*[=:]\s*[^\s,;]+/gi, (match) =>
      match.replace(/([=:])\s*[^\s,;]+/i, '$1[redacted]'),
    )
    .replace(/([?&](?:access_token|token|key|auth|password))=([^&\s]+)/gi, '$1=[redacted]')
}

export function createSecurityEvent(
  partial: Omit<SecurityEvent, 'id' | 'timestamp'> & { timestamp?: number },
): SecurityEvent {
  return {
    ...partial,
    id: randomId(),
    timestamp: partial.timestamp ?? Date.now(),
    description: redactSecrets(partial.description).slice(0, 400),
    evidence: partial.evidence ? redactSecrets(partial.evidence).slice(0, 500) : undefined,
    domain: partial.domain?.slice(0, 253),
  }
}

export async function getSecurityEvents(): Promise<SecurityEvent[]> {
  const stored = await get<SecurityEvent[]>(STORAGE_KEYS.securityCenterEvents)
  return Array.isArray(stored) ? stored : []
}

export async function appendSecurityEvent(
  partial: Omit<SecurityEvent, 'id' | 'timestamp'> & { timestamp?: number },
  retention = MAX_EVENTS,
): Promise<SecurityEvent[]> {
  const event = createSecurityEvent(partial)
  const current = await getSecurityEvents()
  const next = [event, ...current].slice(0, Math.max(50, Math.min(2000, retention)))
  await set(STORAGE_KEYS.securityCenterEvents, next)
  return next
}

export async function clearSecurityEvents(): Promise<void> {
  await set(STORAGE_KEYS.securityCenterEvents, [])
}

export function matchesEventFilters(
  event: SecurityEvent,
  filters: {
    query?: string
    category?: string
    severity?: string
    since?: number
  },
): boolean {
  if (filters.category && filters.category !== 'all' && event.category !== filters.category) return false
  if (filters.severity && filters.severity !== 'all' && event.severity !== filters.severity) return false
  if (filters.since && event.timestamp < filters.since) return false
  const query = filters.query?.trim().toLowerCase()
  if (!query) return true
  return [event.description, event.domain, event.type, event.evidence, event.action, event.source]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(query))
}

export function exportSecurityEvents(events: SecurityEvent[]): string {
  return JSON.stringify({ version: 1, exportedAt: Date.now(), events }, null, 2)
}
