import { useCallback, useEffect, useState } from 'react'

import { useRouter } from '@/app/router'
import { highlightSearchTarget } from '@/shared/lib/searchHighlight'

export function parseSearchParam(search: string, key: string): string | null {
  const value = new URLSearchParams(search).get(key)
  return value && value.length > 0 ? value : null
}

function resolveFromSearch<T extends string>(
  search: string,
  paramKey: string,
  allowed: readonly T[] | null,
  fallback: T,
): T {
  const fromUrl = parseSearchParam(search, paramKey)
  if (!fromUrl) return fallback
  if (allowed && !(allowed as readonly string[]).includes(fromUrl)) return fallback
  return fromUrl as T
}

export function useDeepLinkTab<T extends string>(
  paramKey: string,
  allowed: readonly T[],
  fallback: T,
): [T, (value: T) => void] {
  const { search, navKey } = useRouter()
  const [tab, setTab] = useState<T>(() => resolveFromSearch(search, paramKey, allowed, fallback))
  const [syncKey, setSyncKey] = useState(`${search}|${navKey}`)

  const nextKey = `${search}|${navKey}`
  if (nextKey !== syncKey) {
    setSyncKey(nextKey)
    const resolved = resolveFromSearch(search, paramKey, allowed, fallback)
    if (resolved !== tab) setTab(resolved)
  }

  // Pulse the tab that search just selected so the landing spot is obvious.
  const requested = parseSearchParam(search, paramKey)
  const requestedValid = requested !== null && (allowed as readonly string[]).includes(requested)
  useEffect(() => {
    if (!requestedValid) return
    let timer: number | undefined
    const frame = window.setTimeout(() => {
      const active = document.querySelector<HTMLElement>(
        `[role="tab"][data-state="active"][id$="trigger-${CSS.escape(requested)}"]`,
      ) ?? document.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
      if (active) timer = highlightSearchTarget(active, false)
    }, 120)
    return () => {
      window.clearTimeout(frame)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [requestedValid, requested, navKey])

  const setValue = useCallback((value: T) => setTab(value), [])
  return [tab, setValue]
}

export function useDeepLinkParam<T extends string>(
  paramKey: string,
  allowed: readonly T[] | null,
  fallback: T,
): [T, (value: T) => void] {
  const { search, navKey } = useRouter()
  const [value, setValueState] = useState<T>(() => resolveFromSearch(search, paramKey, allowed, fallback))
  const [syncKey, setSyncKey] = useState(`${search}|${navKey}`)

  const nextKey = `${search}|${navKey}`
  if (nextKey !== syncKey) {
    setSyncKey(nextKey)
    const resolved = resolveFromSearch(search, paramKey, allowed, fallback)
    if (resolved !== value) setValueState(resolved)
  }

  const setValue = useCallback((next: T) => setValueState(next), [])
  return [value, setValue]
}
