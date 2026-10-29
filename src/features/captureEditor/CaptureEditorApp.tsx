import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import {
  ClipboardCopyIcon,
  DownloadIcon,
  FileTextIcon,
  FolderArchiveIcon,
  ImageIcon,
  Loader2Icon,
  MailIcon,
  PrinterIcon,
  SettingsIcon,
  TriangleAlertIcon,
} from 'lucide-react'

import { useRouter } from '@/app/router'
import type { Annotation, AnnotationTool } from '@/core/engines/capture'
import { sendMessage } from '@/core/messaging/messageService'
import type { ScreenshotFrame, ScreenshotSession } from '@/core/screenshot/types'
import { captureAutoAction, withoutAutoAction, type CaptureAutoAction } from '@/core/screenshot/viewerUrl'
import {
  applyAnnotations,
  dataUrlToCanvas,
  stampPageInfo,
  stitchFrameToCanvas,
} from '@/core/screenshot/export/canvas'
import {
  buildExportFilename,
  copyCanvasToClipboard,
  downloadBlobInExtension,
  exportCanvas,
  openEmailHandoff,
  zipBlobs,
  type ImageFormat,
} from '@/core/screenshot/export'
import {
  DEFAULT_SCREENSHOT_SETTINGS,
  loadScreenshotSettings,
  type ScreenshotSettings,
} from '@/core/screenshot/settings'
import { addScreenshotHistory } from '@/core/screenshot/history'
import { LongTaskProgress } from '@/shared/components/LongTaskProgress'
import { useToast } from '@/shared/components/toast/useToast'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Separator } from '@/shared/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

import { CaptureHistory } from './CaptureHistory'
import { CaptureEditorToolbar } from './CaptureEditorToolbar'
import { IMAGE_FORMATS, ScreenshotOptions } from './ScreenshotOptions'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 4
const ZOOM_STEP = 1.25
const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
type ZoomLevel = 'fit' | number
type PdfSplit = 'none' | 'a4' | 'letter'

async function frameToCanvas(frame: ScreenshotFrame, settings: ScreenshotSettings): Promise<HTMLCanvasElement> {
  let canvas: HTMLCanvasElement
  if (frame.slices?.length) {
    canvas = await stitchFrameToCanvas(frame)
  } else if (frame.dataUrl) {
    canvas = await dataUrlToCanvas(frame.dataUrl)
  } else {
    throw new Error('Empty capture frame')
  }
  if (settings.pageInfoStamp && frame.pageInfo) {
    stampPageInfo(canvas, frame.pageInfo, settings.pageInfoPosition)
  }
  return canvas
}

type CaptureExportJob = {
  anchor: 'image' | 'pdf' | 'zip'
  detailKey: string
  detail: string
  percent: number | null
  startedAt: number
}

function CaptureExportProgress({ exportJob, t }: { exportJob: CaptureExportJob; t: TFunction }) {
  const centerIcon =
    exportJob.anchor === 'pdf'
      ? FileTextIcon
      : exportJob.anchor === 'zip'
        ? FolderArchiveIcon
        : DownloadIcon
  return (
    <LongTaskProgress
      active
      title={t('capture.export.title')}
      percent={exportJob.percent}
      detail={exportJob.detail}
      detailKey={exportJob.detailKey}
      startedAt={exportJob.startedAt}
      centerIcon={centerIcon}
      flyingIcons={[FileTextIcon, FolderArchiveIcon]}
      layout="compact"
      hint={t('capture.export.hint')}
    />
  )
}

function CenteredMessage({ children, destructive }: { children: string; destructive?: boolean }) {
  if (destructive) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-gradient-to-b from-muted/40 to-background p-6">
        <Alert variant="destructive" className="max-w-md border-destructive/30 shadow-lg">
          <TriangleAlertIcon />
          <AlertDescription>{children}</AlertDescription>
        </Alert>
      </div>
    )
  }
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-gradient-to-b from-muted/30 to-background p-8">
      <div
        className="relative flex size-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 shadow-[0_0_28px_color-mix(in_srgb,var(--primary)_22%,transparent)]"
        aria-hidden
      >
        <Loader2Icon className="size-6 animate-spin text-primary" />
      </div>
      <p className="text-sm font-medium text-foreground">{children}</p>
    </div>
  )
}

export function CaptureEditorApp({ search = '' }: { search?: string }) {
  const params = useMemo(
    () => new URLSearchParams(search.startsWith('?') ? search.slice(1) : search),
    [search],
  )
  if (params.get('options') === '1') return <ScreenshotOptions />
  if (params.get('history') === '1' && !params.get('session')) return <CaptureHistory />
  return <CaptureEditor sessionId={params.get('session')} auto={captureAutoAction(params)} />
}

function CaptureEditor({ sessionId, auto }: { sessionId: string | null; auto: CaptureAutoAction | null }) {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const { show } = useToast()
  const [session, setSession] = useState<ScreenshotSession | null>(null)
  const [frameIndex, setFrameIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [exportJob, setExportJob] = useState<CaptureExportJob | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [settings, setSettings] = useState<ScreenshotSettings>(DEFAULT_SCREENSHOT_SETTINGS)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [format, setFormat] = useState<ImageFormat>(DEFAULT_SCREENSHOT_SETTINGS.defaultFormat)
  const [zoom, setZoom] = useState<ZoomLevel>('fit')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [activeTool, setActiveTool] = useState<AnnotationTool>('rect')
  const [color, setColor] = useState('#ef4444')
  const [text, setText] = useState('')
  const [pdfSplit, setPdfSplit] = useState<PdfSplit>('none')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const [baseSize, setBaseSize] = useState({ width: 0, height: 0 })
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const effectiveZoomRef = useRef(1)
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const markerCount = useRef(0)
  const undoStack = useRef<Annotation[][]>([])
  const redoStack = useRef<Annotation[][]>([])
  const autoRan = useRef(false)

  const frame = session?.frames[frameIndex]

  const redraw = useCallback(() => {
    const base = baseCanvasRef.current
    const view = canvasRef.current
    if (!base || !view) return
    view.width = base.width
    view.height = base.height
    const ctx = view.getContext('2d')
    if (!ctx) return
    ctx.drawImage(base, 0, 0)
    applyAnnotations(view, annotations)
  }, [annotations])

  useEffect(() => {
    void loadScreenshotSettings().then((loaded) => {
      setSettings(loaded)
      setFormat(loaded.defaultFormat === 'pdf' ? 'png' : loaded.defaultFormat)
      setSettingsLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      setError('No capture to show. Take a screenshot with a shortcut or from the Capture Toolkit.')
      return
    }
    void sendMessage<{ session: ScreenshotSession }>({
      type: 'SCREENSHOT_GET_SESSION',
      sessionId,
    }).then((data) => {
      if (!data?.session) setError('This capture has expired. Capture the page again.')
      else setSession(data.session)
      setLoading(false)
    })
  }, [sessionId])

  useEffect(() => {
    if (!frame || !settingsLoaded) return
    let cancelled = false
    void frameToCanvas(frame, settings)
      .then((canvas) => {
        if (cancelled) return
        baseCanvasRef.current = canvas
        setBaseSize({ width: canvas.width, height: canvas.height })
        setAnnotations([])
        markerCount.current = 0
        undoStack.current = []
        redoStack.current = []
        redraw()
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not render the capture.')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, settingsLoaded, settings.pageInfoStamp, settings.pageInfoPosition])

  useEffect(() => {
    redraw()
  }, [annotations, redraw])

  const undo = () => {
    const prev = undoStack.current.pop()
    if (!prev) return
    redoStack.current.push(annotations)
    setAnnotations(prev)
  }

  const redo = () => {
    const next = redoStack.current.pop()
    if (!next) return
    undoStack.current.push(annotations)
    setAnnotations(next)
  }

  const runQuickAction = async (label: string, action: () => Promise<void>) => {
    setStatus(null)
    try {
      await action()
      setStatus(label)
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'Something went wrong.')
    }
  }

  const runExport = async (
    label: string,
    anchor: 'image' | 'pdf' | 'zip',
    action: () => Promise<void>,
  ): Promise<boolean> => {
    setBusy(true)
    setStatus(null)
    setExportJob({
      anchor,
      detailKey: 'start',
      detail: t('capture.export.encode'),
      percent: null,
      startedAt: Date.now(),
    })
    try {
      await action()
      setStatus(label)
      return true
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'Something went wrong.')
      return false
    } finally {
      setBusy(false)
      setExportJob(null)
    }
  }

  const save = async (saveFormat: ImageFormat, anchor: 'image' | 'pdf', { saveAs = true } = {}) => {
    const view = canvasRef.current
    if (!view || !frame) return
    setExportJob((job) =>
      job
        ? {
            ...job,
            anchor,
            detailKey: 'encode',
            detail: t('capture.export.encode'),
            percent: 30,
          }
        : job,
    )
    const blob = await exportCanvas(view, saveFormat, {
      jpegQuality: settings.jpegQuality,
      pdfSplit,
      links: frame.links,
      textRuns: frame.textRuns,
    })
    const ext = saveFormat === 'jpeg' ? 'jpg' : saveFormat
    setExportJob((job) =>
      job
        ? {
            ...job,
            anchor,
            detailKey: 'save',
            detail: t('capture.export.save'),
            percent: 85,
          }
        : job,
    )
    await downloadBlobInExtension(blob, buildExportFilename(settings.filenameTemplate, frame.pageInfo, ext), {
      saveAs,
    })
    await addScreenshotHistory({
      id: `hist_${Date.now()}`,
      createdAt: Date.now(),
      thumbnail: view.toDataURL('image/jpeg', 0.6),
      blob,
      title: frame.pageInfo?.title ?? 'Screenshot',
      url: frame.pageInfo?.url ?? '',
      mode: session?.mode ?? 'visible',
    }).catch(() => undefined)
  }

  const saveAllAsZip = async () => {
    if (!session) return
    const files = []
    const total = session.frames.length
    for (let index = 0; index < session.frames.length; index++) {
      const item = session.frames[index]
      setExportJob((job) =>
        job
          ? {
              ...job,
              anchor: 'zip',
              detailKey: `frame-${index}`,
              detail: t('capture.export.zip'),
              percent: Math.round(((index + 0.5) / total) * 70),
            }
          : job,
      )
      const canvas = await frameToCanvas(item, settings)
      files.push({
        name: buildExportFilename(settings.filenameTemplate, item.pageInfo, 'png'),
        blob: await exportCanvas(canvas, 'png'),
      })
    }
    setExportJob((job) =>
      job
        ? {
            ...job,
            anchor: 'zip',
            detailKey: 'zip-save',
            detail: t('capture.export.save'),
            percent: 90,
          }
        : job,
    )
    await downloadBlobInExtension(await zipBlobs(files), 'captures.zip')
  }

  useEffect(() => {
    if (!auto || autoRan.current || !baseSize.width || !canvasRef.current) return
    autoRan.current = true
    history.replaceState(history.state, '', withoutAutoAction(window.location.hash))
    if (auto === 'copy') {
      void copyCanvasToClipboard(canvasRef.current).then(
        () => show(t('capture.auto.copied'), { variant: 'success' }),
        () => show(t('capture.auto.copyFailed'), { variant: 'error' }),
      )
      return
    }
    const target = settings.defaultFormat
    const anchor = target === 'pdf' ? 'pdf' : 'image'
    void runExport(t('capture.auto.saved'), anchor, () => save(target, anchor, { saveAs: false })).then(
      (ok) => ok && show(t('capture.auto.saved'), { variant: 'success' }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, baseSize.width])

  const print = async () => {
    const view = canvasRef.current
    if (!view) return
    const printWindow = window.open('')
    if (!printWindow) throw new Error('The print window was blocked.')
    const img = printWindow.document.createElement('img')
    img.src = view.toDataURL('image/png')
    img.style.maxWidth = '100%'
    printWindow.document.body.append(img)
    await img.decode().catch(() => undefined)
    printWindow.focus()
    printWindow.print()
  }

  const fitScale =
    baseSize.width && viewport.width
      ? Math.min(1, (viewport.width - 48) / baseSize.width, (viewport.height - 48) / baseSize.height)
      : 1
  const effectiveZoom = zoom === 'fit' ? Math.max(0.02, fitScale) : zoom
  useEffect(() => {
    effectiveZoomRef.current = effectiveZoom
  }, [effectiveZoom])

  const zoomTo = useCallback((next: number, anchor?: { x: number; y: number }) => {
    const box = scrollRef.current
    const current = effectiveZoomRef.current
    const target = clampZoom(next)
    setZoom(target)
    if (!box) return
    const px = anchor?.x ?? box.clientWidth / 2
    const py = anchor?.y ?? box.clientHeight / 2
    const ratio = target / current
    const left = (box.scrollLeft + px) * ratio - px
    const top = (box.scrollTop + py) * ratio - py
    requestAnimationFrame(() => {
      box.scrollLeft = left
      box.scrollTop = top
    })
  }, [])

  const zoomBy = useCallback(
    (factor: number, anchor?: { x: number; y: number }) => zoomTo(effectiveZoomRef.current * factor, anchor),
    [zoomTo],
  )

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || loading || !session) return
    const blockBrowserZoom = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (!editor.contains(event.target as Node)) return
      event.preventDefault()
    }
    document.addEventListener('wheel', blockBrowserZoom, { passive: false, capture: true })
    return () => document.removeEventListener('wheel', blockBrowserZoom, { capture: true })
  }, [loading, session])

  useEffect(() => {
    const box = scrollRef.current
    if (!box) return
    const measure = () => setViewport({ width: box.clientWidth, height: box.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    const anchorOf = (clientX: number, clientY: number) => {
      const rect = box.getBoundingClientRect()
      return { x: clientX - rect.left, y: clientY - rect.top }
    }
    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      zoomBy(Math.exp(-event.deltaY * 0.01), anchorOf(event.clientX, event.clientY))
    }
    let pinch: number | null = null
    const distance = (touches: TouchList) =>
      Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) pinch = distance(event.touches)
    }
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || pinch === null || pinch === 0) return
      event.preventDefault()
      const [a, b] = [event.touches[0], event.touches[1]]
      const next = distance(event.touches)
      zoomBy(next / pinch, anchorOf((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2))
      pinch = next
    }
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinch = null
    }
    box.addEventListener('wheel', onWheel, { passive: false })
    box.addEventListener('touchstart', onTouchStart, { passive: true })
    box.addEventListener('touchmove', onTouchMove, { passive: false })
    box.addEventListener('touchend', onTouchEnd)
    box.addEventListener('touchcancel', onTouchEnd)
    return () => {
      observer.disconnect()
      box.removeEventListener('wheel', onWheel)
      box.removeEventListener('touchstart', onTouchStart)
      box.removeEventListener('touchmove', onTouchMove)
      box.removeEventListener('touchend', onTouchEnd)
      box.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [zoomBy, loading, session])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      if (key === '=' || key === '+') {
        event.preventDefault()
        zoomBy(ZOOM_STEP)
      } else if (key === '-') {
        event.preventDefault()
        zoomBy(1 / ZOOM_STEP)
      } else if (key === '0') {
        event.preventDefault()
        setZoom('fit')
      } else if (key === 'z') {
        event.preventDefault()
        undo()
      } else if (key === 'y') {
        event.preventDefault()
        redo()
      } else if (key === 's') {
        event.preventDefault()
        void runExport('Saved', 'image', () => save(format, 'image'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const imagePoint = (event: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const pushAnnotation = (note: Annotation) => {
    undoStack.current.push(annotations)
    redoStack.current = []
    setAnnotations((prev) => [...prev, note])
  }

  if (loading) {
    return <CenteredMessage>Loading capture…</CenteredMessage>
  }
  if (error || !session || !frame) return <CenteredMessage destructive>{error ?? 'Nothing to show.'}</CenteredMessage>

  const canvasStyle = baseSize.width
    ? { width: `${baseSize.width * effectiveZoom}px`, height: `${baseSize.height * effectiveZoom}px` }
    : undefined
  const zoomPercent = Math.round(effectiveZoom * 100)

  return (
    <div
      ref={editorRef}
      data-capture-editor
      className="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-br from-muted/35 via-background to-muted/20 lg:flex-row"
    >
      <div className="@container flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <CaptureEditorToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          color={color}
          onColorChange={setColor}
          text={text}
          onTextChange={setText}
          effectiveZoom={effectiveZoom}
          zoom={zoom}
          zoomPercent={zoomPercent}
          onZoomIn={() => zoomBy(ZOOM_STEP)}
          onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
          onZoomFit={() => setZoom('fit')}
          onZoom100={() => zoomTo(1)}
          onUndo={undo}
          onRedo={redo}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
        />
        {frame.notice && (
          <Alert className="rounded-none border-x-0 border-t-0 border-amber-500/30 bg-amber-500/10">
            <TriangleAlertIcon className="text-amber-600 dark:text-amber-400" />
            <AlertDescription>{frame.notice}</AlertDescription>
          </Alert>
        )}
        <div
          ref={scrollRef}
          className="scrollbar-styled min-h-0 flex-1 overflow-auto overscroll-contain p-4 sm:p-6 [background-image:radial-gradient(color-mix(in_srgb,var(--foreground)_7%,transparent)_1px,transparent_1px)] [background-size:16px_16px] bg-muted/20"
          style={{ touchAction: 'pan-x pan-y' }}
        >
          <div className="mx-auto w-fit rounded-xl p-1 ring-1 ring-border/70 bg-background/40 shadow-[0_8px_32px_color-mix(in_srgb,var(--foreground)_12%,transparent)] backdrop-blur-[2px]">
            <canvas
              ref={canvasRef}
              className="mx-auto block max-w-none cursor-crosshair rounded-lg border border-border/50 bg-background shadow-inner"
              style={canvasStyle}
              onMouseDown={(event) => {
              const point = imagePoint(event)
              if (activeTool === 'text') {
                if (text.trim()) {
                  pushAnnotation({ tool: 'text', color, x1: point.x, y1: point.y, x2: point.x, y2: point.y, text })
                }
                return
              }
              if (activeTool === 'marker') {
                markerCount.current += 1
                pushAnnotation({
                  tool: 'marker',
                  color,
                  x1: point.x,
                  y1: point.y,
                  x2: point.x,
                  y2: point.y,
                  number: markerCount.current,
                })
                return
              }
              dragStart.current = point
            }}
            onMouseUp={(event) => {
              const start = dragStart.current
              if (!start) return
              dragStart.current = null
              const end = imagePoint(event)
              pushAnnotation({ tool: activeTool, color, x1: start.x, y1: start.y, x2: end.x, y2: end.y })
            }}
          />
          </div>
        </div>
        {session.frames.length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-t border-border/60 bg-background/90 p-2.5 backdrop-blur-sm">
            {session.frames.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                className={cn(
                  'h-auto shrink-0 flex-col gap-1.5 rounded-xl border p-1.5 transition-shadow duration-200',
                  index === frameIndex
                    ? 'border-primary/40 bg-primary/5 shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_35%,transparent)]'
                    : 'border-transparent hover:border-border/80 hover:bg-muted/40',
                )}
                title={item.label ?? item.pageInfo?.title}
                aria-pressed={index === frameIndex}
                onClick={() => setFrameIndex(index)}
              >
                <img
                  src={item.dataUrl ?? item.slices?.[0]?.dataUrl}
                  alt=""
                  className="h-12 w-20 rounded-md object-cover object-top ring-1 ring-border/60"
                />
                <span className="w-20 truncate text-[10px] font-medium text-muted-foreground">
                  {item.label ?? item.pageInfo?.title}
                </span>
              </Button>
            ))}
          </div>
        )}
      </div>

      <aside className="relative w-full shrink-0 overflow-y-auto border-l border-border/60 bg-gradient-to-b from-background via-background to-muted/25 lg:w-[19rem]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(120%_100%_at_50%_0%,color-mix(in_srgb,var(--primary)_14%,transparent),transparent)]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 p-4">
          <header className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 text-primary">
                <ImageIcon className="size-3.5 shrink-0" aria-hidden />
                <span className="text-[10px] font-semibold uppercase tracking-widest">Export studio</span>
              </div>
              <h2 className="truncate text-sm font-semibold leading-snug text-foreground">
                {frame.pageInfo?.title ?? 'Screenshot'}
              </h2>
              {frame.pageInfo?.domain && (
                <Badge
                  variant="outline"
                  className="max-w-full truncate border-primary/25 bg-primary/5 font-normal text-[10px] text-muted-foreground"
                >
                  {frame.pageInfo.domain}
                </Badge>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="outline"
                  className="shrink-0 rounded-lg border-border/70 bg-background/80 shadow-sm"
                  aria-label="Screenshot options"
                  onClick={() => navigate('/tools/screenshots/capture?options=1')}
                >
                  <SettingsIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Options</TooltipContent>
            </Tooltip>
          </header>

          <Card className="gap-0 overflow-hidden border-border/70 bg-card/95 py-0 shadow-md backdrop-blur-sm">
            <CardHeader className="border-b border-border/50 bg-muted/20 px-4 py-3">
              <CardTitle className="text-sm font-semibold">Save & share</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 px-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="capture-image-format" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Image file
                </Label>
                <div className="flex gap-2">
                  <Select value={format} onValueChange={(value) => setFormat(value as ImageFormat)}>
                    <SelectTrigger id="capture-image-format" className="w-24 border-border/70 bg-background shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_FORMATS.filter((item) => item.value !== 'pdf').map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="flex-1 shadow-md shadow-primary/15"
                    disabled={busy}
                    onClick={() => void runExport('Saved', 'image', () => save(format, 'image'))}
                  >
                    <DownloadIcon /> Save image
                  </Button>
                </div>
                {exportJob?.anchor === 'image' && (
                  <CaptureExportProgress exportJob={exportJob} t={t} />
                )}
              </div>
              <Separator className="bg-border/60" />
              <div className="flex flex-col gap-2">
                <Label htmlFor="capture-pdf-split" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  PDF document
                </Label>
                <div className="flex gap-2">
                  <Select value={pdfSplit} onValueChange={(value) => setPdfSplit(value as PdfSplit)}>
                    <SelectTrigger id="capture-pdf-split" className="w-32 border-border/70 bg-background shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Single page</SelectItem>
                      <SelectItem value="a4">A4 pages</SelectItem>
                      <SelectItem value="letter">Letter pages</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="flex-1 border-primary/25 bg-primary/5 hover:bg-primary/10"
                    disabled={busy}
                    onClick={() => void runExport('PDF saved', 'pdf', () => save('pdf', 'pdf'))}
                  >
                    <FileTextIcon /> Save PDF
                  </Button>
                </div>
                {exportJob?.anchor === 'pdf' && (
                  <CaptureExportProgress exportJob={exportJob} t={t} />
                )}
              </div>
              <Separator className="bg-border/60" />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-1.5 rounded-xl border-border/70 py-3 text-xs shadow-sm"
                  disabled={busy}
                  onClick={() =>
                    void runQuickAction('Copied to clipboard', async () => {
                      if (canvasRef.current) await copyCanvasToClipboard(canvasRef.current)
                    })
                  }
                >
                  <ClipboardCopyIcon className="size-4 text-primary" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-1.5 rounded-xl border-border/70 py-3 text-xs shadow-sm"
                  disabled={busy}
                  onClick={() => void runQuickAction('Print dialog opened', print)}
                >
                  <PrinterIcon className="size-4 text-primary" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  className="col-span-2 h-auto flex-row gap-2 rounded-xl border-border/70 py-2.5 text-xs shadow-sm"
                  disabled={busy}
                  onClick={() =>
                    void runExport('Saved — attach it in the Gmail draft', 'image', async () => {
                      await save(format, 'image')
                      openEmailHandoff(frame.pageInfo)
                    })
                  }
                >
                  <MailIcon className="size-4 shrink-0 text-primary" />
                  Email with Gmail
                </Button>
              </div>
              {session.frames.length > 1 && (
                <Button
                  variant="secondary"
                  className="rounded-xl shadow-sm"
                  disabled={busy}
                  onClick={() => void runExport('ZIP saved', 'zip', saveAllAsZip)}
                >
                  <FolderArchiveIcon /> Save all as ZIP
                </Button>
              )}
              {exportJob?.anchor === 'zip' && (
                <CaptureExportProgress exportJob={exportJob} t={t} />
              )}
              {status && (
                <p
                  role="status"
                  className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-foreground"
                >
                  {status}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </aside>
    </div>
  )
}
