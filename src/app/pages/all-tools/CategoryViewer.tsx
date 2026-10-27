import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from 'motion/react'
import { ChevronLeftIcon, ChevronRightIcon, Minimize2Icon, type LucideIcon } from 'lucide-react'

import { ChipRail } from '@/shared/components/ChipRail'
import { cn } from '@/shared/utils/cn'
import { ToolRow, type Row } from '@/app/pages/all-tools/ToolRow'
import '@/app/pages/all-tools/i18n'

export interface ViewerSection {
  id: string
  name: string
  description: string
  icon: LucideIcon
  rows: readonly Row[]
}

export interface CategoryViewerProps {
  open: boolean
  sections: readonly ViewerSection[]
  initialId: string
  /** Called with the category on screen when the viewer closes, so the page can follow it. */
  onClose: (id: string) => void
}

const EASE = [0.22, 1, 0.36, 1] as const
const PANEL_SPRING = { type: 'spring', stiffness: 420, damping: 36, mass: 0.9 } as const
const SWIPE_RATIO = 0.18
const DRAG_SLOP = 6

const ROW_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 10 },
  shown: (order: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: EASE, delay: Math.min(order, 14) * 0.025 },
  }),
}

/** Full-panel, swipeable pager with one page per category. */
export function CategoryViewer({ open, sections, initialId, onClose }: CategoryViewerProps) {
  const returnFocus = useRef<HTMLElement | null>(null)

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        returnFocus.current?.focus({ preventScroll: true })
        returnFocus.current = null
      }}
    >
      {open && (
        <ViewerPanel
          key="viewer"
          sections={sections}
          initialId={initialId}
          onClose={onClose}
          onOpened={(previous) => {
            returnFocus.current = previous
          }}
        />
      )}
    </AnimatePresence>,
    document.body,
  )
}

function ViewerPanel({
  sections,
  initialId,
  onClose,
  onOpened,
}: Omit<CategoryViewerProps, 'open'> & { onOpened: (previous: HTMLElement | null) => void }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const last = sections.length - 1
  const startIndex = Math.max(0, sections.findIndex((section) => section.id === initialId))

  const [index, setIndex] = useState(startIndex)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set([startIndex]))
  const [dragging, setDragging] = useState(false)

  const panel = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const indexRef = useRef(startIndex)
  const target = useRef<number | null>(null)
  const drag = useRef<{ id: number; x: number; left: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const rememberFocus = useEffectEvent(onOpened)

  const position = useMotionValue(startIndex)
  const smooth = useSpring(position, { stiffness: 520, damping: 44 })
  const scrubberX = useTransform(reduce ? position : smooth, (value) => `${value * 100}%`)

  const section = sections[index] ?? sections[0]

  const commit = useCallback((next: number) => {
    if (next === indexRef.current) return
    setDirection(next > indexRef.current ? 1 : -1)
    indexRef.current = next
    setIndex(next)
    setVisited((current) => (current.has(next) ? current : new Set(current).add(next)))
  }, [])

  const goTo = useCallback(
    (next: number) => {
      const scroller = track.current
      if (!scroller) return
      const clamped = Math.min(Math.max(next, 0), last)
      target.current = clamped
      commit(clamped)
      scroller.scrollTo({
        left: clamped * scroller.clientWidth * flow(scroller),
        behavior: reduce ? 'auto' : 'smooth',
      })
    },
    [commit, last, reduce],
  )

  useLayoutEffect(() => {
    const scroller = track.current
    if (!scroller) return
    scroller.scrollLeft = startIndex * scroller.clientWidth * flow(scroller)
    rememberFocus(document.activeElement instanceof HTMLElement ? document.activeElement : null)
    closeButton.current?.focus({ preventScroll: true })
  }, [startIndex])

  useEffect(() => {
    const scroller = track.current
    if (!scroller) return
    let frame = 0
    const read = () => {
      frame = 0
      const offset = Math.abs(scroller.scrollLeft) / (scroller.clientWidth || 1)
      position.set(offset)
      const nearest = Math.min(Math.max(Math.round(offset), 0), last)
      // A button or tab jump scrolls past the pages in between; keep the destination selected meanwhile.
      if (target.current !== null) {
        if (Math.abs(offset - target.current) < 0.01) target.current = null
        return
      }
      commit(nearest)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read)
    }
    const onScrollEnd = () => {
      target.current = null
      read()
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    scroller.addEventListener('scrollend', onScrollEnd)
    return () => {
      cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', onScroll)
      scroller.removeEventListener('scrollend', onScrollEnd)
    }
  }, [commit, last, position])

  // Scrolls only the tab row; scrollIntoView could interrupt the page track's own smooth scroll.
  useEffect(() => {
    const tab = panel.current?.querySelector<HTMLElement>(`[data-viewer-tab="${index}"]`)
    const rail = tab?.closest<HTMLElement>('.overflow-x-auto')
    if (!tab || !rail) return
    const tabBox = tab.getBoundingClientRect()
    const railBox = rail.getBoundingClientRect()
    const delta = tabBox.left + tabBox.width / 2 - (railBox.left + railBox.width / 2)
    rail.scrollBy({ left: delta, behavior: reduce ? 'auto' : 'smooth' })
  }, [index, reduce])

  const close = () => onClose(sections[indexRef.current]?.id ?? initialId)

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      event.preventDefault()
      const forward = event.key === 'ArrowRight' ? 1 : -1
      goTo(indexRef.current + forward * (track.current ? flow(track.current) : 1))
      return
    }
    if (event.key === 'Tab') trapFocus(event, panel.current)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !track.current) return
    drag.current = { id: event.pointerId, x: event.clientX, left: track.current.scrollLeft, moved: false }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current
    const scroller = track.current
    if (!state || !scroller || state.id !== event.pointerId) return
    const dx = event.clientX - state.x
    if (!state.moved) {
      if (Math.abs(dx) < DRAG_SLOP) return
      state.moved = true
      target.current = null
      scroller.setPointerCapture(event.pointerId)
      scroller.style.scrollSnapType = 'none'
      setDragging(true)
    }
    scroller.scrollLeft = state.left - dx
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current
    const scroller = track.current
    drag.current = null
    if (!state?.moved || !scroller) return
    suppressClick.current = true
    setDragging(false)
    if (scroller.hasPointerCapture(event.pointerId)) scroller.releasePointerCapture(event.pointerId)
    const dx = event.clientX - state.x
    const from = Math.round(Math.abs(state.left) / (scroller.clientWidth || 1))
    const swiped = Math.abs(dx) > scroller.clientWidth * SWIPE_RATIO
    const step = dx < 0 ? flow(scroller) : -flow(scroller)
    const restoreSnap = () => {
      scroller.style.scrollSnapType = ''
    }
    scroller.addEventListener('scrollend', restoreSnap, { once: true })
    window.setTimeout(restoreSnap, 700)
    goTo(swiped ? from + step : from)
  }

  const panelMotion = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.12 } },
        exit: { opacity: 0, transition: { duration: 0.1 } },
      }
    : {
        initial: { opacity: 0, scale: 0.94, y: 14, borderRadius: 28 },
        animate: { opacity: 1, scale: 1, y: 0, borderRadius: 0, transition: PANEL_SPRING },
        exit: {
          opacity: 0,
          scale: 0.97,
          y: 8,
          borderRadius: 20,
          transition: { duration: 0.16, ease: [0.4, 0, 1, 1] as const },
        },
      }

  const SectionIcon = section.icon
  const prev = sections[index - 1]
  const next = sections[index + 1]

  return (
    <motion.div
      ref={panel}
      {...panelMotion}
      role="dialog"
      aria-modal="true"
      aria-label={t('allTools.viewer.title')}
      onKeyDown={onKeyDown}
      style={{ transformOrigin: 'top right' }}
      className="@container fixed inset-0 z-50 flex flex-col overflow-hidden bg-background text-foreground"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/[0.08] to-transparent"
      />

      <header className="relative flex shrink-0 items-center gap-2.5 px-[var(--density-page-pad)] pt-3 pb-2">
        <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary [&_svg]:size-5">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.span
              key={section.id}
              custom={direction}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -30 * direction }}
              animate={{ opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 500, damping: 26 } }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: 30 * direction, transition: { duration: 0.12 } }}
              className="flex"
            >
              <SectionIcon aria-hidden />
            </motion.span>
          </AnimatePresence>
        </span>

        <div className="relative min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={section.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 22 * direction, filter: 'blur(4px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.28, ease: EASE } }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -22 * direction, filter: 'blur(4px)', transition: { duration: 0.16 } }}
              className="flex min-w-0 flex-col"
            >
              <h2 className="truncate text-[15px] leading-5 font-semibold tracking-tight">{section.name}</h2>
              <p className="truncate text-[11px] leading-4 text-muted-foreground">
                {t('allTools.viewer.count', { count: section.rows.length })}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <span
          className="shrink-0 rounded-full bg-muted px-2 text-[10px] leading-5 font-semibold text-muted-foreground tabular-nums"
          aria-live="polite"
        >
          {t('allTools.viewer.position', { current: index + 1, total: sections.length })}
        </span>
        <button
          ref={closeButton}
          type="button"
          onClick={close}
          aria-label={t('allTools.viewer.close')}
          title={t('allTools.viewer.close')}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground outline-none transition-[color,border-color,rotate] duration-200 hover:rotate-90 hover:border-primary/35 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:rotate-0"
        >
          <Minimize2Icon className="size-4" aria-hidden />
        </button>
      </header>

      <div className="relative shrink-0 px-[var(--density-page-pad)] pb-2">
        <ChipRail role="tablist" label={t('allTools.viewer.tabs')}>
          {sections.map((entry, position) => {
            const Icon = entry.icon
            const active = position === index
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                id={`viewer-tab-${entry.id}`}
                aria-selected={active}
                aria-controls={`viewer-page-${entry.id}`}
                aria-label={entry.name}
                title={entry.name}
                tabIndex={active ? 0 : -1}
                data-viewer-tab={position}
                onClick={() => goTo(position)}
                className={cn(
                  'relative flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-foreground text-background'
                    : 'bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId={reduce ? undefined : 'viewer-tab-pill'}
                    aria-hidden
                    className="absolute -inset-px bg-foreground"
                    style={{ borderRadius: 999 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <Icon className="relative size-3.5" aria-hidden />
                {active && (
                  <motion.span
                    initial={reduce ? false : { opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0, transition: { duration: 0.22, ease: EASE } }}
                    className="relative flex items-center gap-1.5"
                  >
                    {entry.name}
                    <span className="text-[10px] text-background/70 tabular-nums">{entry.rows.length}</span>
                  </motion.span>
                )}
              </button>
            )
          })}
        </ChipRail>
        <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <motion.div
            className="h-full rounded-full bg-primary"
            style={{ width: `${100 / sections.length}%`, x: scrubberX }}
          />
        </div>
      </div>

      <div
        ref={track}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (!suppressClick.current) return
          suppressClick.current = false
          event.preventDefault()
          event.stopPropagation()
        }}
        className={cn(
          'scrollbar-none relative flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain',
          dragging && 'cursor-grabbing select-none',
        )}
      >
        {sections.map((entry, position) => (
          <ViewerPage
            key={entry.id}
            section={entry}
            active={position === index}
            mounted={Math.abs(position - index) <= 1 || visited.has(position)}
            revealed={visited.has(position)}
            showCategory={entry.id === sections[0]?.id}
          />
        ))}
      </div>

      <footer className="relative flex shrink-0 items-center gap-2 border-t bg-background/95 px-[var(--density-page-pad)] py-2 backdrop-blur">
        <PagerButton
          side="prev"
          label={t('allTools.viewer.prev')}
          name={prev?.name}
          onClick={() => goTo(index - 1)}
        />
        <span className="hidden shrink-0 text-[10px] text-muted-foreground @[380px]:inline">
          {t('allTools.viewer.hint')}
        </span>
        <PagerButton
          side="next"
          label={t('allTools.viewer.next')}
          name={next?.name}
          onClick={() => goTo(index + 1)}
        />
      </footer>
    </motion.div>
  )
}

function ViewerPage({
  section,
  active,
  mounted,
  revealed,
  showCategory,
}: {
  section: ViewerSection
  active: boolean
  mounted: boolean
  revealed: boolean
  showCategory: boolean
}) {
  return (
    <section
      id={`viewer-page-${section.id}`}
      role="tabpanel"
      aria-labelledby={`viewer-tab-${section.id}`}
      inert={!active}
      className="scrollbar-styled @container h-full w-full shrink-0 snap-center snap-always overflow-y-auto overscroll-y-contain px-[var(--density-page-pad)] pt-1 pb-4"
    >
      {mounted && (
        <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
          <p className="text-xs leading-5 text-muted-foreground">{section.description}</p>
          <ul className="grid grid-cols-1 gap-1.5 @[560px]:grid-cols-2">
            {section.rows.map((row, order) => (
              <motion.li
                key={row.tool.id}
                className="min-w-0"
                variants={ROW_VARIANTS}
                custom={order}
                initial="hidden"
                animate={revealed ? 'shown' : 'hidden'}
              >
                <ToolRow row={row} showCategory={showCategory} />
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function PagerButton({
  side,
  label,
  name,
  onClick,
}: {
  side: 'prev' | 'next'
  label: string
  name: string | undefined
  onClick: () => void
}) {
  const Chevron = side === 'prev' ? ChevronLeftIcon : ChevronRightIcon
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!name}
      aria-label={name ? `${label}: ${name}` : label}
      className={cn(
        'group flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border bg-card px-2.5 outline-none transition-[color,border-color,background-color,opacity] duration-200 hover:border-primary/35 hover:bg-primary/[0.04] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 motion-reduce:active:scale-100',
        side === 'next' && 'flex-row-reverse text-end',
      )}
    >
      <Chevron
        aria-hidden
        className={cn(
          'size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-primary motion-reduce:transition-none rtl:-scale-x-100',
          side === 'prev' ? 'group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5',
        )}
      />
      <span className="flex min-w-0 flex-col">
        <span className="text-[10px] leading-4 font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        <span className="truncate text-xs leading-4 font-semibold">{name ?? '—'}</span>
      </span>
    </button>
  )
}

/** 1 when pages flow left to right, -1 in right-to-left layouts where scrollLeft runs negative. */
function flow(element: HTMLElement) {
  return getComputedStyle(element).direction === 'rtl' ? -1 : 1
}

function trapFocus(event: ReactKeyboardEvent, container: HTMLElement | null) {
  if (!container) return
  const focusable = [
    ...container.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'),
  ].filter((element) => !element.closest('[inert]') && element.offsetParent !== null)
  const first = focusable[0]
  const finalItem = focusable.at(-1)
  if (!first || !finalItem) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    finalItem.focus()
  } else if (!event.shiftKey && document.activeElement === finalItem) {
    event.preventDefault()
    first.focus()
  }
}
