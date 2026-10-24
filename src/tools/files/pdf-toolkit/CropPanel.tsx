import { useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon, ChevronRightIcon, CropIcon, LoaderCircleIcon, ScanIcon, Undo2Icon } from 'lucide-react'

import { cropPdf, type CropRect } from '@/core/engines/pdf/edit'
import { renderPdfPage, type PdfDocumentHandle } from '@/core/engines/pdf/pdfjs'
import { PdfPageImage } from '@/shared/components/pdf'
import { ActionBar, OptionField, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'
import { clamp } from './placed'
import { pdfArtifact, sourceOf, stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

type Scope = 'all' | 'current' | 'auto'
type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const FULL: CropRect = { u: 0, v: 0, w: 1, h: 1 }
const MIN = 0.05
const POINTS_PER_MM = 72 / 25.4

/** The smallest box around non-white pixels, as page fractions with a little padding. */
async function contentBox(handle: PdfDocumentHandle, page: number): Promise<CropRect | null> {
  const canvas = await renderPdfPage(handle, page, { scale: 0.6 })
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  const { width, height } = canvas
  const data = context.getImageData(0, 0, width, height).data
  let top = height
  let left = width
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      if (data[offset] + data[offset + 1] + data[offset + 2] < 735) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }
  canvas.width = 0
  if (right < 0) return null
  const pad = 0.015
  const u = clamp(left / width - pad, 0, 1)
  const v = clamp(top / height - pad, 0, 1)
  return { u, v, w: clamp((right + 1) / width + pad, 0, 1) - u, h: clamp((bottom + 1) / height + pad, 0, 1) - v }
}

function CropBox({ rect, onChange }: { rect: CropRect; onChange: (rect: CropRect) => void }) {
  const { t } = useTranslation()
  const drag = useRef<{ handle: Handle; x: number; y: number; start: CropRect; box: DOMRect } | null>(null)

  const begin = (event: PointerEvent<HTMLElement>, handle: Handle) => {
    event.stopPropagation()
    const box = (event.currentTarget.closest('[data-crop-frame]') as HTMLElement | null)?.getBoundingClientRect()
    if (!box) return
    drag.current = { handle, x: event.clientX, y: event.clientY, start: rect, box }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const move = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current
    if (!current) return
    const du = (event.clientX - current.x) / current.box.width
    const dv = (event.clientY - current.y) / current.box.height
    const { u, v, w, h } = current.start
    let left = u
    let top = v
    let right = u + w
    let bottom = v + h
    if (current.handle === 'move') {
      left = clamp(u + du, 0, 1 - w)
      top = clamp(v + dv, 0, 1 - h)
      right = left + w
      bottom = top + h
    } else {
      if (current.handle.includes('w')) left = clamp(u + du, 0, right - MIN)
      if (current.handle.includes('e')) right = clamp(u + w + du, left + MIN, 1)
      if (current.handle.includes('n')) top = clamp(v + dv, 0, bottom - MIN)
      if (current.handle.includes('s')) bottom = clamp(v + h + dv, top + MIN, 1)
    }
    onChange({ u: left, v: top, w: right - left, h: bottom - top })
  }
  const end = () => {
    drag.current = null
  }
  const handles: { id: Handle; className: string }[] = [
    { id: 'nw', className: '-top-1.5 -left-1.5 cursor-nwse-resize' },
    { id: 'ne', className: '-top-1.5 -right-1.5 cursor-nesw-resize' },
    { id: 'sw', className: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
    { id: 'se', className: '-right-1.5 -bottom-1.5 cursor-nwse-resize' },
    { id: 'n', className: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
    { id: 's', className: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
    { id: 'w', className: 'top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize' },
    { id: 'e', className: 'top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize' },
  ]
  return (
    <div
      role="group"
      aria-label={t('pdf.crop.area')}
      className="absolute cursor-move touch-none border-2 border-white shadow-[0_0_0_9999px_rgb(15_23_42/0.5)] outline outline-1 outline-primary"
      style={{ left: `${rect.u * 100}%`, top: `${rect.v * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }}
      onPointerDown={(event) => begin(event, 'move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3" aria-hidden>
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} className="border-[0.5px] border-white/35" />
        ))}
      </span>
      {handles.map(({ id, className }) => (
        <span
          key={id}
          aria-hidden
          onPointerDown={(event) => begin(event, id)}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          className={cn('absolute size-3 touch-none rounded-full border-2 border-white bg-primary shadow-md', className)}
        />
      ))}
    </div>
  )
}

/** Trims page edges by setting each page's visible area. */
export function CropPanel() {
  const { t } = useTranslation()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const total = doc.pages.length
  const [page, setPage] = useState(0)
  const [rect, setRect] = useState<CropRect>({ u: 0.06, v: 0.06, w: 0.88, h: 0.88 })
  const [scope, setScope] = useState<Scope>('all')
  const [detecting, setDetecting] = useState(false)
  const { busy, error, run } = useTask()
  const info = doc.pages[page]

  const margins = {
    top: (rect.v * info.height) / POINTS_PER_MM,
    left: (rect.u * info.width) / POINTS_PER_MM,
    bottom: ((1 - rect.v - rect.h) * info.height) / POINTS_PER_MM,
    right: ((1 - rect.u - rect.w) * info.width) / POINTS_PER_MM,
  }
  const setMargin = (side: keyof typeof margins, mm: number) => {
    const next = { ...margins, [side]: Math.max(0, mm) }
    const u = (next.left * POINTS_PER_MM) / info.width
    const v = (next.top * POINTS_PER_MM) / info.height
    const w = 1 - u - (next.right * POINTS_PER_MM) / info.width
    const h = 1 - v - (next.bottom * POINTS_PER_MM) / info.height
    if (w >= MIN && h >= MIN) setRect({ u, v, w, h })
  }

  const detect = async () => {
    setDetecting(true)
    try {
      const found = await contentBox(doc.handle, page + 1)
      if (found) setRect(found)
    } finally {
      setDetecting(false)
    }
  }

  const apply = () =>
    run(async () => {
      let crops: (CropRect | null)[]
      if (scope === 'all') crops = doc.pages.map(() => rect)
      else if (scope === 'current') crops = doc.pages.map((_, index) => (index === page ? rect : null))
      else {
        crops = []
        for (let index = 0; index < total; index += 1) crops.push(await contentBox(doc.handle, index + 1))
      }
      const bytes = await cropPdf(sourceOf(doc), crops)
      showResults({ artifacts: [pdfArtifact(`${stemOf(doc)}-cropped.pdf`, bytes, { source: { name: doc.name, size: doc.bytes.length }, note: t('pdf.crop.note') })] })
    })

  return (
    <div className="flex flex-col gap-3">
      <div className="grid items-start gap-3 @[860px]:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-2">
          <div
            className="flex justify-center overflow-hidden rounded-2xl border bg-muted/40 p-4"
            style={{ backgroundImage: 'radial-gradient(color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
          >
            <div data-crop-frame className="relative w-full select-none overflow-hidden" style={{ maxWidth: Math.max(info.width * 1.3, 320) }}>
              <PdfPageImage doc={doc.handle} pageNumber={page + 1} width={info.width} height={info.height} eager alt={t('fileui.page', { index: page + 1, total })} />
              {scope !== 'auto' && <CropBox rect={rect} onChange={setRect} />}
            </div>
          </div>
          {total > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0} aria-label={t('pdf.view.previousPage')}>
                <ChevronLeftIcon />
              </Button>
              <span className="text-[11px] tabular-nums text-muted-foreground">{t('fileui.page', { index: page + 1, total })}</span>
              <Button variant="outline" size="icon-sm" onClick={() => setPage((value) => Math.min(total - 1, value + 1))} disabled={page >= total - 1} aria-label={t('pdf.view.nextPage')}>
                <ChevronRightIcon />
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 @[860px]:sticky @[860px]:top-2">
          <PanelSection title={t('pdf.crop.scope')} icon={<CropIcon />}>
            <Segmented
              ariaLabel={t('pdf.crop.scope')}
              value={scope}
              onValueChange={setScope}
              options={[
                { value: 'all', label: t('pdf.crop.all') },
                { value: 'current', label: t('pdf.crop.current') },
                { value: 'auto', label: t('pdf.crop.auto') },
              ]}
              className="w-full [&>button]:flex-1"
            />
            <p className="text-[11px] text-muted-foreground">{t(`pdf.crop.${scope}Hint`)}</p>
          </PanelSection>
          {scope !== 'auto' && (
            <PanelSection
              title={t('pdf.crop.margins')}
              icon={<ScanIcon />}
              actions={
                <Button variant="ghost" size="icon-xs" onClick={() => setRect(FULL)} aria-label={t('pdf.crop.reset')}>
                  <Undo2Icon />
                </Button>
              }
            >
              <div className="grid grid-cols-2 gap-2">
                {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
                  <OptionField key={side} label={t(`pdf.crop.${side}`)}>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={Math.round(margins[side])}
                      onChange={(event) => setMargin(side, Number(event.target.value))}
                      className="h-8 tabular-nums"
                    />
                  </OptionField>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => void detect()} disabled={detecting}>
                {detecting ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <ScanIcon aria-hidden />}
                {t('pdf.crop.detect')}
              </Button>
            </PanelSection>
          )}
        </div>
      </div>
      {error && <PanelError message={error} />}
      <ActionBar>
        <Button onClick={() => void apply()} disabled={busy} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <CropIcon aria-hidden />}
          {t(`pdf.crop.run.${scope}`, { count: total })}
        </Button>
      </ActionBar>
    </div>
  )
}
