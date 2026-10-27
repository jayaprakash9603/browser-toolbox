import { useCallback, useEffect, useState, useSyncExternalStore, type RefObject } from 'react'

const PAUSE_KEY = 'tbx.home.demos.paused'

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

export function usePageVisible() {
  return useSyncExternalStore(
    subscribeVisibility,
    () => !document.hidden,
    () => true,
  )
}

/** True while the element overlaps the viewport. Stays false where IntersectionObserver is missing (tests). */
export function useInViewport(ref: RefObject<Element | null>) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '48px 0px',
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return visible
}

/**
 * Steps through `count` items, one per finished demo (`advance`). The first demo starts `lead` ms
 * after the card becomes active so a grid of cards ripples instead of playing in unison.
 */
export function useDemoCycle(count: number, active: boolean, lead: number) {
  const [index, setIndex] = useState(0)
  const [started, setStarted] = useState(lead <= 0)

  useEffect(() => {
    if (started || !active) return
    const timer = setTimeout(() => setStarted(true), lead)
    return () => clearTimeout(timer)
  }, [started, active, lead])

  const advance = useCallback(() => setIndex((current) => (current + 1) % Math.max(count, 1)), [count])

  return { index: index % Math.max(count, 1), running: active && started, advance }
}

function readPaused() {
  try {
    return localStorage.getItem(PAUSE_KEY) === '1'
  } catch {
    return false
  }
}

/** Shared play/pause switch for the home category demos, remembered across sessions. */
export function useDemoPlayback() {
  const [paused, setPaused] = useState(readPaused)
  const toggle = () =>
    setPaused((current) => {
      const next = !current
      try {
        localStorage.setItem(PAUSE_KEY, next ? '1' : '0')
      } catch {
        // Storage can be unavailable in private contexts; the toggle still works for this session.
      }
      return next
    })
  return { paused, toggle }
}
