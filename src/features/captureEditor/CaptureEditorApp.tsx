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
import {
  drawAnnotationDraft,
  isCommittedAnnotationDrag,
  isDragAnnotationTool,
  type Annotation,
  type AnnotationTool,
} from '@/core/engines/capture'
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

import { BackButton } from '@/shared/components/BackButton'

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
  const dragStart = useRef<{
    x: number
    y: number
    tool: AnnotationTool
    color: string
    pointerId: number
  } | null>(null)
  const draftRef = useRef<Annotation | null>(null)
  const annotationsRef = useRef<Annotation[]>([])
  const paintRaf = useRef(0)
  const markerCount = useRef(0)
  const undoStack = useRef<Annotation[][]>([])
  const redoStack = useRef<Annotation[][]>([])
  const autoRan = useRef(false)

  annotationsRef.current = annotations

  const frame = session?.frames[frameIndex]

  const paint = useCallback((draft: Annotation | null = draftRef.current) => {
    const base = baseCanvasRef.current
    const view = canvasRef.current
    if (!base || !view) return
    if (view.width !== base.width) view.width = base.width
    if (view.height !== base.height) view.height = base.height
    const ctx = view.getContext('2d')
    if (!ctx) return
    ctx.drawImage(base, 0, 0)
    applyAnnotations(view, annotationsRef.current)
    if (draft) drawAnnotationDraft(view, draft, effectiveZoomRef.current)
  }, [])

  const cancelPaintRaf = () => {
    if (!paintRaf.current) return
    cancelAnimationFrame(paintRaf.current)
    paintRaf.current = 0
  }

  const flushPaint = (draft: Annotation | null) => {
    cancelPaintRaf()
    draftRef.current = draft
    paint(draft)
  }

  const schedulePaint = (draft: Annotation | null) => {
    draftRef.current = draft
    if (paintRaf.current) return
    paintRaf.current = requestAnimationFrame(() => {
      paintRaf.current = 0
      paint(draftRef.current)
    })
  }

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
        paint(null)
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
    paint(draftRef.current)
  }, [annotations, paint])

  useEffect(() => () => cancelPaintRaf(), [])

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
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (!dragStart.current && !draftRef.current) return
      event.preventDefault()
      dragStart.current = null
      flushPaint(null)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keydown', onEscape)
    }
  })

  const imagePoint = (event: { clientX: number; clientY: number }): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const width = rect.width || 1
    const height = rect.height || 1
    return {
      x: (event.clientX - rect.left) * (canvas.width / width),
      y: (event.clientY - rect.top) * (canvas.height / height),
    }
  }

  const pushAnnotation = (note: Annotation) => {
    undoStack.current.push(annotationsRef.current)
    redoStack.current = []
    const next = [...annotationsRef.current, note]
    annotationsRef.current = next
    setAnnotations(next)
  }

  const beginDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
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
    if (!isDragAnnotationTool(activeTool)) return
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* Capture is best-effort; move events still work while over the canvas. */
    }
    dragStart.current = {
      x: point.x,
      y: point.y,
      tool: activeTool,
      color,
      pointerId: event.pointerId,
    }
  }

  const moveDraw = (event: { pointerId: number; clientX: number; clientY: number }) => {
    const start = dragStart.current
    if (!start || start.pointerId !== event.pointerId) return
    const end = imagePoint(event)
    schedulePaint({
      tool: start.tool,
      color: start.color,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
    })
  }

  const endDraw = (event: { pointerId: number; clientX: number; clientY: number }) => {
    const start = dragStart.current
    if (!start || start.pointerId !== event.pointerId) return
    dragStart.current = null
    const view = canvasRef.current
    if (view?.hasPointerCapture(event.pointerId)) {
      try {
        view.releasePointerCapture(event.pointerId)
      } catch {
        /* already released */
      }
    }
    const end = imagePoint(event)
    if (!isCommittedAnnotationDrag(start, end)) {
      flushPaint(null)
      return
    }
    pushAnnotation({
      tool: start.tool,
      color: start.color,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
    })
    flushPaint(null)
  }

  const cancelDraw = (event: { pointerId: number }) => {
    const start = dragStart.current
    if (!start || start.pointerId !== event.pointerId) return
    dragStart.current = null
    flushPaint(null)
  }

  useEffect(() => {
    const onMove = (event: PointerEvent) => moveDraw(event)
    const onUp = (event: PointerEvent) => endDraw(event)
    const onCancel = (event: PointerEvent) => cancelDraw(event)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  })

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
      className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/15 md:flex-row"
    >
      <div className="@container flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur-sm">
          <BackButton to="/tools/screenshots/capture" className="size-8 rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">
              {frame.pageInfo?.title ?? 'Screenshot'}
            </p>
            {frame.pageInfo?.domain && (
              <p className="truncate text-[11px] text-muted-foreground">{frame.pageInfo.domain}</p>
            )}
          </div>
          <Badge variant="outline" className="hidden shrink-0 tabular-nums sm:inline-flex">
            {baseSize.width}×{baseSize.height}
          </Badge>
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            {zoomPercent}%
          </Badge>
        </div>
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
          className="scrollbar-styled min-h-0 flex-1 overflow-auto overscroll-contain bg-[length:20px_20px] bg-muted/25 [background-image:radial-gradient(color-mix(in_srgb,var(--foreground)_6%,transparent)_1px,transparent_1px)]"
          style={{ touchAction: 'pan-x pan-y' }}
        >
          <div className="flex min-h-full min-w-full items-start justify-center p-4 sm:p-6">
            <div className="w-fit rounded-xl bg-background/60 p-1.5 shadow-lg ring-1 ring-border/60 backdrop-blur-[2px]">
            <canvas
              ref={canvasRef}
              draggable={false}
              className="block max-w-none cursor-crosshair touch-none select-none rounded-md border border-border/40 bg-background"
              style={canvasStyle}
              onPointerDown={beginDraw}
            />
            </div>
          </div>
        </div>
        {session.frames.length > 1 && (
          <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-border/60 bg-background/95 p-2 backdrop-blur-sm">
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

      <aside className="relative flex w-full shrink-0 flex-col border-t border-border/60 bg-background md:max-h-full md:w-[17.5rem] md:border-l md:border-t-0 lg:w-[19rem]">
        <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2 text-primary">
            <ImageIcon className="size-4 shrink-0" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">Export</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="outline"
                className="shrink-0 rounded-lg"
                aria-label="Screenshot options"
                onClick={() => navigate('/tools/screenshots/capture?options=1')}
              >
                <SettingsIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Options</TooltipContent>
          </Tooltip>
        </div>
        <div className="scrollbar-styled min-h-0 flex-1 overflow-y-auto p-3 md:max-h-none">
          <Card className="gap-0 overflow-hidden border-border/60 py-0 shadow-sm">
            <CardHeader className="border-b border-border/50 bg-muted/15 px-3 py-2.5">
              <CardTitle className="text-sm font-semibold">Save & share</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 px-3 py-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="capture-image-format" className="text-[11px] font-medium text-muted-foreground">
                  Image file
                </Label>
                <div className="flex items-stretch gap-2">
                  <Select value={format} onValueChange={(value) => setFormat(value as ImageFormat)}>
                    <SelectTrigger id="capture-image-format" className="h-9 w-[5.5rem] shrink-0">
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
                    className="h-9 min-w-0 flex-1"
                    disabled={busy}
                    onClick={() => void runExport('Saved', 'image', () => save(format, 'image'))}
                  >
                    <DownloadIcon className="shrink-0" />
                    <span className="truncate">Save image</span>
                  </Button>
                </div>
                {exportJob?.anchor === 'image' && (
                  <CaptureExportProgress exportJob={exportJob} t={t} />
                )}
              </div>
              <Separator />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="capture-pdf-split" className="text-[11px] font-medium text-muted-foreground">
                  PDF document
                </Label>
                <div className="flex items-stretch gap-2">
                  <Select value={pdfSplit} onValueChange={(value) => setPdfSplit(value as PdfSplit)}>
                    <SelectTrigger id="capture-pdf-split" className="h-9 w-[7.25rem] shrink-0">
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
                    className="h-9 min-w-0 flex-1"
                    disabled={busy}
                    onClick={() => void runExport('PDF saved', 'pdf', () => save('pdf', 'pdf'))}
                  >
                    <FileTextIcon className="shrink-0" />
                    <span className="truncate">Save PDF</span>
                  </Button>
                </div>
                {exportJob?.anchor === 'pdf' && (
                  <CaptureExportProgress exportJob={exportJob} t={t} />
                )}
              </div>
              <Separator />
              <p className="text-[11px] font-medium text-muted-foreground">Quick actions</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-1 rounded-lg py-2.5 text-xs"
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
                  className="h-auto flex-col gap-1 rounded-lg py-2.5 text-xs"
                  disabled={busy}
                  onClick={() => void runQuickAction('Print dialog opened', print)}
                >
                  <PrinterIcon className="size-4 text-primary" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  className="col-span-2 h-9 gap-2 text-xs"
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
                  className="h-9 w-full"
                  disabled={busy}
                  onClick={() => void runExport('ZIP saved', 'zip', saveAllAsZip)}
                >
                  <FolderArchiveIcon className="shrink-0" />
                  Save all as ZIP
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
