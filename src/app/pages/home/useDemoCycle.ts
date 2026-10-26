import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react'

export const DEMO_STEP_MS = 4400

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
 * Steps through `count` items while `active`. The first step waits an extra `lead` ms so a grid of
 * cards ripples instead of switching in unison.
 */
export function useDemoCycle(count: number, active: boolean, lead: number) {
  const [index, setIndex] = useState(0)
  const [first, setFirst] = useState(true)
  const running = active && count > 1
  const stepMs = first ? DEMO_STEP_MS + lead : DEMO_STEP_MS

  useEffect(() => {
    if (!running) return
    const timer = setTimeout(() => {
      setFirst(false)
      setIndex((current) => (current + 1) % count)
    }, stepMs)
    return () => clearTimeout(timer)
  }, [running, count, stepMs, index])

  return { index: index % Math.max(count, 1), stepMs, running }
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
