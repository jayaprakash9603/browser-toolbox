import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  emptyWorkspace,
  loadBookmarkWorkspace,
  parseBookmarkWorkspace,
  saveBookmarkWorkspace,
  snapshotWorkspace,
  type BookmarkWorkspace,
} from '@/core/bookmarks'
import { STORAGE_KEYS } from '@/core/constants'
import { useToast } from '@/shared/components/toast/useToast'

import { watchBookmarks } from './bookmarkActions'
import { loadBookmarkLibrary, type BookmarkLibrary } from './service'

const EMPTY_LIBRARY: BookmarkLibrary = { rows: [], folders: [] }
const RELOAD_DEBOUNCE_MS = 120

type PersistFn = (
  next: BookmarkWorkspace,
  message?: string,
  values?: Record<string, unknown>,
) => Promise<void>

export function useBookmarkSync(granted: boolean) {
  const { t } = useTranslation()
  const { show: showToast } = useToast()
  const [library, setLibrary] = useState<BookmarkLibrary>(EMPTY_LIBRARY)
  const [workspace, setWorkspace] = useState<BookmarkWorkspace>(emptyWorkspace)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const workspaceRef = useRef(workspace)
  const libraryRef = useRef(library)
  const persistRef = useRef<PersistFn>(async () => undefined)
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    workspaceRef.current = workspace
    libraryRef.current = library
  }, [library, workspace])

  const persist = useCallback<PersistFn>(
    async (next, message, values) => {
      const previous = snapshotWorkspace(workspaceRef.current)
      workspaceRef.current = next
      setWorkspace(next)
      await saveBookmarkWorkspace(next)
      if (message) {
        showToast(t(message, values), { undo: () => void persistRef.current(previous) })
      }
    },
    [showToast, t],
  )

  useEffect(() => {
    persistRef.current = persist
  }, [persist])

  const persistPrefs = (patch: Partial<BookmarkWorkspace['prefs']>) => {
    const current = workspaceRef.current
    const next = { ...current, prefs: { ...current.prefs, ...patch } }
    workspaceRef.current = next
    setWorkspace(next)
    void saveBookmarkWorkspace(next)
  }

  const load = useCallback(async () => {
    if (!chrome.bookmarks?.getTree) {
      setError(t('bookmarks.unavailable'))
      return
    }
    setLoading(true)
    try {
      const [tree, overlay] = await Promise.all([loadBookmarkLibrary(), loadBookmarkWorkspace()])
      libraryRef.current = tree
      workspaceRef.current = overlay
      setLibrary(tree)
      setWorkspace(overlay)
      setError(null)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : t('bookmarks.loadError'))
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }, [t])

  const scheduleReload = useCallback(() => {
    clearTimeout(reloadTimer.current)
    reloadTimer.current = setTimeout(() => void load(), RELOAD_DEBOUNCE_MS)
  }, [load])

  useEffect(() => {
    if (!granted) return
    const timer = window.setTimeout(() => void load(), 0)
    const unwatch = watchBookmarks(scheduleReload)
    return () => {
      window.clearTimeout(timer)
      unwatch()
      clearTimeout(reloadTimer.current)
    }
  }, [granted, load, scheduleReload])

  useEffect(() => {
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local' || !changes[STORAGE_KEYS.bookmarkWorkspace]) return
      const next = changes[STORAGE_KEYS.bookmarkWorkspace].newValue
      if (!next) return
      const parsed = parseBookmarkWorkspace(next)
      workspaceRef.current = parsed
      setWorkspace(parsed)
    }
    chrome.storage?.onChanged?.addListener(onChange)
    return () => chrome.storage?.onChanged?.removeListener(onChange)
  }, [])

  return {
    t,
    showToast,
    library,
    workspace,
    loaded,
    loading,
    error,
    load,
    persist,
    persistPrefs,
    scheduleReload,
    workspaceRef,
    libraryRef,
  }
}
