import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AppWindowIcon, ExternalLinkIcon, LoaderCircleIcon, RefreshCwIcon, SmartphoneIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { breakpointFor, orientedSize, viewportScale, type Device, type DeviceKind, type ZoomMode } from './devices'
import { EASE_OUT, KIND_ICON, openSizedWindow, useContentWidth } from './helpers'
import { IconAction } from './parts'

const BODY_PAD = 12
const SLOW_LOAD_MS = 8000

/** Bezel thickness around the screen, in panel pixels (not scaled with the page). */
function frameInsets(kind: DeviceKind, frame: boolean) {
  if (!frame) return { x: 0, top: 0, bottom: 0 }
  if (kind === 'phone') return { x: 8, top: 8, bottom: 8 }
  if (kind === 'tablet') return { x: 10, top: 10, bottom: 10 }
  return { x: 0, top: 24, bottom: 0 }
}

interface DeviceCardProps {
  device: Device
  url: string
  rotated: boolean
  zoom: ZoomMode
  /** Grid cards shrink to their column; side-by-side cards are capped at the stage width. */
  fitWidth: boolean
  stageWidth: number | null
  maxHeight: number
  frame: boolean
  reloadKey: number
  index: number
  onRotate: () => void
  onHide: () => void
}

export function DeviceCard({
  device,
  url,
  rotated,
  zoom,
  fitWidth,
  stageWidth,
  maxHeight,
  frame,
  reloadKey,
  index,
  onRotate,
  onHide,
}: DeviceCardProps) {
  const { t } = useTranslation()
  const [bodyRef, bodyWidth] = useContentWidth<HTMLDivElement>()
  const [localReload, setLocalReload] = useState(0)
  const { width, height } = orientedSize(device, rotated)
  const insets = frameInsets(device.kind, frame)
  const handheld = device.kind === 'phone' || device.kind === 'tablet'
  const boxWidth = fitWidth ? bodyWidth : stageWidth == null ? null : stageWidth - BODY_PAD * 2 - 2
  const measuring = boxWidth == null
  const scale = viewportScale(
    zoom,
    { width, height },
    {
      width: boxWidth == null ? null : boxWidth - insets.x * 2,
      maxHeight: maxHeight - insets.top - insets.bottom,
    },
  )
  const screenW = Math.round(width * scale)
  const screenH = Math.round(height * scale)
  const Icon = KIND_ICON[device.kind]
  const breakpoint = breakpointFor(width)
  const orientation = t(rotated ? 'rv.card.portrait' : 'rv.card.landscape')

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.32, ease: EASE_OUT, delay: Math.min(index, 6) * 0.045 } }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16, ease: 'easeIn' } }}
      transition={{ layout: { type: 'spring', stiffness: 420, damping: 36 } }}
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card/80 shadow-xs transition-shadow duration-200 hover:shadow-md',
        !fitWidth && 'shrink-0 snap-start',
      )}
      style={fitWidth ? undefined : { width: Math.max(272, screenW + insets.x * 2 + BODY_PAD * 2 + 2) }}
      aria-label={device.label}
    >
      <header className="flex min-h-11 items-center gap-2 border-b bg-background/60 px-2.5 py-1.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xs font-semibold leading-4" title={device.label}>
            {device.label}
          </h3>
          <p className="flex items-center gap-1 whitespace-nowrap font-mono text-[10px] leading-4 tabular-nums text-muted-foreground">
            <span>{t('rv.card.size', { width, height })}</span>
            <span aria-hidden>·</span>
            <span>{t('rv.card.scale', { percent: Math.round(scale * 100) })}</span>
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground" title={t('rv.card.breakpoint', { name: breakpoint })}>
          {breakpoint}
        </Badge>
        <div className="flex shrink-0 items-center">
          {handheld && (
            <IconAction label={t('rv.card.rotate', { orientation })} aria-pressed={rotated} onClick={onRotate}>
              <motion.span
                className="flex"
                animate={{ rotate: rotated ? 90 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              >
                <SmartphoneIcon />
              </motion.span>
            </IconAction>
          )}
          <IconAction label={t('rv.card.reload')} onClick={() => setLocalReload((n) => n + 1)}>
            <RefreshCwIcon />
          </IconAction>
          <IconAction label={t('rv.card.window')} onClick={() => openSizedWindow(url, width, height)}>
            <AppWindowIcon />
          </IconAction>
          <IconAction label={t('rv.card.hide')} onClick={onHide} className="hover:text-destructive">
            <XIcon />
          </IconAction>
        </div>
      </header>

      <div
        ref={bodyRef}
        className="flex justify-center-safe overflow-auto bg-muted/30 bg-[radial-gradient(circle,color-mix(in_oklab,currentColor_14%,transparent)_1px,transparent_1px)] bg-[length:14px_14px] text-foreground"
        style={{ padding: BODY_PAD }}
      >
        {measuring ? (
          <div className="w-full animate-pulse rounded-lg bg-muted" style={{ height: Math.min(240, maxHeight) }} />
        ) : (
          <DeviceShell kind={device.kind} frame={frame} hostname={hostnameOf(url)}>
            <div
              className={cn(
                'relative shrink-0 overflow-hidden bg-white transition-[width,height] duration-300 ease-out motion-reduce:transition-none',
                frame ? (device.kind === 'phone' ? 'rounded-[22px]' : device.kind === 'tablet' ? 'rounded-xl' : 'rounded-b-md') : 'rounded-md',
              )}
              style={{ width: screenW, height: screenH }}
            >
              <Viewport
                key={`${url}#${reloadKey}.${localReload}`}
                src={url}
                title={device.label}
                width={width}
                height={height}
                scale={scale}
              />
              {frame && device.kind === 'phone' && (
                <span
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute rounded-full bg-neutral-950',
                    rotated ? 'left-1.5 top-1/2 -translate-y-1/2' : 'left-1/2 top-1.5 -translate-x-1/2',
                  )}
                  style={
                    rotated
                      ? { width: Math.max(6, 30 * scale), height: Math.max(28, 110 * scale) }
                      : { width: Math.max(28, 110 * scale), height: Math.max(6, 30 * scale) }
                  }
                />
              )}
            </div>
          </DeviceShell>
        )}
      </div>
    </motion.article>
  )
}

function hostnameOf(url: string) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function DeviceShell({ kind, frame, hostname, children }: { kind: DeviceKind; frame: boolean; hostname: string; children: ReactNode }) {
  if (!frame) return <div className="shrink-0 rounded-md shadow-lg ring-1 ring-border">{children}</div>
  if (kind === 'phone' || kind === 'tablet') {
    return (
      <div
        className={cn(
          'relative shrink-0 bg-neutral-900 shadow-xl ring-1 ring-black/20 dark:bg-neutral-800 dark:ring-white/10',
          kind === 'phone' ? 'rounded-[30px] p-2' : 'rounded-[22px] p-2.5',
        )}
      >
        {children}
      </div>
    )
  }
  return (
    <div className="shrink-0 overflow-hidden rounded-md shadow-xl ring-1 ring-border">
      <div className="flex h-6 items-center gap-1 border-b bg-muted px-2" aria-hidden>
        <span className="size-2 rounded-full bg-red-400/80" />
        <span className="size-2 rounded-full bg-amber-400/80" />
        <span className="size-2 rounded-full bg-emerald-400/80" />
        <span className="mx-auto min-w-0 max-w-[60%] truncate rounded bg-background px-2 text-[9px] leading-4 text-muted-foreground">
          {hostname}
        </span>
      </div>
      {children}
    </div>
  )
}

function Viewport({ src, title, width, height, scale }: { src: string; title: string; width: number; height: number; scale: number }) {
  const { t } = useTranslation()
  const [state, setState] = useState<'loading' | 'slow' | 'loaded'>('loading')

  useEffect(() => {
    const timer = setTimeout(() => setState((s) => (s === 'loading' ? 'slow' : s)), SLOW_LOAD_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <iframe
        title={title}
        src={src}
        className="absolute left-0 top-0 origin-top-left border-0 bg-white"
        style={{ width, height, transform: `scale(${scale})` }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
        onLoad={() => setState('loaded')}
      />
      <AnimatePresence>
        {state !== 'loaded' && (
          <motion.div
            key="loading"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/90 p-3 text-center backdrop-blur-sm"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            role="status"
          >
            <LoaderCircleIcon className="size-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
            <AnimatePresence>
              {state === 'slow' && (
                <motion.div
                  className="flex flex-col items-center gap-2"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: EASE_OUT }}
                >
                  <p className="max-w-56 text-[11px] leading-4 text-muted-foreground">{t('rv.card.slow')}</p>
                  <Button variant="outline" size="xs" asChild>
                    <a href={src} target="_blank" rel="noreferrer">
                      <ExternalLinkIcon />
                      {t('rv.card.openTab')}
                    </a>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
