import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  applyHistoryFilters,
  defaultHistoryFilters,
  HISTORY_MANAGER_REVISION_KEY,
  HISTORY_SEARCH_DEBOUNCE_MS,
  type HistoryFilters,
  type HistoryPage,
  type HistoryRangePreset,
} from '@/core/history-manager'

import {
  clearVisitsCache,
  loadHistoryForRange,
  loadHistoryPreferences,
  pushRecentSearch,
  saveHistoryPreferences,
} from './service'

export function useHistoryManager(enabled: boolean) {
  const [rawPages, setRawPages] = useState<HistoryPage[]>([])
  const [filters, setFilters] = useState<HistoryFilters>(() => defaultHistoryFilters())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [density, setDensity] = useState<'compact' | 'detailed'>('compact')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const filteredPages = useMemo(() => applyHistoryFilters(rawPages, filters), [rawPages, filters])

  const load = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const result = await loadHistoryForRange(
        filters.range,
        filters.query,
        filters.customStart,
        filters.customEnd,
      )
      setRawPages(result.pages)
      setTruncated(result.truncated)
      setError(null)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }, [enabled, filters.customEnd, filters.customStart, filters.query, filters.range])

  useEffect(() => {
    if (!enabled) return
    void loadHistoryPreferences().then((prefs) => {
      setRecentSearches(prefs.recentSearches)
      setDensity(prefs.density)
      setFilters((f) => ({ ...f, range: prefs.range }))
    })
  }, [enabled])

  useEffect(() => {
    if (!enabled) return undefined
    const onRevision = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes[HISTORY_MANAGER_REVISION_KEY]) void load()
    }
    chrome.storage.session.onChanged.addListener(onRevision)
    return () => chrome.storage.session.onChanged.removeListener(onRevision)
  }, [enabled, load])

  useEffect(() => {
    if (!enabled) return undefined
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void load()
    }, filters.query ? HISTORY_SEARCH_DEBOUNCE_MS : 0)
    return () => clearTimeout(debounceRef.current)
  }, [enabled, load, filters.query, filters.range, filters.customStart, filters.customEnd])

  const patchFilters = useCallback((patch: Partial<HistoryFilters>) => {
    setFilters((current) => ({ ...current, ...patch }))
  }, [])

  const setRange = useCallback((range: HistoryRangePreset) => {
    setFilters((f) => ({ ...f, range, customStart: undefined, customEnd: undefined }))
    void saveHistoryPreferences({ range })
  }, [])

  const setQuery = useCallback((query: string) => {
    setFilters((f) => ({ ...f, query }))
  }, [])

  const commitSearch = useCallback(async () => {
    const next = await pushRecentSearch(filters.query)
    setRecentSearches(next)
  }, [filters.query])

  const refresh = useCallback(() => {
    clearVisitsCache()
    void load()
  }, [load])

  const setDensityMode = useCallback((next: 'compact' | 'detailed') => {
    setDensity(next)
    void saveHistoryPreferences({ density: next })
  }, [])

  return {
    rawPages,
    filteredPages,
    filters,
    patchFilters,
    setRange,
    setQuery,
    commitSearch,
    recentSearches,
    loading,
    error,
    truncated,
    refresh,
    density,
    setDensityMode,
  }
}
