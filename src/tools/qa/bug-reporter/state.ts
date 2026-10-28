import { useCallback, useEffect, useRef, useState } from 'react'

import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'
import { collectEnvironment, pageFromTab } from './environment'
import {
  createDraft,
  DEFAULT_PREFS,
  MAX_HISTORY,
  sanitizeDraft,
  sanitizeEnvironment,
  sanitizeHistory,
  sanitizePage,
  sanitizePrefs,
  upsertReport,
  type BugDraft,
  type BugEnvironment,
  type PageContext,
  type ReportPrefs,
  type SavedReport,
} from './report'

const SAVE_DELAY_MS = 400

export interface ReportContext {
  page: PageContext | null
  env: BugEnvironment | null
}

/** `context` is null while the report follows whichever tab is active. */
export interface DraftSnapshot {
  draft: BugDraft
  context: ReportContext | null
}

function readSnapshot(value: unknown): DraftSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const stored = value as { draft?: unknown; context?: { page?: unknown; env?: unknown } | null }
  const draft = sanitizeDraft(stored.draft)
  if (!draft) return null
  const context = stored.context
    ? { page: sanitizePage(stored.context.page), env: sanitizeEnvironment(stored.context.env) }
    : null
  return { draft, context }
}

/** The report being written, autosaved so closing the panel never loses it. */
export function useBugDraft() {
  const [snapshot, setSnapshot] = useState<DraftSnapshot>(() => ({
    draft: createDraft(),
    context: null,
  }))
  const [loaded, setLoaded] = useState(false)
  const pending = useRef<DraftSnapshot | null>(null)

  useEffect(() => {
    let alive = true
    get<unknown>(STORAGE_KEYS.bugReporterDraft)
      .then((stored) => {
        if (!alive) return
        const restored = readSnapshot(stored)
        if (restored) setSnapshot(restored)
        setLoaded(true)
      })
      .catch(() => {
        if (alive) setLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    pending.current = snapshot
    const timer = window.setTimeout(() => {
      pending.current = null
      void set(STORAGE_KEYS.bugReporterDraft, snapshot).catch(() => undefined)
    }, SAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [snapshot, loaded])

  useEffect(() => {
    const queue = pending
    return () => {
      if (queue.current) void set(STORAGE_KEYS.bugReporterDraft, queue.current).catch(() => undefined)
    }
  }, [])

  const update = useCallback(
    (patch: Partial<BugDraft>) =>
      setSnapshot((prev) => ({ ...prev, draft: { ...prev.draft, ...patch } })),
    [],
  )
  const pin = useCallback(
    (context: ReportContext | null) => setSnapshot((prev) => ({ ...prev, context })),
    [],
  )
  const replace = useCallback((next: DraftSnapshot) => setSnapshot(next), [])

  return { draft: snapshot.draft, context: snapshot.context, snapshot, loaded, update, pin, replace }
}

export function useBugHistory() {
  const [items, setItems] = useState<SavedReport[]>([])

  useEffect(() => {
    let alive = true
    get<unknown>(STORAGE_KEYS.bugReporterHistory)
      .then((stored) => {
        if (!alive) return
        const loaded = sanitizeHistory(stored)
        setItems((current) => {
          if (current.length === 0) return loaded
          const merged = [
            ...current,
            ...loaded.filter((item) => !current.some((entry) => entry.id === item.id)),
          ].slice(0, MAX_HISTORY)
          void set(STORAGE_KEYS.bugReporterHistory, merged).catch(() => undefined)
          return merged
        })
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const commit = useCallback((change: (current: SavedReport[]) => SavedReport[]) => {
    setItems((current) => {
      const next = change(current)
      void set(STORAGE_KEYS.bugReporterHistory, next).catch(() => undefined)
      return next
    })
  }, [])

  const save = useCallback(
    (entry: SavedReport) => commit((current) => upsertReport(current, entry)),
    [commit],
  )
  const remove = useCallback(
    (id: string) => commit((current) => current.filter((item) => item.id !== id)),
    [commit],
  )
  const restore = useCallback((list: SavedReport[]) => commit(() => list), [commit])

  return { items, save, remove, restore }
}

export function useReportPrefs() {
  const [prefs, setPrefs] = useState<ReportPrefs>(DEFAULT_PREFS)

  useEffect(() => {
    let alive = true
    get<unknown>(STORAGE_KEYS.bugReporterPrefs)
      .then((stored) => {
        if (alive && stored) setPrefs(sanitizePrefs(stored))
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const update = useCallback((patch: Partial<ReportPrefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch }
      void set(STORAGE_KEYS.bugReporterPrefs, next).catch(() => undefined)
      return next
    })
  }, [])

  return [prefs, update] as const
}

/** Follows the active tab so the panel can offer to switch the report to it. */
export function useActiveTab() {
  const [context, setContext] = useState<ReportContext>({ page: null, env: null })
  const [loading, setLoading] = useState(true)
  const request = useRef(0)

  const load = useCallback(async (): Promise<ReportContext> => {
    const id = ++request.current
    const [tab] = await chrome.tabs
      .query({ active: true, currentWindow: true })
      .catch(() => [] as chrome.tabs.Tab[])
    const next = { page: pageFromTab(tab), env: await collectEnvironment(tab) }
    if (id === request.current) {
      setContext(next)
      setLoading(false)
    }
    return next
  }, [])

  useEffect(() => {
    void load()
    const onActivated = () => void load()
    const onUpdated = (_id: number, info: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => {
      if (tab.active && (info.status === 'complete' || info.url)) void load()
    }
    chrome.tabs.onActivated?.addListener(onActivated)
    chrome.tabs.onUpdated?.addListener(onUpdated)
    return () => {
      chrome.tabs.onActivated?.removeListener(onActivated)
      chrome.tabs.onUpdated?.removeListener(onUpdated)
    }
  }, [load])

  const refresh = useCallback(() => {
    setLoading(true)
    return load()
  }, [load])

  return { ...context, loading, refresh }
}
