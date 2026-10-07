import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CameraIcon, DownloadIcon } from 'lucide-react'

import {
  captureVisibleTab,
  downloadDataUrl,
  renderAnnotated,
  type Annotation,
  type AnnotationTool,
} from '@/core/engines/capture'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { CopyButton } from '@/shared/components/CopyButton'
import { JsonErrorView } from '@/tools/developer/_shared'
import { useCaptureTool } from '../_shared'

const TOOLS: { id: AnnotationTool; label: string }[] = [
  { id: 'rect', label: '▭' },
  { id: 'circle', label: '◯' },
  { id: 'arrow', label: '→' },
  { id: 'highlight', label: '▨' },
  { id: 'blur', label: '▒' },
  { id: 'marker', label: '①' },
  { id: 'text', label: 'T' },
]

export default function CaptureTool() {
  const { t } = useTranslation()
  const tool = useCaptureTool('screenshots.capture')
  const [shot, setShot] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [activeTool, setActiveTool] = useState<AnnotationTool>('rect')
  const [color, setColor] = useState('#ef4444')
  const [text, setText] = useState('')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const imgRef = useRef<HTMLImageElement>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const markerCount = useRef(0)

  const capture = async () => {
    setCapturing(true)
    setError(null)
    const result = await captureVisibleTab()
    if (result.ok) {
      setShot(result.value.dataUrl)
      setAnnotations([])
    } else setError(result.error)
    setCapturing(false)
  }

  const imagePoint = (event: React.MouseEvent): { x: number; y: number } => {
    const img = imgRef.current!
    const rect = img.getBoundingClientRect()
    const scaleX = img.naturalWidth / rect.width
    const scaleY = img.naturalHeight / rect.height
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY }
  }

  const onMouseDown = (event: React.MouseEvent) => {
    if (!shot) return
    const point = imagePoint(event)
    if (activeTool === 'text' && text) {
      setAnnotations((a) => [
        ...a,
        { tool: 'text', color, x1: point.x, y1: point.y, x2: point.x, y2: point.y, text },
      ])
      return
    }
    if (activeTool === 'marker') {
      markerCount.current += 1
      setAnnotations((a) => [
        ...a,
        {
          tool: 'marker',
          color,
          x1: point.x,
          y1: point.y,
          x2: point.x,
          y2: point.y,
          number: markerCount.current,
        },
      ])
      return
    }
    dragStart.current = point
  }

  const onMouseUp = (event: React.MouseEvent) => {
    const start = dragStart.current
    if (!start) return
    dragStart.current = null
    const end = imagePoint(event)
    setAnnotations((a) => [
      ...a,
      { tool: activeTool, color, x1: start.x, y1: start.y, x2: end.x, y2: end.y },
    ])
  }

  const save = async () => {
    if (!shot) return
    const result =
      annotations.length > 0
        ? await renderAnnotated(shot, annotations)
        : { ok: true as const, value: { dataUrl: shot, width: 0, height: 0 } }
    if (result.ok) downloadDataUrl(result.value.dataUrl, `capture-${Date.now()}.png`)
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <Button size="sm" className="w-fit" onClick={() => void capture()} disabled={capturing}>
          <CameraIcon /> {capturing ? t('capture.capturing') : t('capture.captureVisible')}
        </Button>
        {error && <JsonErrorView message={error} />}
        {!shot && !error && (
          <p className="rounded-md border border-dashed py-10 text-center text-xs text-muted-foreground">
            {t('capture.empty')}
          </p>
        )}
        {shot && (
          <>
            <div className="flex flex-wrap items-center gap-1">
              {TOOLS.map((toolButton) => (
                <Button
                  key={toolButton.id}
                  size="icon-sm"
                  variant={activeTool === toolButton.id ? 'secondary' : 'outline'}
                  onClick={() => setActiveTool(toolButton.id)}
                  aria-label={toolButton.id}
                  title={t(`capture.tool.${toolButton.id}`)}
                >
                  {toolButton.label}
                </Button>
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="size-7 cursor-pointer rounded border"
                aria-label={t('design.color')}
              />
              {activeTool === 'text' && (
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t('capture.textLabel')}
                  className="h-7 flex-1 font-mono text-[11px]"
                  aria-label={t('capture.textLabel')}
                />
              )}
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  setAnnotations([])
                  markerCount.current = 0
                }}
              >
                {t('capture.clearAnnotations')}
              </Button>
            </div>
            <div className="overflow-auto rounded-md border">
              <img
                ref={imgRef}
                src={shot}
                alt={t('capture.preview')}
                className="max-w-full cursor-crosshair select-none"
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                draggable={false}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {t('capture.annotateHint', { count: annotations.length })}
            </p>
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => void save()}>
                <DownloadIcon /> {t('capture.download')}
              </Button>
              <CopyButton text={shot} size="sm" label={t('capture.copyDataUrl')} />
            </div>
          </>
        )}
      </div>
    </ToolPage>
  )
}
