import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { cn } from '@/shared/utils/cn'

interface ChipRailProps {
  children: ReactNode
  /** Role and name for the row itself, such as a tablist of categories. */
  role?: string
  label?: string
  className?: string
}

const FADE = 28

/**
 * One row of chips that never wraps. When the row is wider than the space, it scrolls
 * sideways inside itself; edges fade and arrow buttons appear only on the hidden side.
 */
export function ChipRail({ children, role, label, className }: ChipRailProps) {
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
    // The first observation reports both sizes, so the edges are measured without a synchronous update.
    const observer = new ResizeObserver(update)
    observer.observe(scroller)
    observer.observe(content)
    scroller.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      scroller.removeEventListener('scroll', update)
    }
  }, [])

  const nudge = (direction: 1 | -1) => {
    const scroller = rail.current
    if (!scroller) return
    const rtl = getComputedStyle(scroller).direction === 'rtl' ? -1 : 1
    scroller.scrollBy({ left: direction * rtl * scroller.clientWidth * 0.7, behavior: reduce ? 'auto' : 'smooth' })
  }

  const mask = `linear-gradient(to right, ${edges.start ? 'transparent' : '#000'} 0, #000 ${edges.start ? FADE : 0}px, #000 calc(100% - ${edges.end ? FADE : 0}px), ${edges.end ? 'transparent' : '#000'} 100%)`

  const arrow = 'absolute top-1/2 z-[1] flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-[opacity,color] duration-200 hover:text-foreground'

  return (
    <div className={cn('group/rail relative min-w-0', className)}>
      <div
        ref={rail}
        className="scrollbar-none overflow-x-auto overscroll-x-contain scroll-px-1 py-0.5"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        <div ref={row} role={role} aria-label={label} className="flex w-max gap-1.5 px-px">
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
