import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

import { emptyTotals, TAB_STATS_SESSION_KEY } from './constants'
import type { AdblockCounts, AdblockTabStatsMap, AdblockTotals } from './types'

export function sumCounts(counts: AdblockCounts | null | undefined): number {
  if (!counts) return 0
  return counts.network + counts.hidden + counts.youtube
}

export async function getAdblockTotals(): Promise<AdblockTotals> {
  return (await get<AdblockTotals>(STORAGE_KEYS.adblockTotals)) ?? emptyTotals()
}

export async function resetAdblockTotals(): Promise<AdblockTotals> {
  const totals = emptyTotals()
  await set(STORAGE_KEYS.adblockTotals, totals)
  return totals
}

function sessionArea(): chrome.storage.StorageArea {
  return chrome.storage.session ?? chrome.storage.local
}

export async function getAdblockTabStats(): Promise<AdblockTabStatsMap> {
  const result = await sessionArea().get(TAB_STATS_SESSION_KEY)
  return (result[TAB_STATS_SESSION_KEY] as AdblockTabStatsMap | undefined) ?? {}
}

export async function setAdblockTabStats(map: AdblockTabStatsMap): Promise<void> {
  await sessionArea().set({ [TAB_STATS_SESSION_KEY]: map })
}
