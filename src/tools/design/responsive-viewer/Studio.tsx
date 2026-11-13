import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import {
  CameraIcon,
  CirclePlusIcon,
  Columns2Icon,
  FolderOpenIcon,
  FullscreenIcon,
  LayoutGridIcon,
  LoaderCircleIcon,
  Maximize2Icon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  RotateCwSquareIcon,
  SearchIcon,
  Settings2Icon,
  SquareIcon,
  StarIcon,
  VideoIcon,
  XIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useRouter } from '@/app/router'
import { getActiveBrowserTab } from '@/chrome/contentScriptClient'
import { BrandLogo } from '@/shared/components/BrandLogo'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Separator } from '@/shared/components/ui/separator'
import { Slider } from '@/shared/components/ui/slider'
import { Switch } from '@/shared/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'
import { DEFAULT_RECORDER_SETTINGS } from '@/core/recorder/settings'
import { useRecorderSession } from '@/features/recorder/useRecorder'
import { requestSiteAccess } from '@/core/permissions/siteAccess'
import { Viewport } from './DeviceCard'
import {
  DEVICES,
  FRAME_COLORS,
  MAX_SIMULTANEOUS_DEVICES,
  activeBreakpoints,
  breakpointFor,
  devicePixelRatio,
  findDevice,
  isFoldable,
  isHandheld,
  normalizeUrl,
  orientedSize,
  rememberDevice,
  type Device,
  type DeviceKind,
  type LayoutMode,
  type SimulatorPreset,
  type ViewerSettings,
} from './devices'
import { CHASSIS } from './chassis'
import { DeviceFrame, DeviceThumb } from './frames'
import { mockupFor, mockupOuterSize, orientedMockupInsets } from './mockups'
import { hostnameOf, KIND_ICON, KIND_TONE, useContentWidth } from './helpers'
import {
  captureElements,
  captureGifBurst,
  downloadCapture,
  pauseStudioRecording,
  resumeStudioRecording,
  startStudioRecording,
  stopStudioRecording,
  supportedRecorderMime,
  type CaptureOptions,
} from './media'
import { IconAction } from './parts'
import { injectSyncIntoStudio, isSyncMessage, readMetricsInTab, scanOverflowInTab, type OverflowHit, type PageMetrics } from './sync'
import { DeviceMenu } from './DevicePicker'
import { studioParamsFromSearch } from './studioUrl'
import { useViewerSettings } from './useViewerSettings'
import { CustomBuilder } from './CustomBuilder'
import { AnnotationLayer, type StudioAnnotation, type StudioAnnotateTool } from './annotations'
import { requestLiveEmulation, stopLiveEmulation, type NetworkProfile } from './emulate'

const CANVAS_BG: Record<string, string> = {
  dark: '#07080a',
  light: '#e8edf4',
  white: '#ffffff',
  black: '#000000',
  gradient: 'radial-gradient(circle at 30% 20%, #1e1b4b, #07080a 58%)',
  transparent: 'repeating-conic-gradient(#2a2a2e 0% 25%, #111114 0% 50%) 50% / 20px 20px',
}

function toggleId(list: readonly string[], id: string) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
}

export default function SimulatorStudio() {
  const { t } = useTranslation()
  const { search, navigate } = useRouter()
  const params = studioParamsFromSearch(search)
  const [settings, setSettings] = useViewerSettings()
  const [draft, setDraft] = useState(params.url ?? '')
  const [url, setUrl] = useState<string | null>(params.url ? normalizeUrl(params.url) : null)
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<DeviceKind | 'all' | 'favorites'>('all')
  const [railOpen, setRailOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [presetOpen, setPresetOpen] = useState(false)
  const [shotOpen, setShotOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [overflow, setOverflow] = useState<OverflowHit[] | { error: string } | null>(null)
  const [metrics, setMetrics] = useState<PageMetrics | { error: string } | null>(null)
  const [annotateTool, setAnnotateTool] = useState<StudioAnnotateTool | null>(null)
  const [annotations, setAnnotations] = useState<StudioAnnotation[]>([])
  const [keyboard, setKeyboard] = useState(false)
  const [brightness, setBrightness] = useState(1)
  const [network, setNetwork] = useState<NetworkProfile>('online')
  const [compareUrl, setCompareUrl] = useState('')
  const [taps, setTaps] = useState<{ id: number; x: number; y: number }[]>([])
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [appliedUnblock, setAppliedUnblock] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [stageRef, stageWidth] = useContentWidth<HTMLDivElement>()
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const emulateTab = useRef<number | null>(null)
  const { session, elapsed } = useRecorderSession()
  const mime = supportedRecorderMime()

  const update = (patch: Partial<ViewerSettings>) => setSettings((prev) => ({ ...prev, ...patch }))
  const allDevices = useMemo(() => [...DEVICES, ...settings.custom], [settings.custom])
  const shown = allDevices.filter((device) => settings.selected.includes(device.id)).slice(0, MAX_SIMULTANEOUS_DEVICES)
  const focused = shown.find((device) => device.id === settings.lastDevice) ?? shown[0] ?? null
  const framesReady = appliedUnblock === settings.unblock

  useEffect(() => {
    let active = true
    void import('./framing').then(({ setFramingAllowed }) =>
      setFramingAllowed(settings.unblock, settings.mobileUa ? 'mobile' : undefined).then((ok) => {
        if (!active) return
        setAppliedUnblock(settings.unblock)
        if (ok) setReloadKey((key) => key + 1)
      }),
    )
    return () => {
      active = false
    }
  }, [settings.unblock, settings.mobileUa])

  useEffect(
    () => () => {
      void import('./framing').then(({ setFramingAllowed }) => setFramingAllowed(false))
      if (emulateTab.current != null) void stopLiveEmulation(emulateTab.current)
    },
    [],
  )

  useEffect(() => {
    if (url) return
    let active = true
    void getActiveBrowserTab()
      .catch(() => undefined)
      .then((tab) => {
        const next = normalizeUrl(params.url ?? tab?.url ?? '')
        if (!active || !next) return
        setDraft(next)
        setUrl(next)
      })
    return () => {
      active = false
    }
  }, [params.url, url])

  useEffect(() => {
    if (!params.device) return
    const device = findDevice(params.device, settings.custom)
    if (!device) return
    setSettings((prev) => ({
      ...rememberDevice(prev, device.id),
      selected: prev.selected.includes(device.id) ? prev.selected : [device.id],
    }))
  }, [params.device, settings.custom, setSettings])

  useEffect(() => {
    const layout = params.layout
    if (layout !== 'grid' && layout !== 'row' && layout !== 'vertical' && layout !== 'freeform' && layout !== 'focus') {
      return
    }
    setSettings((prev) => (prev.studioLayout === layout ? prev : { ...prev, studioLayout: layout }))
  }, [params.layout, setSettings])

  const rotateFocused = () => {
    if (!focused || !isHandheld(focused)) return
    update({ rotated: toggleId(settings.rotated, focused.id) })
  }

  const rotateAll = () => {
    const ids = shown.filter(isHandheld).map((device) => device.id)
    const allOn = ids.length > 0 && ids.every((id) => settings.rotated.includes(id))
    update({ rotated: allOn ? settings.rotated.filter((id) => !ids.includes(id)) : [...new Set([...settings.rotated, ...ids])] })
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (event.key === 'Escape') {
        if (settings.presentation.hideChrome) update({ presentation: { ...settings.presentation, hideChrome: false } })
        else if (annotateTool) setAnnotateTool(null)
        return
      }
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        rotateFocused()
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        setCanvasZoom((z) => Math.min(3, Math.round((z + 0.1) * 10) / 10))
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        setCanvasZoom((z) => Math.max(0.25, Math.round((z - 0.1) * 10) / 10))
      } else if (event.key === '0') {
        event.preventDefault()
        setCanvasZoom(1)
        setPan({ x: 0, y: 0 })
      } else if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        setShotOpen(true)
      } else if (event.key === '?') {
        setHelpOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isSyncMessage(event.data)) return
      if (event.data.type === 'scroll' && !settings.sync.scroll) return
      if (event.data.type === 'click' && !settings.sync.clicks) return
      if (event.data.type === 'navigate' && !settings.sync.nav) return
      for (const frame of document.querySelectorAll<HTMLIFrameElement>('iframe[data-rv-frame]')) {
        if (frame.dataset.rvFrame === event.data.from) continue
        try {
          frame.contentWindow?.postMessage(event.data, '*')
        } catch {
          /* cross-origin */
        }
      }
      if (event.data.type === 'click' && settings.tapMarkers) {
        const id = Date.now()
        setTaps((list) => [...list, { id, x: event.data.x, y: event.data.y }])
        window.setTimeout(() => setTaps((list) => list.filter((tap) => tap.id !== id)), 600)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [settings.sync.clicks, settings.sync.nav, settings.sync.scroll, settings.tapMarkers])

  const loadUrl = (value: string) => {
    const next = normalizeUrl(value)
    if (!next) {
      setError(t('rv.url.invalid'))
      return
    }
    setError(null)
    setDraft(next)
    if (next === url) setReloadKey((key) => key + 1)
    else setUrl(next)
  }

  const selectDevice = (id: string, additive = false) => {
    const device = findDevice(id, settings.custom)
    if (!device) return
    setSettings((prev) => {
      const remembered = rememberDevice(prev, id)
      if (!additive) return { ...remembered, selected: [id] }
      if (prev.selected.includes(id)) return remembered
      if (prev.selected.length >= MAX_SIMULTANEOUS_DEVICES) {
        return { ...remembered, selected: [...prev.selected.slice(1), id] }
      }
      return { ...remembered, selected: [...prev.selected, id], studioLayout: prev.selected.length ? 'row' : 'focus' }
    })
  }

  const closeStudio = () => {
    void (async () => {
      const tab = await chrome.tabs?.getCurrent?.()
      if (tab?.id != null) {
        await chrome.tabs.remove(tab.id)
        return
      }
      navigate('/tools/design/responsive-viewer')
    })()
  }

  const filtered = allDevices.filter((device) => {
    if (kindFilter === 'favorites') return settings.favorites.includes(device.id)
    if (kindFilter !== 'all' && device.kind !== kindFilter) return false
    const hay = `${device.label} ${device.manufacturer ?? ''} ${device.width}x${device.height}`.toLowerCase()
    return !query.trim() || hay.includes(query.trim().toLowerCase())
  })

  const presentation = settings.presentation.hideChrome
  const light = settings.studioTheme === 'light'
  const canvasBg =
    settings.presentation.customBackground || CANVAS_BG[settings.presentation.background] || CANVAS_BG.dark

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn(
          'rv-studio flex h-full min-h-0 flex-col overflow-hidden',
          light ? 'bg-zinc-100 text-zinc-900' : 'bg-[#07080a] text-zinc-100',
        )}
        style={{ colorScheme: light ? 'light' : 'dark' }}
      >
        {!presentation && (
          <header
            className={cn(
              'flex h-12 shrink-0 items-center gap-2 border-b px-2.5 backdrop-blur-md',
              light ? 'border-zinc-200 bg-white/90' : 'border-white/10 bg-black/40',
            )}
          >
            <BrandLogo size={22} />
            <span className="hidden text-xs font-semibold tracking-tight @[720px]:inline">{t('rv.studio.brand')}</span>
            <form
              className="flex min-w-0 flex-1 items-center gap-1.5"
              onSubmit={(event) => {
                event.preventDefault()
                loadUrl(draft)
              }}
            >
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t('rv.url.placeholder')}
                className={cn('h-8 font-mono text-xs', light ? 'border-zinc-200 bg-white' : 'border-white/10 bg-white/5')}
                spellCheck={false}
              />
              <IconAction label={t('rv.url.load')} onClick={() => loadUrl(draft)}>
                <PlayIcon />
              </IconAction>
            </form>
            <IconAction label={t('rv.url.reloadAll')} onClick={() => setReloadKey((key) => key + 1)} disabled={!url}>
              <RefreshCwIcon />
            </IconAction>
            <DeviceMenu
              devices={allDevices}
              selected={settings.selected}
              open={menuOpen}
              onOpenChange={setMenuOpen}
              onToggle={(id) => {
                setSettings((prev) => {
                  const selected = prev.selected.includes(id)
                    ? prev.selected.filter((item) => item !== id)
                    : [...prev.selected, id].slice(0, MAX_SIMULTANEOUS_DEVICES)
                  const next = selected.length > 0 ? selected : [id]
                  return rememberDevice({ ...prev, selected: next }, id)
                })
              }}
              onSelect={(selected) =>
                setSettings((prev) =>
                  rememberDevice({ ...prev, selected: selected.slice(0, MAX_SIMULTANEOUS_DEVICES) }, selected[0] ?? prev.lastDevice),
                )
              }
              onAddCustom={(device) =>
                setSettings((prev) => ({
                  ...prev,
                  custom: [...prev.custom, device],
                  selected: [...prev.selected, device.id].slice(0, MAX_SIMULTANEOUS_DEVICES),
                }))
              }
              onRemoveCustom={(id) =>
                setSettings((prev) => ({
                  ...prev,
                  custom: prev.custom.filter((item) => item.id !== id),
                  selected: prev.selected.filter((item) => item !== id),
                  rotated: prev.rotated.filter((item) => item !== id),
                }))
              }
            />
            <LayoutPicker value={settings.studioLayout} onChange={(studioLayout) => update({ studioLayout })} />
            <IconAction label={t('rv.shot.open')} onClick={() => setShotOpen(true)} disabled={!url}>
              <CameraIcon />
            </IconAction>
            <RecordButton session={session} elapsed={elapsed} mime={mime.ext} />
            <IconAction
              label={t('rv.full.open')}
              onClick={() => void document.documentElement.requestFullscreen?.()}
            >
              <FullscreenIcon />
            </IconAction>
            <IconAction label={t('rv.studio.close')} onClick={closeStudio}>
              <XIcon />
            </IconAction>
          </header>
        )}

        {error && <p className="bg-destructive/20 px-3 py-1 text-[11px] text-red-200">{error}</p>}

        <div className="flex min-h-0 flex-1">
          {!presentation && railOpen && (
            <DeviceRail
              devices={filtered}
              total={allDevices.length}
              query={query}
              onQuery={setQuery}
              filter={kindFilter}
              onFilter={setKindFilter}
              selected={settings.selected}
              favorites={settings.favorites}
              recents={settings.recents}
              onSelect={(id) => selectDevice(id, false)}
              onToggleFavorite={(id) => update({ favorites: toggleId(settings.favorites, id) })}
              onCustom={() => setBuilderOpen(true)}
            />
          )}

          <div className="relative flex min-w-0 flex-1 flex-col">
            <div
              ref={stageRef}
              className="relative min-h-0 flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
              style={{ background: canvasBg }}
              onWheel={(event) => {
                if (!event.ctrlKey && !event.metaKey) return
                event.preventDefault()
                setCanvasZoom((z) => Math.min(3, Math.max(0.25, z + (event.deltaY > 0 ? -0.08 : 0.08))))
              }}
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest('[data-rv-device],[data-no-drag]')) return
                drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
                event.currentTarget.setPointerCapture(event.pointerId)
              }}
              onPointerMove={(event) => {
                if (!drag.current) return
                setPan({
                  x: drag.current.panX + event.clientX - drag.current.x,
                  y: drag.current.panY + event.clientY - drag.current.y,
                })
              }}
              onPointerUp={() => {
                drag.current = null
              }}
            >
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                style={{ x: pan.x, y: pan.y, scale: canvasZoom, transformOrigin: 'center center' }}
              >
                {(settings.presentation.heading || settings.presentation.description) && (
                  <div className="pointer-events-none absolute left-6 top-6 z-10 max-w-md text-left" data-no-drag>
                    {settings.presentation.heading && (
                      <h2 className="text-xl font-semibold tracking-tight">{settings.presentation.heading}</h2>
                    )}
                    {settings.presentation.description && (
                      <p className="mt-1 text-sm text-zinc-400">{settings.presentation.description}</p>
                    )}
                  </div>
                )}
                <StudioStage
                  devices={shown}
                  url={url}
                  compareUrl={normalizeUrl(compareUrl)}
                  settings={settings}
                  reloadKey={reloadKey}
                  previewReady={framesReady}
                  embedEnabled={settings.unblock}
                  keyboard={keyboard}
                  brightness={brightness}
                  stageWidth={stageWidth}
                  focusedId={focused?.id}
                  onFocus={(id) => update({ lastDevice: id })}
                  onRotate={(id) => update({ rotated: toggleId(settings.rotated, id) })}
                  onFold={(id) => update({ folded: toggleId(settings.folded, id) })}
                  onMove={(id, x, y) => update({ positions: { ...settings.positions, [id]: { x, y } } })}
                />
              </motion.div>
              <AnnotationLayer tool={annotateTool} annotations={annotations} onChange={setAnnotations} />
              {taps.map((tap) => (
                <span
                  key={tap.id}
                  className="pointer-events-none absolute z-20 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-300 bg-sky-400/30"
                  style={{ left: `${tap.x * 100}%`, top: `${tap.y * 100}%` }}
                />
              ))}
              {!url && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="max-w-sm text-center text-sm text-zinc-400">{t('rv.empty.body')}</p>
                </div>
              )}
            </div>

            {!presentation && focused && (
              <div className="pointer-events-none absolute top-1/2 right-3 z-10 flex -translate-y-1/2 flex-col gap-2" data-no-drag>
                <RoundAction label={t('rv.card.rotate', { orientation: t(settings.rotated.includes(focused.id) ? 'rv.card.portrait' : 'rv.card.landscape') })} onClick={rotateFocused}>
                  <RotateCwSquareIcon className="size-4" />
                </RoundAction>
                <RoundAction label={t('rv.shot.open')} onClick={() => setShotOpen(true)}>
                  <CameraIcon className="size-4" />
                </RoundAction>
                <RoundAction
                  label={session ? t('rv.record.stop') : t('rv.record.start')}
                  onClick={() => void (session ? stopStudioRecording() : startStudioRecording({ ...DEFAULT_RECORDER_SETTINGS, countdown: false, mic: false }))}
                >
                  <VideoIcon className="size-4" />
                </RoundAction>
                <RoundAction label={t('rv.studio.settings')} onClick={() => setInspectorOpen((open) => !open)}>
                  <Settings2Icon className="size-4" />
                </RoundAction>
              </div>
            )}

            {!presentation && (
              <footer
                className={cn(
                  'flex h-10 shrink-0 items-center gap-2 border-t px-2.5 text-[11px] backdrop-blur-md',
                  light ? 'border-zinc-200 bg-white/90' : 'border-white/10 bg-black/40',
                )}
              >
                <Button variant="ghost" size="icon-xs" onClick={() => setRailOpen((open) => !open)} aria-label={t('rv.studio.toggleRail')}>
                  <Columns2Icon />
                </Button>
                <IconAction label={t('rv.view.zoomOut')} onClick={() => setCanvasZoom((z) => Math.max(0.25, z - 0.1))}>
                  <MinusIcon />
                </IconAction>
                <span className="w-10 text-center font-mono tabular-nums">{Math.round(canvasZoom * 100)}%</span>
                <IconAction label={t('rv.view.zoomIn')} onClick={() => setCanvasZoom((z) => Math.min(3, z + 0.1))}>
                  <PlusIcon />
                </IconAction>
                <IconAction
                  label={t('rv.view.fit')}
                  onClick={() => {
                    setCanvasZoom(1)
                    setPan({ x: 0, y: 0 })
                  }}
                >
                  <Maximize2Icon />
                </IconAction>
                {focused && (
                  <Badge variant="outline" className="font-mono text-[10px] text-zinc-300">
                    {breakpointFor(orientedSize(focused, settings.rotated.includes(focused.id), settings.folded.includes(focused.id)).width, activeBreakpoints(settings))}
                  </Badge>
                )}
                <label className="ml-auto flex items-center gap-1.5 text-zinc-400">
                  <Switch
                    checked={settings.sync.nav}
                    onCheckedChange={(nav) => update({ sync: { ...settings.sync, nav } })}
                  />
                  {t('rv.sync.nav')}
                </label>
                <label className="flex items-center gap-1.5 text-zinc-400">
                  <Switch
                    checked={settings.sync.scroll}
                    onCheckedChange={(scroll) => update({ sync: { ...settings.sync, scroll } })}
                  />
                  {t('rv.sync.scroll')}
                </label>
                {session && (
                  <span className="flex items-center gap-1 font-mono text-red-400">
                    <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
                    {formatElapsed(elapsed)}
                  </span>
                )}
              </footer>
            )}
          </div>

          {!presentation && inspectorOpen && focused && (
            <Inspector
              device={focused}
              settings={settings}
              compareUrl={compareUrl}
              keyboard={keyboard}
              brightness={brightness}
              network={network}
              overflow={overflow}
              metrics={metrics}
              annotateTool={annotateTool}
              onAnnotate={setAnnotateTool}
              onCompareUrl={setCompareUrl}
              onKeyboard={setKeyboard}
              onBrightness={setBrightness}
              onNetwork={setNetwork}
              onChange={update}
              onRotateAll={rotateAll}
              onPreset={() => setPresetOpen(true)}
              onOverflow={async () => {
                const tab = await chrome.tabs.getCurrent()
                if (tab?.id == null) return
                setOverflow(await scanOverflowInTab(tab.id))
                setMetrics(await readMetricsInTab(tab.id))
              }}
              onSyncAccess={async () => {
                if (!url) return
                const granted = await requestSiteAccess(url)
                const tab = await chrome.tabs.getCurrent()
                if (granted && tab?.id != null) await injectSyncIntoStudio(tab.id)
              }}
              onEmulate={async () => {
                const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
                const tab = tabs.find((item) => item.id != null && !item.url?.startsWith('chrome-extension:')) ?? tabs[0]
                if (tab?.id == null || !focused) return
                const result = await requestLiveEmulation(tab.id, focused, settings.rotated.includes(focused.id), network)
                if (result.ok) emulateTab.current = tab.id
                else setError(result.error ?? t('rv.emulate.hint'))
              }}
              onStopEmulate={async () => {
                const tabId = emulateTab.current
                const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
                const tab = tabs.find((item) => item.id != null)
                const target = tabId ?? tab?.id
                if (target != null) {
                  await stopLiveEmulation(target)
                  emulateTab.current = null
                }
              }}
            />
          )}
        </div>

        <ScreenshotDialog
          open={shotOpen}
          onOpenChange={setShotOpen}
          busy={busy}
          onCapture={async (options) => {
            const nodes = [...document.querySelectorAll<HTMLElement>(options.target === 'canvas' ? '[data-rv-stage]' : '[data-rv-device]')]
            const selected = options.target === 'selected' ? nodes.filter((node) => node.dataset.rvDevice === focused?.id) : nodes
            setBusy('capture')
            try {
              const blob = await captureElements(selected, options)
              await downloadCapture(blob, `one-panel-${focused?.id ?? 'studio'}.${options.format === 'jpeg' ? 'jpg' : options.format}`)
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : t('rv.shot.failed'))
            } finally {
              setBusy(null)
              setShotOpen(false)
            }
          }}
          onGif={async () => {
            const node = document.querySelector<HTMLElement>('[data-rv-stage]')
            if (!node) return
            setBusy('gif')
            try {
              const blob = await captureGifBurst(node, 16, 140)
              await downloadCapture(blob, 'one-panel-simulator.gif')
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : t('rv.shot.failed'))
            } finally {
              setBusy(null)
            }
          }}
        />

        <CustomBuilder
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          onSave={(device) => {
            update({
              custom: [...settings.custom.filter((item) => item.id !== device.id), device],
              selected: settings.selected.includes(device.id) ? settings.selected : [...settings.selected, device.id].slice(-MAX_SIMULTANEOUS_DEVICES),
            })
          }}
        />

        <PresetDialog
          open={presetOpen}
          onOpenChange={setPresetOpen}
          presets={settings.presets}
          onSave={(name) => {
            const preset: SimulatorPreset = {
              id: `preset-${crypto.randomUUID().slice(0, 8)}`,
              name,
              selected: settings.selected,
              rotated: settings.rotated,
              folded: settings.folded,
              zoom: settings.zoom,
              layout: settings.studioLayout,
              frame: settings.frame,
              frameColor: settings.frameColor,
              positions: settings.positions,
              sync: settings.sync,
              presentation: settings.presentation,
            }
            update({ presets: [...settings.presets, preset] })
          }}
          onApply={(preset) =>
            update({
              selected: preset.selected,
              rotated: preset.rotated,
              folded: preset.folded,
              zoom: preset.zoom,
              studioLayout: preset.layout,
              frame: preset.frame,
              frameColor: preset.frameColor,
              positions: preset.positions,
              sync: preset.sync,
              presentation: preset.presentation,
            })
          }
          onDelete={(id) => update({ presets: settings.presets.filter((preset) => preset.id !== id) })}
        />

        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('rv.help.title')}</DialogTitle>
              <DialogDescription>{t('rv.help.body')}</DialogDescription>
            </DialogHeader>
            <ul className="space-y-1 font-mono text-xs text-muted-foreground">
              <li>R — {t('rv.card.rotate', { orientation: '' })}</li>
              <li>+ / − — {t('rv.view.zoom')}</li>
              <li>0 — {t('rv.view.fit')}</li>
              <li>Esc — {t('rv.present.exit')}</li>
            </ul>
          </DialogContent>
        </Dialog>
        {busy && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/20">
            <LoaderCircleIcon className="size-6 animate-spin" />
          </div>
        )}
      </div>
    </MotionConfig>
  )
}

function StudioStage({
  devices,
  url,
  compareUrl,
  settings,
  reloadKey,
  previewReady,
  embedEnabled,
  keyboard,
  brightness,
  stageWidth,
  focusedId,
  onFocus,
  onRotate,
  onFold,
  onMove,
}: {
  devices: Device[]
  url: string | null
  compareUrl: string | null
  settings: ViewerSettings
  reloadKey: number
  previewReady: boolean
  embedEnabled: boolean
  keyboard: boolean
  brightness: number
  stageWidth: number | null
  focusedId?: string
  onFocus: (id: string) => void
  onRotate: (id: string) => void
  onFold: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
}) {
  const layout = settings.studioLayout
  const gap = 28
  return (
    <div
      data-rv-stage
      className={cn(
        'relative flex items-end justify-center',
        layout === 'vertical' ? 'flex-col items-center' : layout === 'grid' ? 'flex-wrap content-center' : 'flex-row',
        settings.performanceMode && '[&_*]:shadow-none',
      )}
      style={{ gap }}
    >
      <AnimatePresence>
        {devices.map((device, index) => {
          const rotated = settings.rotated.includes(device.id)
          const folded = settings.folded.includes(device.id)
          const size = orientedSize(device, rotated, folded)
          const src = compareUrl && index % 2 === 1 ? compareUrl : url
          const mockup = settings.frame ? mockupFor(device.id) : null
          const fitSize = mockup ? mockupOuterSize(size, orientedMockupInsets(mockup, rotated)) : size
          const fit = Math.min(1, 720 / Math.max(fitSize.height, 1), ((stageWidth ?? 900) - 80) / Math.max(fitSize.width * devices.length, 1))
          const scale = settings.studioZoom === 'fit' ? Math.max(0.2, fit) : Math.min(2, Number(settings.studioZoom) || 1)
          const pos = settings.positions[device.id]
          return (
            <StudioDevice
              key={device.id}
              device={device}
              url={src}
              rotated={rotated}
              folded={folded}
              scale={scale}
              settings={settings}
              reloadKey={reloadKey}
              previewReady={previewReady}
              embedEnabled={embedEnabled}
              keyboard={keyboard}
              brightness={brightness}
              focused={focusedId === device.id}
              freeform={layout === 'freeform'}
              x={pos?.x ?? 0}
              y={pos?.y ?? 0}
              onFocus={() => onFocus(device.id)}
              onRotate={() => onRotate(device.id)}
              onFold={() => onFold(device.id)}
              onMove={(x, y) => onMove(device.id, x, y)}
            />
          )
        })}
      </AnimatePresence>
    </div>
  )
}

function StudioDevice({
  device,
  url,
  rotated,
  folded,
  scale,
  settings,
  reloadKey,
  previewReady,
  embedEnabled,
  keyboard,
  brightness,
  focused,
  freeform,
  x,
  y,
  onFocus,
  onRotate,
  onFold,
  onMove,
}: {
  device: Device
  url: string | null
  rotated: boolean
  folded: boolean
  scale: number
  settings: ViewerSettings
  reloadKey: number
  previewReady: boolean
  embedEnabled: boolean
  keyboard: boolean
  brightness: number
  focused: boolean
  freeform: boolean
  x: number
  y: number
  onFocus: () => void
  onRotate: () => void
  onFold: () => void
  onMove: (x: number, y: number) => void
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const size = orientedSize(device, rotated, folded)
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!freeform) return
    drag.current = { x: event.clientX, y: event.clientY, left: x, top: y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const snap = 16
    const nextX = Math.round((drag.current.left + event.clientX - drag.current.x) / snap) * snap
    const nextY = Math.round((drag.current.top + event.clientY - drag.current.y) / snap) * snap
    onMove(nextX, nextY)
  }

  return (
    <motion.div
      layout={!freeform}
      data-rv-device={device.id}
      onClick={onFocus}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => {
        drag.current = null
      }}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22 }}
      className={cn('relative flex flex-col items-center gap-2', focused && 'z-10')}
      style={freeform ? { position: 'relative', left: x, top: y } : undefined}
    >
      {settings.showLabels && (
        <div className="flex flex-col items-center text-center">
          <p className="text-xs font-semibold">{device.label}</p>
          <p className="font-mono text-[10px] text-zinc-400 tabular-nums">
            {size.width} × {size.height} · DPR {devicePixelRatio(device)} · {rotated ? t('rv.card.landscape') : t('rv.card.portrait')}
            {device.specStatus === 'approximate' ? ` · ${t('rv.device.approximate')}` : ''}
          </p>
        </div>
      )}
      <motion.div
        animate={{ rotateY: reduce ? 0 : rotated ? 8 : 0 }}
        transition={{ duration: reduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
        className={cn(focused && 'ring-2 ring-indigo-400/80 ring-offset-2 ring-offset-[#07080a] rounded-[2rem]')}
      >
        <DeviceFrame
          device={device}
          frame={settings.frame}
          hostname={hostnameOf(url ?? '')}
          rotated={rotated}
          color={settings.frameColor === 'auto' ? undefined : settings.frameColor}
          showStatusBar={settings.showStatusBar}
          showNavBar={settings.showNavBar}
          showSafeArea={settings.showSafeArea}
          keyboard={keyboard}
          brightness={brightness}
          performance={settings.performanceMode}
          folded={folded}
        >
          <div className="relative overflow-hidden bg-white" style={{ width: Math.round(size.width * scale), height: Math.round(size.height * scale) }}>
            {url ? (
              <Viewport
                key={`${url}#${reloadKey}#${device.id}`}
                src={url}
                title={device.label}
                width={size.width}
                height={size.height}
                scale={scale}
                previewReady={previewReady}
                embedEnabled={embedEnabled}
                frameId={device.id}
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-zinc-200 text-[11px] text-zinc-500">
                {t('rv.empty.title')}
              </div>
            )}
          </div>
        </DeviceFrame>
      </motion.div>
      <div className="flex items-center gap-1">
        {isHandheld(device) && (
          <Button size="xs" variant="outline" onClick={onRotate} className="h-6 text-[10px]">
            {t('rv.card.rotate', { orientation: rotated ? t('rv.card.portrait') : t('rv.card.landscape') })}
          </Button>
        )}
        {isFoldable(device) && (
          <Button size="xs" variant="outline" onClick={onFold} className="h-6 text-[10px]">
            {folded ? t('rv.device.unfold') : t('rv.device.fold')}
          </Button>
        )}
      </div>
    </motion.div>
  )
}

function DeviceRail({
  devices,
  total,
  query,
  onQuery,
  filter,
  onFilter,
  selected,
  favorites,
  recents,
  onSelect,
  onToggleFavorite,
  onCustom,
}: {
  devices: Device[]
  total: number
  query: string
  onQuery: (value: string) => void
  filter: DeviceKind | 'all' | 'favorites'
  onFilter: (value: DeviceKind | 'all' | 'favorites') => void
  selected: readonly string[]
  favorites: readonly string[]
  recents: readonly string[]
  onSelect: (id: string) => void
  onToggleFavorite: (id: string) => void
  onCustom: () => void
}) {
  const { t } = useTranslation()
  const filters: { id: DeviceKind | 'all' | 'favorites'; label: string }[] = [
    { id: 'all', label: t('rv.kind.all') },
    { id: 'favorites', label: t('rv.devices.favorites') },
    { id: 'phone', label: t('rv.kind.phone') },
    { id: 'tablet', label: t('rv.kind.tablet') },
    { id: 'laptop', label: t('rv.kind.laptop') },
    { id: 'desktop', label: t('rv.kind.desktop') },
    { id: 'watch', label: t('rv.kind.watch') },
    { id: 'special', label: t('rv.kind.special') },
  ]
  return (
    <aside className="flex w-[min(18rem,32vw)] shrink-0 flex-col border-r border-white/10 bg-black/30">
      <div className="flex items-center gap-1.5 border-b border-white/10 p-2">
        <SearchIcon className="size-3.5 text-zinc-500" />
        <Input value={query} onChange={(event) => onQuery(event.target.value)} placeholder={t('rv.devices.search')} className="h-7 border-0 bg-transparent px-0 text-xs" />
        <Badge variant="outline" className="font-mono text-[10px]">{total}</Badge>
      </div>
      <div className="flex flex-wrap gap-1 p-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onFilter(item.id)}
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              filter === item.id ? 'bg-indigo-500 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {recents.length > 0 && filter === 'all' && (
        <p className="px-3 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">{t('rv.devices.recents')}</p>
      )}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-0.5 p-1.5">
          {devices.map((device) => {
            const Icon = KIND_ICON[device.kind]
            const on = selected.includes(device.id)
            return (
              <div key={device.id} className={cn('flex items-center rounded-lg px-1', on && 'bg-indigo-500/15')}>
                <button type="button" onClick={() => onSelect(device.id)} className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1.5 text-left">
                  <DeviceThumb device={device} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{device.label}</span>
                    <span className="block font-mono text-[10px] text-zinc-500">{device.width}×{device.height}</span>
                  </span>
                  <Icon className={cn('size-3.5', KIND_TONE[device.kind].split(' ').at(-1))} />
                </button>
                <button type="button" className="p-1 text-zinc-500 hover:text-amber-300" onClick={() => onToggleFavorite(device.id)} aria-label={t('rv.devices.favorite')}>
                  <StarIcon className={cn('size-3.5', favorites.includes(device.id) && 'fill-amber-400 text-amber-400')} />
                </button>
              </div>
            )
          })}
        </div>
      </ScrollArea>
      <div className="border-t border-white/10 p-2">
        <Button size="sm" variant="outline" className="w-full" onClick={onCustom}>
          <CirclePlusIcon />
          {t('rv.custom.add')}
        </Button>
      </div>
    </aside>
  )
}

function Inspector({
  device,
  settings,
  compareUrl,
  keyboard,
  brightness,
  network,
  overflow,
  metrics,
  annotateTool,
  onAnnotate,
  onCompareUrl,
  onKeyboard,
  onBrightness,
  onNetwork,
  onChange,
  onRotateAll,
  onPreset,
  onOverflow,
  onSyncAccess,
  onEmulate,
  onStopEmulate,
}: {
  device: Device
  settings: ViewerSettings
  compareUrl: string
  keyboard: boolean
  brightness: number
  network: NetworkProfile
  overflow: OverflowHit[] | { error: string } | null
  metrics: PageMetrics | { error: string } | null
  annotateTool: StudioAnnotateTool | null
  onAnnotate: (tool: StudioAnnotateTool | null) => void
  onCompareUrl: (value: string) => void
  onKeyboard: (value: boolean) => void
  onBrightness: (value: number) => void
  onNetwork: (value: NetworkProfile) => void
  onChange: (patch: Partial<ViewerSettings>) => void
  onRotateAll: () => void
  onPreset: () => void
  onOverflow: () => void
  onSyncAccess: () => void
  onEmulate: () => void
  onStopEmulate: () => void
}) {
  const { t } = useTranslation()
  const size = orientedSize(device, settings.rotated.includes(device.id), settings.folded.includes(device.id))
  return (
    <aside className="flex w-[min(20rem,36vw)] shrink-0 flex-col gap-3 overflow-y-auto border-l border-white/10 bg-black/35 p-3 text-xs">
      <div>
        <p className="text-sm font-semibold">{device.label}</p>
        <p className="text-zinc-400">{device.manufacturer} · {device.specStatus === 'approximate' ? t('rv.device.approximate') : t('rv.device.verified')}</p>
        <p className="mt-1 font-mono text-[11px] tabular-nums">{size.width} × {size.height} · DPR {devicePixelRatio(device)}</p>
      </div>
      <Separator className="bg-white/10" />
      <Row label={t('rv.view.frame')}>
        <Switch checked={settings.frame} onCheckedChange={(frame) => onChange({ frame })} />
      </Row>
      <Row label={t('rv.studio.lightCanvas')}>
        <Switch
          checked={settings.studioTheme === 'light'}
          onCheckedChange={(on) =>
            onChange({
              studioTheme: on ? 'light' : 'dark',
              presentation: { ...settings.presentation, background: on ? 'white' : 'dark' },
            })
          }
        />
      </Row>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => onChange({ frameColor: 'auto' })}
          className={cn('size-6 rounded-full ring-2 ring-offset-1 ring-offset-[#07080a]', settings.frameColor === 'auto' ? 'ring-white' : 'ring-transparent')}
          style={{ background: 'conic-gradient(from 180deg, #111114, #c7ccd4, #322e38, #e5e7eb, #374151)' }}
          aria-label={t('rv.view.frameAuto')}
        />
        {FRAME_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange({ frameColor: color })}
            className={cn('size-6 rounded-full ring-2 ring-offset-1 ring-offset-[#07080a]', settings.frameColor === color ? 'ring-white' : 'ring-transparent')}
            style={{ background: CHASSIS[color].swatch }}
            aria-label={color}
          />
        ))}
      </div>
      <Row label={t('rv.view.statusBar')}>
        <Switch checked={settings.showStatusBar} onCheckedChange={(showStatusBar) => onChange({ showStatusBar })} />
      </Row>
      <Row label={t('rv.view.navBar')}>
        <Switch checked={settings.showNavBar} onCheckedChange={(showNavBar) => onChange({ showNavBar })} />
      </Row>
      <Row label={t('rv.view.labels')}>
        <Switch checked={settings.showLabels} onCheckedChange={(showLabels) => onChange({ showLabels })} />
      </Row>
      <Row label={t('rv.view.safeArea')}>
        <Switch checked={settings.showSafeArea} onCheckedChange={(showSafeArea) => onChange({ showSafeArea })} />
      </Row>
      <Row label={t('rv.view.performance')}>
        <Switch checked={settings.performanceMode} onCheckedChange={(performanceMode) => onChange({ performanceMode })} />
      </Row>
      <Row label={t('rv.unblock.title')}>
        <Switch checked={settings.unblock} onCheckedChange={(unblock) => onChange({ unblock })} />
      </Row>
      <p className="text-[10px] leading-4 text-zinc-500">{t('rv.unblock.body')}</p>
      <Row label={t('rv.view.mobileUa')}>
        <Switch checked={settings.mobileUa} onCheckedChange={(mobileUa) => onChange({ mobileUa })} />
      </Row>
      <p className="text-[10px] leading-4 text-zinc-500">{t('rv.view.mobileUaHint')}</p>
      <Row label={t('rv.sim.keyboard')}>
        <Switch checked={keyboard} onCheckedChange={onKeyboard} />
      </Row>
      <label className="flex flex-col gap-1 text-zinc-400">
        {t('rv.sim.brightness')}
        <Slider min={0.4} max={1} step={0.05} value={[brightness]} onValueChange={([value]) => onBrightness(value ?? 1)} thumbLabel={t('rv.sim.brightness')} />
      </label>
      <Button size="sm" variant="outline" onClick={onRotateAll}>{t('rv.view.rotateAll')}</Button>
      <Button size="sm" variant="outline" onClick={onPreset}><FolderOpenIcon />{t('rv.preset.open')}</Button>
      <Separator className="bg-white/10" />
      <p className="font-semibold">{t('rv.present.title')}</p>
      <Input value={settings.presentation.heading} onChange={(event) => onChange({ presentation: { ...settings.presentation, heading: event.target.value } })} placeholder={t('rv.present.heading')} className="h-7 text-xs" />
      <Input value={settings.presentation.description} onChange={(event) => onChange({ presentation: { ...settings.presentation, description: event.target.value } })} placeholder={t('rv.present.description')} className="h-7 text-xs" />
      <Input value={settings.presentation.customBackground} onChange={(event) => onChange({ presentation: { ...settings.presentation, customBackground: event.target.value } })} placeholder={t('rv.present.background')} className="h-7 font-mono text-[10px]" />
      <Button size="sm" variant="outline" onClick={() => onChange({ presentation: { ...settings.presentation, hideChrome: true } })}>
        {t('rv.present.enter')}
      </Button>
      <Separator className="bg-white/10" />
      <p className="font-semibold">{t('rv.compare.title')}</p>
      <Input value={compareUrl} onChange={(event) => onCompareUrl(event.target.value)} placeholder={t('rv.compare.placeholder')} className="h-7 font-mono text-xs" />
      <p className="text-[10px] text-zinc-500">{t('rv.compare.hint')}</p>
      <Separator className="bg-white/10" />
      <p className="font-semibold">{t('rv.annotate.title')}</p>
      <div className="flex flex-wrap gap-1">
        {(['arrow', 'rect', 'circle', 'pen', 'highlight', 'text', 'marker', 'blur'] as StudioAnnotateTool[]).map((tool) => (
          <Button key={tool} size="xs" variant={annotateTool === tool ? 'default' : 'outline'} onClick={() => onAnnotate(annotateTool === tool ? null : tool)}>
            {tool}
          </Button>
        ))}
      </div>
      <Separator className="bg-white/10" />
      <p className="font-semibold">{t('rv.network.title')}</p>
      <p className="text-[10px] text-zinc-500">{t('rv.network.hint')}</p>
      <div className="flex flex-wrap gap-1">
        {(['online', '4g', 'slow-4g', '3g', 'slow-3g', 'offline'] as NetworkProfile[]).map((profile) => (
          <Button key={profile} size="xs" variant={network === profile ? 'default' : 'outline'} onClick={() => onNetwork(profile)}>
            {profile}
          </Button>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={() => void onEmulate()}>{t('rv.emulate.start')}</Button>
      <Button size="sm" variant="ghost" onClick={() => void onStopEmulate()}>{t('rv.emulate.stop')}</Button>
      <p className="text-[10px] leading-4 text-zinc-500">{t('rv.emulate.hint')}</p>
      <Button size="sm" variant="outline" onClick={() => void onSyncAccess()}>{t('rv.sync.allow')}</Button>
      <Button size="sm" variant="outline" onClick={() => void onOverflow()}>{t('rv.overflow.scan')}</Button>
      {metrics && ('error' in metrics ? (
        <p className="text-[10px] text-amber-300">{metrics.error}</p>
      ) : (
        <p className="font-mono text-[10px] text-zinc-400">
          {metrics.viewport.width}×{metrics.viewport.height} · DPR {metrics.dpr} · {metrics.orientation}
        </p>
      ))}
      {overflow && ('error' in overflow ? (
        <p className="text-[10px] text-amber-300">{overflow.error}</p>
      ) : (
        <ul className="space-y-1 text-[10px] text-zinc-400">
          {overflow.slice(0, 8).map((hit) => (
            <li key={hit.selector} className="font-mono">{hit.selector} +{hit.overflow}px</li>
          ))}
        </ul>
      ))}
      <Row label={t('rv.sim.taps')}>
        <Switch checked={settings.tapMarkers} onCheckedChange={(tapMarkers) => onChange({ tapMarkers })} />
      </Row>
      <Row label={t('rv.sim.pwa')}>
        <Switch
          checked={!settings.showLabels && settings.presentation.hideChrome}
          onCheckedChange={(on) =>
            onChange({
              showLabels: !on,
              showStatusBar: true,
              presentation: { ...settings.presentation, hideChrome: on },
            })
          }
        />
      </Row>
      <p className="text-[10px] text-zinc-500">{t('rv.sim.pwaHint')}</p>
    </aside>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2 text-zinc-300">
      <span>{label}</span>
      {children}
    </label>
  )
}

function RoundAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className="pointer-events-auto flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-lg backdrop-blur-md hover:bg-black/80"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function LayoutPicker({ value, onChange }: { value: LayoutMode; onChange: (value: LayoutMode) => void }) {
  const { t } = useTranslation()
  const options: LayoutMode[] = ['focus', 'row', 'vertical', 'grid', 'freeform']
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          <LayoutGridIcon />
          {t(`rv.layout.${value}`)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1">
        {options.map((layout) => (
          <button key={layout} type="button" className={cn('block w-full rounded-md px-2 py-1.5 text-left text-xs', value === layout && 'bg-accent')} onClick={() => onChange(layout)}>
            {t(`rv.layout.${layout}`)}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function RecordButton({
  session,
  elapsed,
  mime,
}: {
  session: ReturnType<typeof useRecorderSession>['session']
  elapsed: number
  mime: string
}) {
  const { t } = useTranslation()
  if (!session) {
    return (
      <IconAction label={`${t('rv.record.start')} (${mime})`} onClick={() => void startStudioRecording({ ...DEFAULT_RECORDER_SETTINGS, countdown: false })}>
        <VideoIcon />
      </IconAction>
    )
  }
  return (
    <div className="flex items-center gap-1">
      {session.phase === 'paused' ? (
        <IconAction label={t('rv.record.resume')} onClick={() => void resumeStudioRecording()}>
          <PlayIcon />
        </IconAction>
      ) : (
        <IconAction label={t('rv.record.pause')} onClick={() => void pauseStudioRecording()}>
          <PauseIcon />
        </IconAction>
      )}
      <IconAction label={t('rv.record.stop')} onClick={() => void stopStudioRecording()}>
        <SquareIcon className="fill-red-500 text-red-500" />
      </IconAction>
      <span className="hidden font-mono text-[10px] text-red-400 @[800px]:inline">{formatElapsed(elapsed)}</span>
    </div>
  )
}

function ScreenshotDialog({
  open,
  onOpenChange,
  onCapture,
  onGif,
  busy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (options: CaptureOptions & { target: 'selected' | 'all' | 'canvas' }) => void
  onGif: () => void
  busy: string | null
}) {
  const { t } = useTranslation()
  const [format, setFormat] = useState<CaptureOptions['format']>('png')
  const [target, setTarget] = useState<'selected' | 'all' | 'canvas'>('selected')
  const [transparent, setTransparent] = useState(true)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('rv.shot.title')}</DialogTitle>
          <DialogDescription>{t('rv.shot.body')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex gap-1">
            {(['selected', 'all', 'canvas'] as const).map((item) => (
              <Button key={item} size="xs" variant={target === item ? 'default' : 'outline'} onClick={() => setTarget(item)}>
                {t(`rv.shot.${item}`)}
              </Button>
            ))}
          </div>
          <div className="flex gap-1">
            {(['png', 'jpeg', 'webp', 'pdf'] as const).map((item) => (
              <Button key={item} size="xs" variant={format === item ? 'default' : 'outline'} onClick={() => setFormat(item)}>
                {item.toUpperCase()}
              </Button>
            ))}
          </div>
          <label className="flex items-center justify-between text-xs">
            {t('rv.shot.transparent')}
            <Switch checked={transparent} onCheckedChange={setTransparent} />
          </label>
          <Button onClick={() => onCapture({ format, scale: 1, transparent, target })} disabled={Boolean(busy)}>
            {t('rv.shot.save')}
          </Button>
          <Button variant="outline" onClick={onGif} disabled={Boolean(busy)}>
            {t('rv.shot.gif')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PresetDialog({
  open,
  onOpenChange,
  presets,
  onSave,
  onApply,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  presets: SimulatorPreset[]
  onSave: (name: string) => void
  onApply: (preset: SimulatorPreset) => void
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('Mobile QA')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('rv.preset.title')}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} className="h-8 text-xs" />
          <Button size="sm" onClick={() => onSave(name.trim() || 'Preset')}>{t('rv.preset.save')}</Button>
        </div>
        <ul className="flex flex-col gap-1">
          {presets.map((preset) => (
            <li key={preset.id} className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
              <span className="flex-1 truncate">{preset.name}</span>
              <Button size="xs" variant="outline" onClick={() => onApply(preset)}>{t('rv.preset.apply')}</Button>
              <Button size="xs" variant="ghost" onClick={() => onDelete(preset.id)}>{t('rv.preset.delete')}</Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
