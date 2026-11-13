import {
  customRangeBounds,
  dedupePagesByUrl,
  HISTORY_CHUNK_DAYS,
  HISTORY_MAX_PAGES,
  HISTORY_MAX_RESULTS_PER_QUERY,
  HISTORY_VISITS_CACHE_MAX,
  mapHistoryItem,
  mapVisitItem,
  rangeBounds,
  type HistoryPage,
  type HistoryPreferences,
  type HistoryRangePreset,
  type HistoryVisit,
} from '@/core/history-manager'
import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage/storageService'

const DAY_MS = 86_400_000
const visitsCache = new Map<string, HistoryVisit[]>()

export function historyApiAvailable(): boolean {
  return Boolean(chrome.history?.search)
}

export async function searchHistoryChunk(options: {
  startTime: number
  endTime: number
  text?: string
}): Promise<HistoryPage[]> {
  if (!historyApiAvailable()) return []
  const items = await chrome.history.search({
    text: options.text ?? '',
    startTime: options.startTime,
    endTime: options.endTime,
    maxResults: HISTORY_MAX_RESULTS_PER_QUERY,
  })
  return dedupePagesByUrl(items.map(mapHistoryItem).filter((p): p is HistoryPage => p !== null))
}

export async function loadHistoryForRange(
  preset: HistoryRangePreset,
  text = '',
  customStart?: number,
  customEnd?: number,
): Promise<{ pages: HistoryPage[]; truncated: boolean }> {
  const now = Date.now()
  const pages: HistoryPage[] = []
  let truncated = false

  if (preset === 'all') {
    let end = customEnd ?? now
    let iterations = 0
    while (pages.length < HISTORY_MAX_PAGES && iterations < 520) {
      const start = Math.max(0, end - HISTORY_CHUNK_DAYS * DAY_MS)
      const chunk = await searchHistoryChunk({ startTime: start, endTime: end, text })
      if (chunk.length === 0 && start === 0) break
      pages.push(...chunk)
      if (chunk.length < HISTORY_MAX_RESULTS_PER_QUERY && start === 0) break
      end = start - 1
      iterations += 1
      if (pages.length >= HISTORY_MAX_PAGES) {
        truncated = true
        break
      }
    }
  } else {
    const bounds =
      customStart !== undefined || customEnd !== undefined
        ? customRangeBounds(customStart, customEnd, now)
        : rangeBounds(preset, now)
    const chunk = await searchHistoryChunk({
      startTime: bounds.startTime,
      endTime: bounds.endTime,
      text,
    })
    pages.push(...chunk)
    if (chunk.length >= HISTORY_MAX_RESULTS_PER_QUERY) truncated = true
  }

  return { pages: dedupePagesByUrl(pages).slice(0, HISTORY_MAX_PAGES), truncated }
}

export async function getUrlVisits(url: string): Promise<HistoryVisit[]> {
  if (!chrome.history?.getVisits) return []
  const cached = visitsCache.get(url)
  if (cached) return cached
  const items = await chrome.history.getVisits({ url })
  const visits = items.map(mapVisitItem).sort((a, b) => b.visitTime - a.visitTime)
  if (visitsCache.size >= HISTORY_VISITS_CACHE_MAX) {
    const first = visitsCache.keys().next().value
    if (first) visitsCache.delete(first)
  }
  visitsCache.set(url, visits)
  return visits
}

export function clearVisitsCache(): void {
  visitsCache.clear()
}

export async function deleteHistoryUrl(url: string): Promise<void> {
  if (!chrome.history?.deleteUrl) return
  await chrome.history.deleteUrl({ url })
  visitsCache.delete(url)
}

export async function deleteHistoryRange(startTime: number, endTime: number): Promise<void> {
  if (!chrome.history?.deleteRange) return
  await chrome.history.deleteRange({ startTime, endTime })
  clearVisitsCache()
}

export async function deleteAllHistory(): Promise<void> {
  if (!chrome.history?.deleteAll) return
  await chrome.history.deleteAll()
  clearVisitsCache()
}

export async function openUrl(url: string, mode: 'current' | 'tab' | 'window'): Promise<void> {
  if (mode === 'current') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id != null) await chrome.tabs.update(tab.id, { url })
    else await chrome.tabs.create({ url })
    return
  }
  if (mode === 'window') {
    await chrome.windows.create({ url })
    return
  }
  await chrome.tabs.create({ url })
}

export async function loadHistoryPreferences(): Promise<HistoryPreferences> {
  const stored = await get<HistoryPreferences>(STORAGE_KEYS.historyManager)
  return {
    recentSearches: stored?.recentSearches ?? [],
    density: stored?.density ?? 'compact',
    range: stored?.range ?? '7d',
  }
}

export async function saveHistoryPreferences(patch: Partial<HistoryPreferences>): Promise<void> {
  const current = await loadHistoryPreferences()
  await set(STORAGE_KEYS.historyManager, { ...current, ...patch })
}

export async function pushRecentSearch(query: string): Promise<string[]> {
  const trimmed = query.trim()
  if (!trimmed) return (await loadHistoryPreferences()).recentSearches
  const current = await loadHistoryPreferences()
  const next = [trimmed, ...current.recentSearches.filter((s) => s !== trimmed)].slice(0, 10)
  await saveHistoryPreferences({ recentSearches: next })
  return next
}

export async function sessionsApiAvailable(): Promise<boolean> {
  if (!chrome.sessions?.getRecentlyClosed) return false
  try {
    return await chrome.permissions.contains({ permissions: ['sessions'] })
  } catch {
    return false
  }
}

export async function requestSessionsPermission(): Promise<boolean> {
  try {
    if (await chrome.permissions.contains({ permissions: ['sessions'] })) return true
    return await chrome.permissions.request({ permissions: ['sessions'] })
  } catch {
    return false
  }
}

export async function getRecentlyClosed(maxResults = 25): Promise<chrome.sessions.Session[] | undefined> {
  if (!chrome.sessions?.getRecentlyClosed) return []
  return chrome.sessions.getRecentlyClosed({ maxResults })
}

export async function restoreSession(sessionId: string): Promise<void> {
  if (!chrome.sessions?.restore) return
  await chrome.sessions.restore(sessionId)
}
