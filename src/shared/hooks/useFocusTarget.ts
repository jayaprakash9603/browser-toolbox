import { useEffect, type RefObject } from 'react'

import { useRouter } from '@/app/router'
import { parseSearchParam } from '@/shared/hooks/useDeepLinkTab'

function highlightElement(el: HTMLElement) {
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  el.classList.add('search-highlight')
  return window.setTimeout(() => el.classList.remove('search-highlight'), 1500)
}

export function useFocusTarget(containerRef?: RefObject<HTMLElement | null>) {
  const { search, navKey } = useRouter()
  const focusId = parseSearchParam(search, 'focus')

  useEffect(() => {
    if (!focusId) return

    const selector = `[data-search-id="${CSS.escape(focusId)}"]`
    let timeoutId: number | undefined
    let attempts = 0

    const apply = () => {
      const scope = containerRef?.current ?? document
      const el =
        scope instanceof Document
          ? scope.querySelector<HTMLElement>(selector)
          : scope.querySelector<HTMLElement>(selector)
      if (!el) return false
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      timeoutId = highlightElement(el)
      return true
    }

    const tick = () => {
      if (apply() || attempts > 20) return
      attempts += 1
      window.requestAnimationFrame(tick)
    }

    tick()

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [focusId, navKey, containerRef])
}
