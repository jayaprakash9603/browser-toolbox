import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { LaptopIcon, MonitorIcon, SmartphoneIcon, TabletIcon, type LucideIcon } from 'lucide-react'

import type { DeviceKind } from './devices'

export const EASE_OUT = [0.22, 1, 0.36, 1] as const

export const KIND_ICON: Record<DeviceKind, LucideIcon> = {
  phone: SmartphoneIcon,
  tablet: TabletIcon,
  laptop: LaptopIcon,
  desktop: MonitorIcon,
}

export const KIND_TONE: Record<DeviceKind, string> = {
  phone: 'bg-sky-500/12 text-sky-600 dark:text-sky-300',
  tablet: 'bg-violet-500/12 text-violet-600 dark:text-violet-300',
  laptop: 'bg-amber-500/14 text-amber-700 dark:text-amber-300',
  desktop: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
}

/** Content-box width of an element, null until the first measurement. */
export function useContentWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState<number | null>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

const subscribeResize = (callback: () => void) => {
  window.addEventListener('resize', callback)
  return () => window.removeEventListener('resize', callback)
}

export function useWindowHeight(): number {
  return useSyncExternalStore(
    subscribeResize,
    () => window.innerHeight,
    () => 800,
  )
}

export function openSizedWindow(url: string, width: number, height: number) {
  const fallback = () => window.open(url, '_blank', `popup,width=${width},height=${height}`)
  const windows = globalThis.chrome?.windows
  if (!windows?.create) {
    fallback()
    return
  }
  // Window size includes the OS frame and the popup's address bar.
  windows
    .create({ url, type: 'popup', width: width + 16, height: height + 80, focused: true })
    .catch(fallback)
}

/** Bezel thickness around the screen, in panel pixels (not scaled with the page). */
export function frameInsets(kind: DeviceKind, frame: boolean) {
  if (!frame) return { x: 0, top: 0, bottom: 0 }
  if (kind === 'phone') return { x: 8, top: 8, bottom: 8 }
  if (kind === 'tablet') return { x: 10, top: 10, bottom: 10 }
  return { x: 0, top: 24, bottom: 0 }
}

export function hostnameOf(url: string) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
