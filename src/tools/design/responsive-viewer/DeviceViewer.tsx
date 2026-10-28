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
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import {
  AppWindowIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Minimize2Icon,
  RefreshCwIcon,
  SmartphoneIcon,
} from 'lucide-react'

import { ChipRail } from '@/shared/components/ChipRail'
import { cn } from '@/shared/utils/cn'
import { DeviceShell, Viewport } from './DeviceCard'
import { breakpointFor, orientedSize, viewportScale, type Device } from './devices'
import { EASE_OUT, KIND_ICON, frameInsets, hostnameOf, openSizedWindow } from './helpers'
import { IconAction } from './parts'

interface DeviceViewerProps {
  open: boolean
  devices: readonly Device[]
  initialId?: string
  url: string
  rotated: readonly string[]
  frame: boolean
  reloadKey: number
  previewReady: boolean
  embedEnabled: boolean
  onRotate: (id: string) => void
  onClose: () => void
}

const PANEL_SPRING = { type: 'spring', stiffness: 420, damping: 36, mass: 0.9 } as const
const SWIPE_RATIO = 0.18
const DRAG_SLOP = 6
const STAGE_PAD = 16

/** Full-panel pager that shows one device per page, scaled to use the whole extension. */
export function DeviceViewer(props: DeviceViewerProps) {
  const returnFocus = useRef<HTMLElement | null>(null)
  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        returnFocus.current?.focus({ preventScroll: true })
        returnFocus.current = null
      }}
    >
      {props.open && props.devices.length > 0 && (
        <Panel
          key="device-viewer"
          {...props}
          onOpened={(previous) => {
            returnFocus.current = previous
          }}
        />
      )}
    </AnimatePresence>,
    document.body,
  )
}

function Panel({
  devices,
  initialId,
  url,
  rotated,
  frame,
  reloadKey,
  previewReady,
  embedEnabled,
  onRotate,
  onClose,
  onOpened,
}: DeviceViewerProps & { onOpened: (previous: HTMLElement | null) => void }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const last = devices.length - 1
  const startIndex = Math.max(0, devices.findIndex((device) => device.id === initialId))

  const [index, setIndex] = useState(startIndex)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [dragging, setDragging] = useState(false)
  const [localReload, setLocalReload] = useState(0)

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

  const device = devices[index] ?? devices[0]
  const prev = devices[index - 1]
  const next = devices[index + 1]

  const commit = useCallback((to: number) => {
    if (to === indexRef.current) return
    setDirection(to > indexRef.current ? 1 : -1)
    indexRef.current = to
    setIndex(to)
  }, [])

  const goTo = useCallback(
    (to: number) => {
      const scroller = track.current
      if (!scroller) return
      const clamped = Math.min(Math.max(to, 0), last)
      target.current = clamped
      commit(clamped)
      scroller.scrollTo({ left: clamped * scroller.clientWidth * flow(scroller), behavior: reduce ? 'auto' : 'smooth' })
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
    let frameId = 0
    const read = () => {
      frameId = 0
      const offset = Math.abs(scroller.scrollLeft) / (scroller.clientWidth || 1)
      position.set(offset)
      if (target.current !== null) {
        if (Math.abs(offset - target.current) < 0.01) target.current = null
        return
      }
      commit(Math.min(Math.max(Math.round(offset), 0), last))
    }
    const onScroll = () => {
      if (!frameId) frameId = requestAnimationFrame(read)
    }
    const onScrollEnd = () => {
      target.current = null
      read()
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    scroller.addEventListener('scrollend', onScrollEnd)
    return () => {
      cancelAnimationFrame(frameId)
      scroller.removeEventListener('scroll', onScroll)
      scroller.removeEventListener('scrollend', onScrollEnd)
    }
  }, [commit, last, position])

  // Scrolls only the tab row so the page track's own smooth scroll is never interrupted.
  useEffect(() => {
    const tab = panel.current?.querySelector<HTMLElement>(`[data-device-tab="${index}"]`)
    const rail = tab?.closest<HTMLElement>('.overflow-x-auto')
    if (!tab || !rail) return
    const tabBox = tab.getBoundingClientRect()
    const railBox = rail.getBoundingClientRect()
    rail.scrollBy({
      left: tabBox.left + tabBox.width / 2 - (railBox.left + railBox.width / 2),
      behavior: reduce ? 'auto' : 'smooth',
    })
  }, [index, reduce])

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      event.preventDefault()
      const step = event.key === 'ArrowRight' ? 1 : -1
      goTo(indexRef.current + step * (track.current ? flow(track.current) : 1))
    } else if (event.key === 'Tab') trapFocus(event, panel.current)
  }

  // Touch swipes use native scroll snapping; mouse drags are emulated so desktops can swipe too.
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !track.current) return
    // Dragging inside the page would fight the embedded site, so only the stage margin starts a drag.
    if ((event.target as HTMLElement).closest('iframe,[data-no-drag]')) return
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
    const restoreSnap = () => {
      scroller.style.scrollSnapType = ''
    }
    scroller.addEventListener('scrollend', restoreSnap, { once: true })
    window.setTimeout(restoreSnap, 700)
    goTo(swiped ? from + (dx < 0 ? flow(scroller) : -flow(scroller)) : from)
  }

  const panelMotion = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.12 } },
        exit: { opacity: 0, transition: { duration: 0.1 } },
      }
    : {
        initial: { opacity: 0, scale: 0.94, y: 14 },
        animate: { opacity: 1, scale: 1, y: 0, transition: PANEL_SPRING },
        exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] as const } },
      }

  const Icon = KIND_ICON[device.kind]
  const isRotated = rotated.includes(device.id)
  const size = orientedSize(device, isRotated)
  const handheld = device.kind === 'phone' || device.kind === 'tablet'

  return (
    <motion.div
      ref={panel}
      {...panelMotion}
      role="dialog"
      aria-modal="true"
      aria-label={t('rv.full.title')}
      onKeyDown={onKeyDown}
      style={{ transformOrigin: 'top right' }}
      className="@container fixed inset-0 z-50 flex flex-col overflow-hidden bg-background text-foreground"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/[0.08] to-transparent"
      />

      <header className="relative flex shrink-0 items-center gap-2 px-3 pt-3 pb-2">
        <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary [&_svg]:size-5">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={device.kind}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -30 * direction }}
              animate={{ opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 500, damping: 26 } }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: 30 * direction, transition: { duration: 0.12 } }}
              className="flex"
            >
              <Icon aria-hidden />
            </motion.span>
          </AnimatePresence>
        </span>

        <div className="relative min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={device.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 22 * direction, filter: 'blur(4px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.28, ease: EASE_OUT } }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -22 * direction, filter: 'blur(4px)', transition: { duration: 0.16 } }}
              className="flex min-w-0 flex-col"
            >
              <h2 className="truncate text-[15px] leading-5 font-semibold tracking-tight">{device.label}</h2>
              <p className="truncate font-mono text-[11px] leading-4 text-muted-foreground tabular-nums">
                {t('rv.card.size', { width: size.width, height: size.height })} · {breakpointFor(size.width)}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <span
          className="shrink-0 rounded-full bg-muted px-2 text-[10px] leading-5 font-semibold text-muted-foreground tabular-nums"
          aria-live="polite"
        >
          {t('rv.full.position', { current: index + 1, total: devices.length })}
        </span>
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label={t('rv.full.close')}
          title={t('rv.full.close')}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground outline-none transition-[color,border-color,rotate] duration-200 hover:rotate-90 hover:border-primary/35 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:rotate-0"
        >
          <Minimize2Icon className="size-4" aria-hidden />
        </button>
      </header>

      <div className="relative shrink-0 px-3 pb-2">
        <ChipRail role="tablist" label={t('rv.full.tabs')}>
          {devices.map((entry, order) => {
            const TabIcon = KIND_ICON[entry.kind]
            const active = order === index
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                id={`device-tab-${entry.id}`}
                aria-selected={active}
                aria-controls={`device-page-${entry.id}`}
                aria-label={entry.label}
                title={entry.label}
                tabIndex={active ? 0 : -1}
                data-device-tab={order}
                onClick={() => goTo(order)}
                className={cn(
                  'relative flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-foreground text-background'
                    : 'bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId={reduce ? undefined : 'device-tab-pill'}
                    aria-hidden
                    className="absolute -inset-px bg-foreground"
                    style={{ borderRadius: 999 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <TabIcon className="relative size-3.5" aria-hidden />
                {active && (
                  <motion.span
                    initial={reduce ? false : { opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0, transition: { duration: 0.22, ease: EASE_OUT } }}
                    className="relative"
                  >
                    {entry.label}
                  </motion.span>
                )}
              </button>
            )
          })}
        </ChipRail>
        <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <motion.div
            className="h-full rounded-full bg-primary"
            style={{ width: `${100 / devices.length}%`, x: scrubberX }}
          />
        </div>
      </div>

      <div
        ref={track}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
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
        {devices.map((entry, order) => (
          <DevicePage
            key={entry.id}
            device={entry}
            url={url}
            rotated={rotated.includes(entry.id)}
            frame={frame}
            active={order === index}
            mounted={Math.abs(order - index) <= 1}
            reloadKey={`${reloadKey}.${entry.id === device.id ? localReload : 0}`}
            previewReady={previewReady}
            embedEnabled={embedEnabled}
          />
        ))}
      </div>

      <footer className="relative flex shrink-0 items-center gap-2 border-t bg-background/95 px-3 py-2 backdrop-blur">
        <PagerButton side="prev" label={t('rv.full.prev')} name={prev?.label} onClick={() => goTo(index - 1)} />
        <div className="flex shrink-0 items-center" data-no-drag>
          {handheld && (
            <IconAction
              label={t('rv.card.rotate', { orientation: t(isRotated ? 'rv.card.portrait' : 'rv.card.landscape') })}
              aria-pressed={isRotated}
              onClick={() => onRotate(device.id)}
            >
              <motion.span
                className="flex"
                animate={{ rotate: isRotated ? 90 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              >
                <SmartphoneIcon />
              </motion.span>
            </IconAction>
          )}
          <IconAction label={t('rv.card.reload')} onClick={() => setLocalReload((n) => n + 1)}>
            <RefreshCwIcon />
          </IconAction>
          <IconAction label={t('rv.card.window')} onClick={() => openSizedWindow(url, size.width, size.height)}>
            <AppWindowIcon />
          </IconAction>
        </div>
        <PagerButton side="next" label={t('rv.full.next')} name={next?.label} onClick={() => goTo(index + 1)} />
      </footer>
    </motion.div>
  )
}

function DevicePage({
  device,
  url,
  rotated,
  frame,
  active,
  mounted,
  reloadKey,
  previewReady,
  embedEnabled,
}: {
  device: Device
  url: string
  rotated: boolean
  frame: boolean
  active: boolean
  mounted: boolean
  reloadKey: string
  previewReady: boolean
  embedEnabled: boolean
}) {
  const [stage, setStage] = useState<{ width: number; height: number } | null>(null)
  const ref = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) =>
      setStage({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) }),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const { width, height } = orientedSize(device, rotated)
  const insets = frameInsets(device.kind, frame)
  // The shell adds padding around the screen on top of the bezel insets.
  const chromeX = insets.x * 2
  const chromeY = insets.top + insets.bottom
  const scale = stage
    ? viewportScale(
        'fit',
        { width, height },
        { width: stage.width - STAGE_PAD * 2 - chromeX, maxHeight: stage.height - STAGE_PAD * 2 - chromeY },
      )
    : 1

  return (
    <section
      ref={ref}
      id={`device-page-${device.id}`}
      role="tabpanel"
      aria-labelledby={`device-tab-${device.id}`}
      inert={!active}
      className="flex h-full w-full shrink-0 snap-center snap-always items-center justify-center overflow-hidden bg-muted/30 bg-[radial-gradient(circle,color-mix(in_oklab,currentColor_14%,transparent)_1px,transparent_1px)] bg-[length:14px_14px] text-foreground"
    >
      {mounted && stage && (
        <DeviceShell kind={device.kind} frame={frame} hostname={hostnameOf(url)}>
          <div
            className={cn(
              'relative shrink-0 overflow-hidden bg-white',
              frame ? (device.kind === 'phone' ? 'rounded-[22px]' : device.kind === 'tablet' ? 'rounded-xl' : 'rounded-b-md') : 'rounded-md',
            )}
            style={{ width: Math.round(width * scale), height: Math.round(height * scale) }}
          >
            <Viewport
              key={`${url}#${reloadKey}`}
              src={url}
              title={device.label}
              width={width}
              height={height}
              scale={scale}
              previewReady={previewReady}
              embedEnabled={embedEnabled}
            />
          </div>
        </DeviceShell>
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
