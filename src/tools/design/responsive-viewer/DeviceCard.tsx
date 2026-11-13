import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AppWindowIcon, ExternalLinkIcon, LoaderCircleIcon, RefreshCwIcon, SmartphoneIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { breakpointFor, isHandheld, orientedSize, viewportScale, type Device, type ZoomMode } from './devices'
import { DeviceFrame, frameInsets } from './frames'
import { mockupFor, mockupOuterSize, orientedMockupInsets } from './mockups'
import { EASE_OUT, KIND_ICON, KIND_TONE, hostnameOf, openSizedWindow, useContentWidth } from './helpers'
import { IconAction } from './parts'

const BODY_PAD = 12
const SLOW_LOAD_MS = 8000

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
  previewReady: boolean
  embedEnabled: boolean
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
  previewReady,
  embedEnabled,
  index,
  onRotate,
  onHide,
}: DeviceCardProps) {
  const { t } = useTranslation()
  const [bodyRef, bodyWidth] = useContentWidth<HTMLDivElement>()
  const [localReload, setLocalReload] = useState(0)
  const { width, height } = orientedSize(device, rotated)
  const insets = frameInsets(device, frame)
  const mockup = frame ? mockupFor(device.id) : null
  const mockupInsets = mockup ? orientedMockupInsets(mockup, rotated) : null
  const outer = mockupInsets ? mockupOuterSize({ width, height }, mockupInsets) : null
  const handheld = isHandheld(device)
  const boxWidth = fitWidth ? bodyWidth : stageWidth == null ? null : stageWidth - BODY_PAD * 2 - 2
  const measuring = boxWidth == null
  const scale = viewportScale(
    zoom,
    outer ?? { width, height },
    outer
      ? { width: boxWidth, maxHeight }
      : {
          width: boxWidth == null ? null : boxWidth - insets.x * 2,
          maxHeight: maxHeight - insets.top - insets.bottom,
        },
  )
  const screenW = Math.round(width * scale)
  const screenH = Math.round(height * scale)
  const frameExtraX = outer ? Math.round(outer.width * scale) - screenW : insets.x * 2
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
      style={fitWidth ? undefined : { width: Math.max(272, screenW + frameExtraX + BODY_PAD * 2 + 2) }}
      aria-label={device.label}
      id={`rv-card-${device.id}`}
    >
      <header className="flex min-h-11 items-center gap-2 border-b bg-background/60 px-2.5 py-1.5">
        <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', KIND_TONE[device.kind])} aria-hidden>
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
          <DeviceFrame device={device} frame={frame} hostname={hostnameOf(url)} rotated={rotated}>
            <div
              className="relative shrink-0 overflow-hidden bg-white transition-[width,height] duration-300 ease-out motion-reduce:transition-none"
              style={{ width: screenW, height: screenH }}
            >
              <Viewport
                key={`${url}#${reloadKey}.${localReload}`}
                src={url}
                title={device.label}
                width={width}
                height={height}
                scale={scale}
                previewReady={previewReady}
                embedEnabled={embedEnabled}
              />
            </div>
          </DeviceFrame>
        )}
      </div>
    </motion.article>
  )
}

export function Viewport({
  src,
  title,
  width,
  height,
  scale,
  previewReady,
  embedEnabled,
  frameId,
}: {
  src: string
  title: string
  width: number
  height: number
  scale: number
  previewReady: boolean
  embedEnabled: boolean
  frameId?: string
}) {
  const { t } = useTranslation()
  const mode = !previewReady ? 'preparing' : !embedEnabled ? 'disabled' : 'live'
  const [loadState, setLoadState] = useState<'loading' | 'slow' | 'loaded' | 'blocked'>('loading')
  const [loadKey, setLoadKey] = useState(src)
  if (loadKey !== src) {
    setLoadKey(src)
    setLoadState('loading')
  }

  useEffect(() => {
    if (mode !== 'live') return
    const timer = setTimeout(() => setLoadState((current) => (current === 'loading' ? 'slow' : current)), SLOW_LOAD_MS)
    return () => clearTimeout(timer)
  }, [mode, src])

  const state = mode === 'live' ? loadState : mode

  const inspectLoad = (iframe: HTMLIFrameElement) => {
    try {
      const href = iframe.contentWindow?.location.href ?? ''
      if (!href || href === 'about:blank') return
      if (href.startsWith('chrome-error:') || href.includes('chromewebdata')) {
        setLoadState('blocked')
        return
      }
    } catch {
      /* cross-origin success */
    }
    setLoadState('loaded')
  }

  return (
    <>
      <iframe
        title={title}
        data-rv-frame={frameId ?? title}
        src={previewReady && embedEnabled ? src : 'about:blank'}
        className="absolute left-0 top-0 origin-top-left border-0 bg-white"
        style={{ width, height, transform: `scale(${scale})` }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={(event) => {
          if (!previewReady || !embedEnabled) return
          inspectLoad(event.currentTarget)
        }}
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
            {state === 'preparing' ? (
              <p className="max-w-56 text-[11px] leading-4 text-muted-foreground">{t('rv.card.preparing')}</p>
            ) : state === 'disabled' ? (
              <p className="max-w-56 text-[11px] leading-4 text-muted-foreground">{t('rv.unblock.body')}</p>
            ) : state === 'blocked' ? (
              <div className="flex flex-col items-center gap-2">
                <p className="max-w-56 text-[11px] leading-4 text-muted-foreground">{t('rv.card.blocked')}</p>
                <div className="flex flex-wrap justify-center gap-1">
                  <Button variant="outline" size="xs" asChild>
                    <a href={src} target="_blank" rel="noreferrer">
                      <ExternalLinkIcon />
                      {t('rv.card.openTab')}
                    </a>
                  </Button>
                  <Button variant="outline" size="xs" onClick={() => openSizedWindow(src, width, height)}>
                    <AppWindowIcon />
                    {t('rv.card.window')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
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
                      <div className="flex flex-wrap justify-center gap-1">
                        <Button variant="outline" size="xs" asChild>
                          <a href={src} target="_blank" rel="noreferrer">
                            <ExternalLinkIcon />
                            {t('rv.card.openTab')}
                          </a>
                        </Button>
                        <Button variant="outline" size="xs" onClick={() => openSizedWindow(src, width, height)}>
                          <AppWindowIcon />
                          {t('rv.card.window')}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
