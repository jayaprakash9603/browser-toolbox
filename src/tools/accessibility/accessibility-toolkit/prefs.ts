import { useCallback, useEffect, useState } from 'react'

import { get, set } from '@/core/storage'

export interface A11yToolkitPrefs {
  includeAAA: boolean
  includeNotices: boolean
  contrast: boolean
  autoRescan: boolean
  /** Failing elements kept per issue. */
  maxNodes: number
}

export const DEFAULT_A11Y_PREFS: A11yToolkitPrefs = {
  includeAAA: false,
  includeNotices: true,
  contrast: true,
  autoRescan: true,
  maxNodes: 25,
}

export const MAX_NODE_CHOICES = [10, 25, 50, 100] as const

const PREFS_KEY = 'a11y.prefs'
const HISTORY_KEY = 'a11y.history'
const HISTORY_LIMIT = 60
const SAVE_DELAY_MS = 250

function sanitize(stored: Partial<A11yToolkitPrefs>): A11yToolkitPrefs {
  const base = DEFAULT_A11Y_PREFS
  const flag = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)
  return {
    includeAAA: flag(stored.includeAAA, base.includeAAA),
    includeNotices: flag(stored.includeNotices, base.includeNotices),
    contrast: flag(stored.contrast, base.contrast),
    autoRescan: flag(stored.autoRescan, base.autoRescan),
    maxNodes: (MAX_NODE_CHOICES as readonly number[]).includes(stored.maxNodes ?? -1) ? stored.maxNodes! : base.maxNodes,
  }
}

export function useA11yPrefs() {
  const [prefs, setPrefs] = useState<A11yToolkitPrefs>(DEFAULT_A11Y_PREFS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    get<Partial<A11yToolkitPrefs>>(PREFS_KEY)
      .then((stored) => {
        if (!alive) return
        if (stored) setPrefs(sanitize(stored))
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
    const timer = window.setTimeout(() => void set(PREFS_KEY, prefs).catch(() => undefined), SAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [prefs, loaded])

  const update = useCallback((patch: Partial<A11yToolkitPrefs>) => setPrefs((prev) => ({ ...prev, ...patch })), [])
  const reset = useCallback(() => setPrefs(DEFAULT_A11Y_PREFS), [])

  return { prefs, loaded, update, reset }
}

interface HistoryEntry {
  score: number
  at: number
}

/** Query strings and fragments usually don't change which template is being checked. */
export function historyKey(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url
  }
}

/** Stores this scan's score and returns the one recorded before it, if any. */
export async function recordScore(url: string, score: number, now = Date.now()): Promise<HistoryEntry | null> {
  const key = historyKey(url)
  const history = (await get<Record<string, HistoryEntry>>(HISTORY_KEY).catch(() => undefined)) ?? {}
  const previous = history[key] ?? null
  history[key] = { score, at: now }
  const trimmed = Object.entries(history)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, HISTORY_LIMIT)
  await set(HISTORY_KEY, Object.fromEntries(trimmed)).catch(() => undefined)
  return previous
}
