import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

import type { DnsHistoryEntry } from './dns'

export async function getDnsHistory(): Promise<DnsHistoryEntry[]> {
  const stored = await get<DnsHistoryEntry[]>(STORAGE_KEYS.securityCenterDnsHistory)
  return Array.isArray(stored) ? stored : []
}

export async function saveDnsHistory(entries: DnsHistoryEntry[]): Promise<void> {
  await set(STORAGE_KEYS.securityCenterDnsHistory, entries.slice(0, 40))
}
