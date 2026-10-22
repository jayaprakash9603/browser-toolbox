import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Annotation, AnnotationTool } from '@/core/engines/capture'
import { sendMessage } from '@/core/messaging/messageService'
import type { ScreenshotFrame, ScreenshotSession } from '@/core/screenshot/types'
import {
  applyAnnotations,
  dataUrlToCanvas,
  stampPageInfo,
  stitchSlicesToCanvas,
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
  saveScreenshotSettings,
  type ScreenshotSettings,
} from '@/core/screenshot/settings'
import {
  addScreenshotHistory,
  deleteScreenshotHistory,
  listScreenshotHistory,
  type ScreenshotHistoryEntry,
} from '@/core/screenshot/history'
import { Button } from '@/shared/components/ui/button'

const TOOLS: { id: AnnotationTool; label: string }[] = [
  { id: 'rect', label: '▭' },
  { id: 'circle', label: '◯' },
  { id: 'arrow', label: '→' },
  { id: 'highlight', label: '▨' },
  { id: 'blur', label: '▒' },
  { id: 'marker', label: '①' },
  { id: 'text', label: 'T' },
]

async function frameToCanvas(frame: ScreenshotFrame, settings: ScreenshotSettings): Promise<HTMLCanvasElement> {
  let canvas: HTMLCanvasElement
  if (frame.slices && frame.stitchHeight != null && frame.devicePixelRatio) {
    canvas = await stitchSlicesToCanvas(frame.slices, frame.stitchHeight, frame.devicePixelRatio)
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

export function CaptureEditorApp() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const sessionId = params.get('session')
  const showHistory = params.get('history') === '1'
  const showOptions = params.get('options') === '1'

  const [session, setSession] = useState<ScreenshotSession | null>(null)
  const [frameIndex, setFrameIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<ScreenshotSettings>(DEFAULT_SCREENSHOT_SETTINGS)
  const [zoom, setZoom] = useState<'fit' | number>('fit')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [activeTool, setActiveTool] = useState<AnnotationTool>('rect')
  const [color, setColor] = useState('#ef4444')
  const [history, setHistory] = useState<ScreenshotHistoryEntry[]>([])
  const [pdfSplit, setPdfSplit] = useState<'none' | 'a4' | 'letter'>('none')

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
    void loadScreenshotSettings().then(setSettings)
    void listScreenshotHistory().then(setHistory)
  }, [])

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      if (!showHistory && !showOptions) setError('No capture session.')
      return
    }
    void sendMessage<{ session: ScreenshotSession }>({
      type: 'SCREENSHOT_GET_SESSION',
      sessionId,
    }).then((data) => {
      if (!data?.session) setError('Session expired. Capture again.')
      else setSession(data.session)
      setLoading(false)
    })
  }, [sessionId, showHistory, showOptions])

  useEffect(() => {
    if (!frame) return
    let cancelled = false
    void frameToCanvas(frame, settings).then((canvas) => {
      if (cancelled) return
      baseCanvasRef.current = canvas
      setAnnotations([])
      markerCount.current = 0
      undoStack.current = []
      redoStack.current = []
      redraw()
    })
    return () => {
      cancelled = true
    }
  }, [frame, settings.pageInfoStamp, settings.pageInfoPosition])

  useEffect(() => {
    redraw()
  }, [annotations, redraw])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault()
        const prev = undoStack.current.pop()
        if (prev) {
          redoStack.current.push(annotations)
          setAnnotations(prev)
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault()
        const next = redoStack.current.pop()
        if (next) {
          undoStack.current.push(annotations)
          setAnnotations(next)
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        void handleSave(settings.defaultFormat)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const imagePoint = (event: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  const pushAnnotation = (note: Annotation) => {
    undoStack.current.push(annotations)
    redoStack.current = []
    setAnnotations((prev) => [...prev, note])
  }

  const handleSave = async (format: ImageFormat) => {
    const view = canvasRef.current
    if (!view || !frame) return
    const blob = await exportCanvas(view, format, {
      jpegQuality: settings.jpegQuality,
      pdfSplit,
      links: frame.links,
      textRuns: frame.textRuns,
    })
    const ext = format === 'jpeg' ? 'jpg' : format
    const filename = buildExportFilename(settings.filenameTemplate, frame.pageInfo, ext)
    await downloadBlobInExtension(blob, filename)
    const thumb = view.toDataURL('image/jpeg', 0.6)
    await addScreenshotHistory({
      id: `hist_${Date.now()}`,
      createdAt: Date.now(),
      thumbnail: thumb,
      blob,
      title: frame.pageInfo?.title ?? 'Screenshot',
      url: frame.pageInfo?.url ?? '',
      mode: session?.mode ?? 'visible',
    })
    void listScreenshotHistory().then(setHistory)
  }

  const handlePrint = () => {
    const view = canvasRef.current
    if (!view) return
    const w = window.open('')
    if (!w) return
    w.document.write(`<img src="${view.toDataURL('image/png')}" style="max-width:100%" />`)
    w.document.close()
    w.focus()
    w.print()
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>
  }

  if (showOptions) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <h1 className="text-xl font-semibold">Screenshot options</h1>
        <label className="block text-sm">
          Filename template
          <input
            className="mt-1 w-full rounded border px-2 py-1"
            value={settings.filenameTemplate}
            onChange={(e) => setSettings({ ...settings, filenameTemplate: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          Default format
          <select
            className="mt-1 w-full rounded border px-2 py-1"
            value={settings.defaultFormat}
            onChange={(e) =>
              setSettings({ ...settings, defaultFormat: e.target.value as ImageFormat })
            }
          >
            {['png', 'jpeg', 'webp', 'gif', 'bmp', 'pdf'].map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <Button
          onClick={() => void saveScreenshotSettings(settings).then(() => alert('Saved'))}
        >
          Save
        </Button>
      </div>
    )
  }

  if (showHistory && !session) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-semibold">Capture history</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {history.map((item) => (
            <div key={item.id} className="rounded border p-2">
              <img src={item.thumbnail} alt="" className="mb-2 w-full rounded" />
              <p className="truncate text-xs">{item.title}</p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void downloadBlobInExtension(item.blob, `${item.title}.png`)}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void deleteScreenshotHistory(item.id).then(() =>
                      listScreenshotHistory().then(setHistory),
                    )
                  }
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !session || !frame) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-destructive">
        {error ?? 'Nothing to show.'}
      </div>
    )
  }

  const zoomStyle =
    zoom === 'fit'
      ? { maxWidth: '100%', maxHeight: 'calc(100vh - 120px)' }
      : { width: `${zoom}%` }

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <div className="flex flex-1 flex-col overflow-hidden border-r">
        <div className="flex flex-wrap items-center gap-2 border-b p-2">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`rounded px-2 py-1 text-sm ${activeTool === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              onClick={() => setActiveTool(t.id)}
            >
              {t.label}
            </button>
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-10"
          />
          <select
            className="rounded border px-2 py-1 text-sm"
            value={zoom === 'fit' ? 'fit' : String(zoom)}
            onChange={(e) => {
              const v = e.target.value
              setZoom(v === 'fit' ? 'fit' : Number(v))
            }}
          >
            <option value="fit">Fit</option>
            <option value="100">100%</option>
            <option value="75">75%</option>
            <option value="50">50%</option>
          </select>
        </div>
        {frame.notice && (
          <p className="bg-amber-500/15 px-3 py-1 text-sm text-amber-900 dark:text-amber-100">
            {frame.notice}
          </p>
        )}
        <div className="flex-1 overflow-auto p-4">
          <canvas
            ref={canvasRef}
            className="mx-auto cursor-crosshair shadow"
            style={zoomStyle}
            onMouseDown={(e) => {
              dragStart.current = imagePoint(e)
            }}
            onMouseUp={(e) => {
              if (!dragStart.current) return
              const end = imagePoint(e)
              const note: Annotation = {
                tool: activeTool,
                color,
                x1: dragStart.current.x,
                y1: dragStart.current.y,
                x2: end.x,
                y2: end.y,
                number: activeTool === 'marker' ? ++markerCount.current : undefined,
              }
              pushAnnotation(note)
              dragStart.current = null
            }}
          />
        </div>
        {session.frames.length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-t p-2">
            {session.frames.map((f, i) => (
              <button
                key={i}
                type="button"
                className={`shrink-0 rounded border p-1 ${i === frameIndex ? 'border-primary' : ''}`}
                onClick={() => setFrameIndex(i)}
              >
                <img
                  src={f.dataUrl ?? f.slices?.[0]?.dataUrl}
                  alt=""
                  className="h-12 w-20 object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      <aside className="w-full space-y-3 p-4 lg:w-72">
        <h2 className="font-semibold">Actions</h2>
        <Button className="w-full" onClick={() => void handleSave(settings.defaultFormat)}>
          Save image ({settings.defaultFormat})
        </Button>
        <select
          className="w-full rounded border px-2 py-1 text-sm"
          value={settings.defaultFormat}
          onChange={(e) => setSettings({ ...settings, defaultFormat: e.target.value as ImageFormat })}
        >
          {['png', 'jpeg', 'webp', 'gif', 'bmp'].map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <Button className="w-full" variant="outline" onClick={() => void handleSave('pdf')}>
          Save PDF
        </Button>
        <select
          className="w-full rounded border px-2 py-1 text-sm"
          value={pdfSplit}
          onChange={(e) => setPdfSplit(e.target.value as 'none' | 'a4' | 'letter')}
        >
          <option value="none">PDF — single page</option>
          <option value="a4">PDF — A4 pages</option>
          <option value="letter">PDF — Letter pages</option>
        </select>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => canvasRef.current && void copyCanvasToClipboard(canvasRef.current)}
        >
          Copy to clipboard
        </Button>
        <Button className="w-full" variant="outline" onClick={handlePrint}>
          Print
        </Button>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => {
            void handleSave(settings.defaultFormat).then(() =>
              openEmailHandoff(frame.pageInfo),
            )
          }}
        >
          Email (Gmail)
        </Button>
        {session.frames.length > 1 && (
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => {
              void (async () => {
                const files = []
                for (let i = 0; i < session.frames.length; i++) {
                  const c = await frameToCanvas(session.frames[i], settings)
                  applyAnnotations(c, [])
                  const blob = await exportCanvas(c, 'png')
                  files.push({
                    name: buildExportFilename(
                      settings.filenameTemplate,
                      session.frames[i].pageInfo,
                      'png',
                    ),
                    blob,
                  })
                }
                const zip = await zipBlobs(files)
                await downloadBlobInExtension(zip, 'captures.zip')
              })()
            }}
          >
            Save all as ZIP
          </Button>
        )}
        <Button
          className="w-full"
          variant="ghost"
          onClick={() => {
            window.location.href = chrome.runtime.getURL('capture-editor.html?options=1')
          }}
        >
          Options
        </Button>
      </aside>
    </div>
  )
}
