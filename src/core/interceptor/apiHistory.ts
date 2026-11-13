import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

import { DEFAULT_API_HISTORY_LIMIT, MAX_API_HISTORY_LIMIT } from './constants'
import type { ApiExecutionHistory } from './apiFinderTypes'
import { sanitizeDraftForSave } from './apiExplorer'

export async function getApiHistory(): Promise<ApiExecutionHistory[]> {
  return (await get<ApiExecutionHistory[]>(STORAGE_KEYS.interceptorApiHistory)) ?? []
}

export async function appendApiHistory(
  entry: ApiExecutionHistory,
  limit = DEFAULT_API_HISTORY_LIMIT,
  includeSecrets = false,
): Promise<ApiExecutionHistory[]> {
  const cap = Math.min(MAX_API_HISTORY_LIMIT, Math.max(20, limit))
  const current = await getApiHistory()
  const stored: ApiExecutionHistory = {
    ...entry,
    draft: sanitizeDraftForSave(entry.draft, includeSecrets),
  }
  const next = [stored, ...current.filter((item) => item.id !== stored.id)].slice(0, cap)
  await set(STORAGE_KEYS.interceptorApiHistory, next)
  return next
}

export async function deleteApiHistoryEntry(id: string): Promise<ApiExecutionHistory[]> {
  const next = (await getApiHistory()).filter((entry) => entry.id !== id)
  await set(STORAGE_KEYS.interceptorApiHistory, next)
  return next
}

export async function clearApiHistory(): Promise<void> {
  await set(STORAGE_KEYS.interceptorApiHistory, [])
}
