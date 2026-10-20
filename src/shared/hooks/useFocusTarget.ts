import { useEffect, type RefObject } from 'react'

import { useRouter } from '@/app/router'
import { parseSearchParam } from '@/shared/hooks/useDeepLinkTab'

import { highlightSearchTarget } from '@/shared/lib/searchHighlight'

const MAX_WAIT_MS = 4000

export function useFocusTarget(containerRef?: RefObject<HTMLElement | null>) {
  const { search, navKey } = useRouter()
  const focusId = parseSearchParam(search, 'focus')

  useEffect(() => {
    if (!focusId) return

    const selector = `[data-search-id="${CSS.escape(focusId)}"]`
    let highlightTimer: number | undefined
    let frame = 0
    let cancelled = false
    const startedAt = performance.now()

    const tick = () => {
      if (cancelled) return
      const scope: ParentNode = containerRef?.current ?? document
      const el = scope.querySelector<HTMLElement>(selector)
      if (el) {
        highlightTimer = highlightSearchTarget(el)
        return
      }
      // Target may not be mounted yet (lazy tool, expanding section, async data).
      if (performance.now() - startedAt < MAX_WAIT_MS) {
        frame = window.requestAnimationFrame(tick)
      }
    }

    tick()

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      if (highlightTimer !== undefined) window.clearTimeout(highlightTimer)
    }
  }, [focusId, navKey, containerRef])
}
