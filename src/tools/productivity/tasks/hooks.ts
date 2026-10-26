import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

import { watchActivePage, type ActivePage } from '@/core/tasks/activePage'
import { DEFAULT_TASK_PREFS, type TaskPrefs, type TasksData } from '@/core/tasks/model'
import {
  loadTaskPrefs,
  loadTasks,
  saveTaskPrefs,
  updateTasks,
  watchTasks,
} from '@/core/tasks/storage'

export type Mutate = (fn: (current: TasksData) => TasksData) => Promise<TasksData>

/**
 * Tasks state applied optimistically, then persisted with a read-modify-write. Storage echoes are
 * ignored while our own writes are in flight so rapid actions never flicker back.
 */
export function useTasksStore() {
  const [data, setData] = useState<TasksData | null>(null)
  const [prefs, setPrefs] = useState<TaskPrefs>(DEFAULT_TASK_PREFS)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const pending = useRef(0)

  useEffect(() => {
    let live = true
    void Promise.all([loadTasks(), loadTaskPrefs()]).then(([storedData, storedPrefs]) => {
      if (!live) return
      setData(storedData)
      setPrefs(storedPrefs)
      setPrefsLoaded(true)
    })
    const off = watchTasks((next) => {
      if (live && pending.current === 0) setData(next)
    })
    return () => {
      live = false
      off()
    }
  }, [])

  useEffect(() => {
    if (prefsLoaded) void saveTaskPrefs(prefs)
  }, [prefs, prefsLoaded])

  const mutate = useCallback<Mutate>((fn) => {
    setData((previous) => (previous ? fn(previous) : previous))
    pending.current += 1
    return updateTasks(fn).then(
      (next) => {
        pending.current -= 1
        if (pending.current === 0) setData(next)
        return next
      },
      (error: unknown) => {
        pending.current -= 1
        throw error
      },
    )
  }, [])

  const updatePrefs = useCallback((patch: Partial<TaskPrefs>) => {
    setPrefs((previous) => ({ ...previous, ...patch }))
  }, [])

  return { data, mutate, prefs, prefsLoaded, updatePrefs }
}

/** Current time, refreshed on an interval and whenever the panel becomes visible again. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, intervalMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs])
  return now
}

export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return width
}

export function useActivePage(): ActivePage | null {
  const [page, setPage] = useState<ActivePage | null>(null)
  useEffect(() => watchActivePage(setPage), [])
  return page
}
