import { useCallback, useLayoutEffect, useState } from 'react'

/** Tracks an element's own width (not the viewport's), so layouts adapt to side panels and split panes. */
export function useElementWidth<T extends HTMLElement>(): [(node: T | null) => void, number] {
  const [node, setNode] = useState<T | null>(null)
  const [width, setWidth] = useState(0)
  const ref = useCallback((next: T | null) => setNode(next), [])

  useLayoutEffect(() => {
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])

  return [ref, width]
}
