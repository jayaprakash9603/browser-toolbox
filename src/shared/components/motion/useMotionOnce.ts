import { useEffect, useState } from 'react'

const completedEntrances = new Set<string>()

/**
 * Keeps an entrance animation from replaying after a route is unmounted and mounted again.
 * The registry intentionally lives for the lifetime of the panel document, not in storage.
 */
export function useMotionOnce(key?: string) {
  const [shouldAnimate] = useState(() => !key || !completedEntrances.has(key))

  useEffect(() => {
    if (key && shouldAnimate) completedEntrances.add(key)
  }, [key, shouldAnimate])

  return shouldAnimate
}
