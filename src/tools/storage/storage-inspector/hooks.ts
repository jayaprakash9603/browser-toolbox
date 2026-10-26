import { useCallback, useEffect, useRef, useState } from 'react'

import type { StorageSnapshot } from '@/chrome/content/index'

import { loadStorageSnapshot, writeStorage, type StorageWrite } from './loadSnapshot'

const LIVE_INTERVAL_MS = 2000

/**
 * Page storage with optional live refresh. Polling only runs while the panel is visible and the
 * state is replaced only when the data actually changed, so an idle page never re-renders the list.
 */
export function useStorageData(live: boolean) {
  const [snapshot, setSnapshot] = useState<StorageSnapshot | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const signature = useRef('')
  const mounted = useRef(true)

  const apply = useCallback((next: StorageSnapshot | null) => {
    const sig = next ? JSON.stringify([next.localStorage, next.sessionStorage]) : ''
    if (sig === signature.current && next !== null) return
    signature.current = sig
    setSnapshot(next)
  }, [])

  const refresh = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true)
      const next = await loadStorageSnapshot()
      if (!mounted.current) return
      apply(next)
      setLoaded(true)
      setRefreshing(false)
    },
    [apply],
  )

  useEffect(() => {
    mounted.current = true
    void refresh(true)
    return () => {
      mounted.current = false
    }
  }, [refresh])

  useEffect(() => {
    if (!live) return
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh(true)
    }
    const id = window.setInterval(tick, LIVE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [live, refresh])

  const write = useCallback(
    async (change: StorageWrite): Promise<boolean> => {
      const result = await writeStorage(change)
      if (!mounted.current) return result.ok
      if (result.ok) apply(result.snapshot)
      return result.ok
    },
    [apply],
  )

  return { snapshot, loaded, refreshing, refresh, write }
}
