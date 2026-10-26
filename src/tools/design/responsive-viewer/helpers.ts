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
  windows.create({ url, type: 'popup', width: width + 16, height: height + 80, focused: true }).catch(fallback)
}
