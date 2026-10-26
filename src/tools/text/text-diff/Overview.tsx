import { useEffect, useMemo, useState, type RefObject } from 'react'

import type { DiffRow, RowKind, ViewItem } from '@/core/engines/diff'
import { cn } from '@/shared/utils/cn'

import { SWATCH } from './styles'

type Swatch = keyof typeof SWATCH

interface Mark {
  top: number
  height: number
  swatch: Swatch
}

const leftSwatch = (kind: RowKind): Swatch | null =>
  kind === 'changed' ? 'changed' : kind === 'left' ? 'orphan' : kind === 'minor' ? 'minor' : null
const rightSwatch = (kind: RowKind): Swatch | null =>
  kind === 'changed' ? 'changed' : kind === 'right' ? 'orphan' : kind === 'minor' ? 'minor' : null

function buildMarks(items: ViewItem[], rows: readonly DiffRow[], pick: (kind: RowKind) => Swatch | null): Mark[] {
  const marks: Mark[] = []
  const total = items.length || 1
  let start = 0
  let current: Swatch | null = null
  items.forEach((item, index) => {
    const swatch = item.type === 'row' ? pick(rows[item.row].kind) : null
    if (swatch === current) return
    if (current) marks.push({ top: start / total, height: (index - start) / total, swatch: current })
    current = swatch
    start = index
  })
  if (current) marks.push({ top: start / total, height: (items.length - start) / total, swatch: current })
  return marks
}

export function Overview({
  items,
  rows,
  scrollerRef,
}: {
  items: ViewItem[]
  rows: readonly DiffRow[]
  scrollerRef: RefObject<HTMLDivElement | null>
}) {
  const left = useMemo(() => buildMarks(items, rows, leftSwatch), [items, rows])
  const right = useMemo(() => buildMarks(items, rows, rightSwatch), [items, rows])
  const [geometry, setGeometry] = useState({ boxTop: 0, boxHeight: 0, viewTop: 0, viewHeight: 0, scrollable: false })

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    let frame = 0
    const update = () => {
      frame = 0
      const content = scroller.firstElementChild as HTMLElement | null
      const header = (content?.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0
      const contentHeight = content?.offsetHeight ?? 0
      const { clientHeight, scrollHeight, scrollTop } = scroller
      const scrollable = scrollHeight > clientHeight + 1
      const scale = scrollable ? clientHeight / scrollHeight : 1
      setGeometry({
        boxTop: header * scale,
        boxHeight: Math.max(0, contentHeight - header) * scale,
        viewTop: scrollTop * scale,
        viewHeight: clientHeight * scale,
        scrollable,
      })
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    scroller.addEventListener('scroll', schedule, { passive: true })
    const observer = new ResizeObserver(schedule)
    observer.observe(scroller)
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild)
    return () => {
      cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', schedule)
      observer.disconnect()
    }
  }, [scrollerRef, items])

  const scrollTo = (event: React.PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
    scroller.scrollTop = fraction * scroller.scrollHeight - scroller.clientHeight / 2
  }

  const renderMarks = (marks: Mark[], side: 'left' | 'right') =>
    marks.map((mark, index) => (
      <span
        key={`${side}-${index}`}
        className={cn('absolute w-[5px] rounded-[1px] opacity-80', SWATCH[mark.swatch], side === 'left' ? 'left-[2px]' : 'right-[2px]')}
        style={{ top: `${mark.top * 100}%`, height: `max(2px, ${mark.height * 100}%)` }}
      />
    ))

  return (
    <div
      aria-hidden
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        scrollTo(event)
      }}
      onPointerMove={(event) => {
        if (event.buttons === 1) scrollTo(event)
      }}
      className="relative w-4 shrink-0 cursor-pointer touch-none border-r bg-muted/40"
    >
      <div className="absolute inset-x-0" style={{ top: geometry.boxTop, height: geometry.boxHeight }}>
        {renderMarks(left, 'left')}
        {renderMarks(right, 'right')}
      </div>
      {geometry.scrollable && (
        <span
          className="pointer-events-none absolute inset-x-px rounded-[3px] border border-foreground/35 bg-foreground/[0.06]"
          style={{ top: geometry.viewTop, height: geometry.viewHeight }}
        />
      )}
    </div>
  )
}
