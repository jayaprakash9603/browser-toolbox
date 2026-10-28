import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { cn } from '@/shared/utils/cn'

interface ChipRailProps {
  children: ReactNode
  /** Role and name for the row itself, such as a tablist of categories. */
  role?: string
  label?: string
  /** Two rows fill column by column, so neighbours in the list stay next to each other. */
  rows?: 1 | 2
  /** Edge gradient mask; disable on opaque sticky bars so scrolling content does not show through. */
  edgeFade?: boolean
  className?: string
}

const FADE = 28

/**
 * One or two rows of chips that never wrap. When the rows are wider than the space, they scroll
 * sideways inside itself; edges fade and arrow buttons appear only on the hidden side.
 */
export function ChipRail({ children, role, label, rows = 1, edgeFade = true, className }: ChipRailProps) {
  const reduce = useReducedMotion()
  const rail = useRef<HTMLDivElement>(null)
  const row = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: false, end: false })

  useEffect(() => {
    const scroller = rail.current
    const content = row.current
    if (!scroller || !content || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const offset = Math.abs(scroller.scrollLeft)
      const start = offset > 2
      const end = offset + scroller.clientWidth < scroller.scrollWidth - 2
      setEdges((current) => (current.start === start && current.end === end ? current : { start, end }))
    }
    // A vertical mouse wheel scrolls the row sideways, but only while the row can still move
    // that way, so the page keeps scrolling once the row reaches either end.
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      const max = scroller.scrollWidth - scroller.clientWidth
      if (max <= 0) return
      const offset = Math.abs(scroller.scrollLeft)
      if ((event.deltaY < 0 && offset <= 0) || (event.deltaY > 0 && offset >= max - 1)) return
      event.preventDefault()
      const rtl = getComputedStyle(scroller).direction === 'rtl' ? -1 : 1
      scroller.scrollLeft += event.deltaY * rtl
    }
    // The first observation reports both sizes, so the edges are measured without a synchronous update.
    const observer = new ResizeObserver(update)
    observer.observe(scroller)
    observer.observe(content)
    scroller.addEventListener('scroll', update, { passive: true })
    scroller.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      observer.disconnect()
      scroller.removeEventListener('scroll', update)
      scroller.removeEventListener('wheel', onWheel)
    }
  }, [])

  const nudge = (direction: 1 | -1) => {
    const scroller = rail.current
    if (!scroller) return
    const rtl = getComputedStyle(scroller).direction === 'rtl' ? -1 : 1
    scroller.scrollBy({ left: direction * rtl * scroller.clientWidth * 0.7, behavior: reduce ? 'auto' : 'smooth' })
  }

  const mask = edgeFade
    ? `linear-gradient(to right, ${edges.start ? 'transparent' : '#000'} 0, #000 ${edges.start ? FADE : 0}px, #000 calc(100% - ${edges.end ? FADE : 0}px), ${edges.end ? 'transparent' : '#000'} 100%)`
    : undefined

  const arrow = 'absolute top-1/2 z-[1] flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-[opacity,color] duration-200 hover:text-foreground'

  return (
    <div className={cn('group/rail relative min-w-0', className)}>
      <div
        ref={rail}
        className="scrollbar-none overflow-x-auto overscroll-x-contain scroll-px-1 py-0.5"
        style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      >
        <div
          ref={row}
          role={role}
          aria-label={label}
          className={cn('w-max gap-1.5 px-px', rows === 2 ? 'grid grid-flow-col grid-rows-2' : 'flex')}
        >
          {children}
        </div>
      </div>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={() => nudge(-1)}
        className={cn(arrow, 'left-0', edges.start ? 'opacity-100' : 'pointer-events-none opacity-0')}
      >
        <ChevronLeftIcon className="size-4" />
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={() => nudge(1)}
        className={cn(arrow, 'right-0', edges.end ? 'opacity-100' : 'pointer-events-none opacity-0')}
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  )
}
