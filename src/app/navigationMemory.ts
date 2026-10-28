import { useCallback, useState } from 'react'

import { useRouter } from './router'

const RESTORE_TIMEOUT_MS = 2000
const USER_INPUT = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const

const scrollPositions = new Map<string, number>()
const viewState = new Map<string, unknown>()

/** Keeps a page's scroll position across visits; attach the returned ref to its scroll container. */
export function useScrollMemory<T extends HTMLElement>() {
  const { path } = useRouter()
  return useCallback(
    (element: T | null) => {
      if (!element) return
      const target = scrollPositions.get(path) ?? 0
      const deadline = performance.now() + RESTORE_TIMEOUT_MS
      let restoring = target > 0
      let restoreFrame = 0
      let saveFrame = 0

      // Sections load lazily, so keep retrying until the page is tall enough or the user takes over.
      const restore = () => {
        if (!restoring) return
        element.scrollTop = target
        if (Math.abs(element.scrollTop - target) <= 1 || performance.now() > deadline) restoring = false
        else restoreFrame = requestAnimationFrame(restore)
      }
      const stopRestoring = () => {
        restoring = false
      }
      const onScroll = () => {
        if (restoring || saveFrame) return
        saveFrame = requestAnimationFrame(() => {
          saveFrame = 0
          scrollPositions.set(path, element.scrollTop)
        })
      }

      restore()
      element.addEventListener('scroll', onScroll, { passive: true })
      for (const type of USER_INPUT) element.addEventListener(type, stopRestoring, { passive: true })
      return () => {
        cancelAnimationFrame(restoreFrame)
        cancelAnimationFrame(saveFrame)
        element.removeEventListener('scroll', onScroll)
        for (const type of USER_INPUT) element.removeEventListener(type, stopRestoring)
      }
    },
    [path],
  )
}

/** `useState` that survives leaving and reopening a page, such as a search query or a filter chip. */
export function useRememberedState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => (viewState.has(key) ? (viewState.get(key) as T) : initial))
  const update = useCallback(
    (next: T) => {
      viewState.set(key, next)
      setValue(next)
    },
    [key],
  )
  return [value, update] as const
}
