import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import {
  ArrowUpRightIcon,
  CircleIcon,
  ClipboardCopyIcon,
  DownloadIcon,
  DropletsIcon,
  FileTextIcon,
  FolderArchiveIcon,
  HighlighterIcon,
  ListOrderedIcon,
  MailIcon,
  PrinterIcon,
  Redo2Icon,
  SettingsIcon,
  SquareIcon,
  TriangleAlertIcon,
  TypeIcon,
  Undo2Icon,
  type LucideIcon,
} from 'lucide-react'

import { useRouter } from '@/app/router'
import type { Annotation, AnnotationTool } from '@/core/engines/capture'
import { sendMessage } from '@/core/messaging/messageService'
import type { ScreenshotFrame, ScreenshotSession } from '@/core/screenshot/types'
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
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
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

import { CaptureHistory } from './CaptureHistory'
import { IMAGE_FORMATS, ScreenshotOptions } from './ScreenshotOptions'

const TOOLS: { id: AnnotationTool; label: string; icon: LucideIcon }[] = [
  { id: 'rect', label: 'Rectangle', icon: SquareIcon },
  { id: 'circle', label: 'Ellipse', icon: CircleIcon },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRightIcon },
  { id: 'highlight', label: 'Highlight', icon: HighlighterIcon },
  { id: 'blur', label: 'Blur', icon: DropletsIcon },
  { id: 'marker', label: 'Numbered step', icon: ListOrderedIcon },
  { id: 'text', label: 'Text', icon: TypeIcon },
]

const ZOOM_LEVELS = ['fit', '100', '75', '50'] as const
type ZoomLevel = (typeof ZOOM_LEVELS)[number]
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
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Alert variant={destructive ? 'destructive' : 'default'} className="max-w-md">
        {destructive && <TriangleAlertIcon />}
        <AlertDescription>{children}</AlertDescription>
      </Alert>
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
  return <CaptureEditor sessionId={params.get('session')} />
}

function CaptureEditor({ sessionId }: { sessionId: string | null }) {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const [session, setSession] = useState<ScreenshotSession | null>(null)
  const [frameIndex, setFrameIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [exportJob, setExportJob] = useState<CaptureExportJob | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [settings, setSettings] = useState<ScreenshotSettings>(DEFAULT_SCREENSHOT_SETTINGS)
  const [format, setFormat] = useState<ImageFormat>(DEFAULT_SCREENSHOT_SETTINGS.defaultFormat)
  const [zoom, setZoom] = useState<ZoomLevel>('fit')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [activeTool, setActiveTool] = useState<AnnotationTool>('rect')
  const [color, setColor] = useState('#ef4444')
  const [text, setText] = useState('')
  const [pdfSplit, setPdfSplit] = useState<PdfSplit>('none')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const markerCount = useRef(0)
  const undoStack = useRef<Annotation[][]>([])
  const redoStack = useRef<Annotation[][]>([])

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
    if (!frame) return
    let cancelled = false
    void frameToCanvas(frame, settings)
      .then((canvas) => {
        if (cancelled) return
        baseCanvasRef.current = canvas
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
  }, [frame, settings.pageInfoStamp, settings.pageInfoPosition])

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
  ) => {
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
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'Something went wrong.')
    } finally {
      setBusy(false)
      setExportJob(null)
    }
  }

  const save = async (saveFormat: ImageFormat, anchor: 'image' | 'pdf') => {
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
    await downloadBlobInExtension(blob, buildExportFilename(settings.filenameTemplate, frame.pageInfo, ext))
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      if (key === 'z') {
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

  const canvasStyle =
    zoom === 'fit' ? { maxWidth: '100%', maxHeight: 'calc(100vh - 7rem)' } : { width: `${zoom}%` }

  return (
    <div className="flex h-screen flex-col bg-muted/40 lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-1.5 border-b bg-background px-3 py-2">
          {TOOLS.map(({ id, label, icon: Icon }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant={activeTool === id ? 'secondary' : 'ghost'}
                  aria-label={label}
                  aria-pressed={activeTool === id}
                  onClick={() => setActiveTool(id)}
                >
                  <Icon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
          {activeTool === 'text' && (
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Text, then click the image"
              aria-label="Annotation text"
              className="h-8 w-48"
            />
          )}
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                aria-label="Annotation color"
                className="h-8 w-10 cursor-pointer p-1"
              />
            </TooltipTrigger>
            <TooltipContent>Color</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label="Undo" onClick={undo}>
                <Undo2Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label="Redo" onClick={redo}>
                <Redo2Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
          </Tooltip>
          <div className="ml-auto">
            <Select value={zoom} onValueChange={(value) => setZoom(value as ZoomLevel)}>
              <SelectTrigger size="sm" className="w-24" aria-label="Zoom">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZOOM_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level === 'fit' ? 'Fit' : `${level}%`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {frame.notice && (
          <Alert className="rounded-none border-x-0 border-t-0">
            <TriangleAlertIcon />
            <AlertDescription>{frame.notice}</AlertDescription>
          </Alert>
        )}
        <div className="min-h-0 flex-1 overflow-auto p-6">
          <canvas
            ref={canvasRef}
            className="mx-auto block cursor-crosshair rounded-md border bg-background shadow-sm"
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
        {session.frames.length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-t bg-background p-2">
            {session.frames.map((item, index) => (
              <Button
                key={index}
                variant={index === frameIndex ? 'secondary' : 'outline'}
                className="h-auto shrink-0 flex-col gap-1 p-1"
                title={item.label ?? item.pageInfo?.title}
                onClick={() => setFrameIndex(index)}
              >
                <img
                  src={item.dataUrl ?? item.slices?.[0]?.dataUrl}
                  alt=""
                  className="h-12 w-20 rounded-sm object-cover object-top"
                />
                <span className="w-20 truncate text-[10px]">{item.label ?? item.pageInfo?.title}</span>
              </Button>
            ))}
          </div>
        )}
      </div>

      <aside className="w-full shrink-0 overflow-y-auto border-l bg-background p-4 lg:w-80">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Actions</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Screenshot options"
                  onClick={() => navigate('/tools/screenshots/capture?options=1')}
                >
                  <SettingsIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Options</TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="capture-image-format">Save as image</Label>
              <div className="flex gap-2">
                <Select value={format} onValueChange={(value) => setFormat(value as ImageFormat)}>
                  <SelectTrigger id="capture-image-format" className="w-24">
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
                  className="flex-1"
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
            <Separator />
            <div className="flex flex-col gap-2">
              <Label htmlFor="capture-pdf-split">Save to PDF</Label>
              <div className="flex gap-2">
                <Select value={pdfSplit} onValueChange={(value) => setPdfSplit(value as PdfSplit)}>
                  <SelectTrigger id="capture-pdf-split" className="w-32">
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
                  className="flex-1"
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
            <Separator />
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void runQuickAction('Copied to clipboard', async () => {
                  if (canvasRef.current) await copyCanvasToClipboard(canvasRef.current)
                })
              }
            >
              <ClipboardCopyIcon /> Copy to clipboard
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void runQuickAction('Print dialog opened', print)}>
              <PrinterIcon /> Print
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void runExport('Saved — attach it in the Gmail draft', 'image', async () => {
                  await save(format, 'image')
                  openEmailHandoff(frame.pageInfo)
                })
              }
            >
              <MailIcon /> Email with Gmail
            </Button>
            {session.frames.length > 1 && (
              <Button
                variant="secondary"
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
              <p role="status" className="text-xs text-muted-foreground">
                {status}
              </p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
