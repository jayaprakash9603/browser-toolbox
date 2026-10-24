import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronLeftIcon, ChevronRightIcon, DropletIcon, HashIcon, LoaderCircleIcon, StampIcon } from 'lucide-react'

import { toWinAnsi } from '@/core/engines/files/pdfLayout'
import { stampPdf, type PageNumberSpec, type WatermarkSpec } from '@/core/engines/pdf/edit'
import { numberAnchor, pageNumberLabel, watermarkAnchors, type NumberPosition } from '@/core/engines/pdf/geometry'
import { ActionBar, OptionField, OptionSelect, PanelError, PanelSection } from '@/shared/components/toolkit'
import { PdfPageImage } from '@/shared/components/pdf'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'
import { Slider } from '@/shared/components/ui/slider'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'
import { Swatches } from './common'
import { optionalSelection, rangeIssueMessage } from './rangeText'
import { measureText, pdfSafeText } from './raster'
import { pdfArtifact, sourceOf, stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

const WATERMARK_COLORS = ['#dc2626', '#1d4ed8', '#111827', '#9ca3af'] as const
const NUMBER_COLORS = ['#111827', '#374151', '#1d4ed8', '#b91c1c'] as const
const TEMPLATES = ['{n}', 'Page {n}', 'Page {n} of {total}', '{n} / {total}', '- {n} -'] as const
const POSITIONS: NumberPosition[] = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right']

type Watermark = Omit<WatermarkSpec, 'image'>

function Toggle({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
}

function PositionPicker({ value, onChange, label }: { value: NumberPosition; onChange: (value: NumberPosition) => void; label: string }) {
  const { t } = useTranslation()
  return (
    <OptionField label={label}>
      <div role="radiogroup" aria-label={label} className="relative grid h-[4.5rem] w-14 grid-cols-3 grid-rows-[auto_1fr_auto] gap-x-0.5 rounded-md border bg-white p-1 shadow-xs">
        {POSITIONS.map((position, index) => (
          <button
            key={position}
            type="button"
            role="radio"
            aria-checked={value === position}
            aria-label={t(`pdf.stamp.position.${position}`)}
            onClick={() => onChange(position)}
            className={cn('flex h-3.5 cursor-pointer items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring', index >= 3 && 'row-start-3')}
          >
            <span className={cn('h-1 w-2.5 rounded-full transition-colors', value === position ? 'bg-primary' : 'bg-slate-300 hover:bg-slate-400')} />
          </button>
        ))}
        <span className="pointer-events-none col-span-3 row-start-2 mx-1 my-1 flex flex-col justify-center gap-1" aria-hidden>
          <span className="h-px bg-slate-200" />
          <span className="h-px bg-slate-200" />
          <span className="h-px w-2/3 bg-slate-200" />
        </span>
      </div>
    </OptionField>
  )
}

export function StampPanel() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const total = doc.pages.length
  const [watermarkOn, setWatermarkOn] = useState(true)
  const [watermark, setWatermark] = useState<Watermark>({
    text: t('pdf.stamp.defaultText'),
    fontSize: 64,
    color: WATERMARK_COLORS[0],
    opacity: 0.2,
    angle: 45,
    layout: 'center',
    bold: true,
  })
  const [numbersOn, setNumbersOn] = useState(false)
  const [numbers, setNumbers] = useState<PageNumberSpec>({ template: 'Page {n} of {total}', position: 'bottom-center', start: 1, fontSize: 10, margin: 28, color: NUMBER_COLORS[1] })
  const [customTemplate, setCustomTemplate] = useState(false)
  const [range, setRange] = useState('')
  const [preview, setPreview] = useState(0)
  const { busy, error, run } = useTask()

  const selection = optionalSelection(range, total)
  const targets = selection.ok ? [...selection.pages].sort((a, b) => a - b) : []
  const info = doc.pages[preview]
  const display = { width: info.width, height: info.height }
  const setW = (patch: Partial<Watermark>) => setWatermark((current) => ({ ...current, ...patch }))
  const setN = (patch: Partial<PageNumberSpec>) => setNumbers((current) => ({ ...current, ...patch }))

  const position = targets.indexOf(preview)
  const stamped = position >= 0
  const wmWidth = measureText(watermark.text, { fontSize: watermark.fontSize, font: 'helvetica', bold: watermark.bold })
  const wmHeight = watermark.fontSize * 0.72
  const anchors = watermarkOn && watermark.text.trim() && stamped ? watermarkAnchors(display, wmWidth, wmHeight, watermark.angle, watermark.layout) : []
  const label = pageNumberLabel(numbers.template, numbers.start + Math.max(0, position), numbers.start + targets.length - 1)
  const numberPoint = numbersOn && stamped ? numberAnchor(display, measureText(label, { fontSize: numbers.fontSize, font: 'helvetica' }), numbers.fontSize, numbers.position, numbers.margin) : null

  const apply = () =>
    run(async () => {
      let watermarkSpec: WatermarkSpec | undefined
      if (watermarkOn && watermark.text.trim()) {
        const safe = await pdfSafeText(watermark.text, { fontSize: watermark.fontSize, font: 'helvetica', bold: watermark.bold, color: watermark.color })
        watermarkSpec = { ...watermark, text: safe.text, image: safe.image }
      }
      const bytes = await stampPdf(sourceOf(doc), {
        watermark: watermarkSpec,
        pageNumbers: numbersOn ? { ...numbers, template: toWinAnsi(numbers.template).text } : undefined,
        pages: targets,
      })
      showResults({
        artifacts: [pdfArtifact(`${stemOf(doc)}-stamped.pdf`, bytes, { source: { name: doc.name, size: doc.bytes.length } })],
      })
    })

  const enabled = (watermarkOn && watermark.text.trim().length > 0) || numbersOn

  return (
    <div className="flex flex-col gap-3">
      <div className="grid items-start gap-3 @[860px]:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
        <div className="flex min-w-0 flex-col gap-3">
          <PanelSection
            title={t('pdf.stamp.watermark')}
            icon={<DropletIcon />}
            actions={<Toggle id="pdf-watermark" checked={watermarkOn} onChange={setWatermarkOn} label={t('pdf.stamp.watermarkToggle')} />}
          >
            <AnimatePresence initial={false}>
              {watermarkOn && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-3 overflow-hidden">
                  <OptionField label={t('pdf.stamp.text')}>
                    <Input value={watermark.text} onChange={(event) => setW({ text: event.target.value })} className="h-8" />
                  </OptionField>
                  <div className="grid gap-3 @[520px]:grid-cols-3">
                    <OptionField label={t('pdf.stamp.size', { value: watermark.fontSize })}>
                      <Slider value={[watermark.fontSize]} min={16} max={140} step={2} thumbLabel={t('pdf.stamp.sizeLabel')} onValueChange={([value]) => setW({ fontSize: value })} />
                    </OptionField>
                    <OptionField label={t('pdf.stamp.opacity', { value: Math.round(watermark.opacity * 100) })}>
                      <Slider value={[watermark.opacity * 100]} min={5} max={100} step={5} thumbLabel={t('pdf.stamp.opacityLabel')} onValueChange={([value]) => setW({ opacity: value / 100 })} />
                    </OptionField>
                    <OptionField label={t('pdf.stamp.angle', { value: watermark.angle })}>
                      <Slider value={[watermark.angle]} min={-90} max={90} step={5} thumbLabel={t('pdf.stamp.angleLabel')} onValueChange={([value]) => setW({ angle: value })} />
                    </OptionField>
                  </div>
                  <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                    <Swatches label={t('pdf.stamp.color')} colors={WATERMARK_COLORS} value={watermark.color} onChange={(color) => setW({ color })} />
                    <OptionField label={t('pdf.stamp.layout')}>
                      <Segmented
                        size="sm"
                        ariaLabel={t('pdf.stamp.layout')}
                        value={watermark.layout}
                        onValueChange={(layout) => setW({ layout })}
                        options={[
                          { value: 'center', label: t('pdf.stamp.center') },
                          { value: 'tile', label: t('pdf.stamp.tile') },
                        ]}
                        className="h-8"
                      />
                    </OptionField>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </PanelSection>

          <PanelSection
            title={t('pdf.stamp.numbers')}
            icon={<HashIcon />}
            actions={<Toggle id="pdf-numbers" checked={numbersOn} onChange={setNumbersOn} label={t('pdf.stamp.numbersToggle')} />}
          >
            <AnimatePresence initial={false}>
              {numbersOn && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-3 overflow-hidden">
                  <div className="flex flex-wrap items-start gap-4">
                    <PositionPicker value={numbers.position} onChange={(value) => setN({ position: value })} label={t('pdf.stamp.positionLabel')} />
                    <div className="grid min-w-0 flex-1 gap-2.5 @[520px]:grid-cols-2">
                      <OptionSelect
                        label={t('pdf.stamp.format')}
                        value={customTemplate ? 'custom' : (numbers.template as (typeof TEMPLATES)[number])}
                        onChange={(value: string) => {
                          if (value === 'custom') setCustomTemplate(true)
                          else {
                            setCustomTemplate(false)
                            setN({ template: value })
                          }
                        }}
                        options={[
                          ...TEMPLATES.map((template) => ({ value: template as string, label: pageNumberLabel(template, 3, 12) })),
                          { value: 'custom', label: t('pdf.stamp.custom') },
                        ]}
                      />
                      <OptionField label={t('pdf.stamp.startAt')}>
                        <Input
                          value={numbers.start}
                          inputMode="numeric"
                          onChange={(event) => setN({ start: Math.max(0, Number(event.target.value.replace(/\D/g, '')) || 0) })}
                          className="h-8 tabular-nums"
                        />
                      </OptionField>
                      {customTemplate && (
                        <OptionField label={t('pdf.stamp.customLabel')} className="@[520px]:col-span-2">
                          <Input value={numbers.template} onChange={(event) => setN({ template: event.target.value })} className="h-8 font-mono text-xs" />
                        </OptionField>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 @[520px]:grid-cols-2">
                    <OptionField label={t('pdf.stamp.size', { value: numbers.fontSize })}>
                      <Slider value={[numbers.fontSize]} min={7} max={24} step={1} thumbLabel={t('pdf.stamp.sizeLabel')} onValueChange={([value]) => setN({ fontSize: value })} />
                    </OptionField>
                    <OptionField label={t('pdf.stamp.margin', { value: numbers.margin })}>
                      <Slider value={[numbers.margin]} min={10} max={72} step={2} thumbLabel={t('pdf.stamp.marginLabel')} onValueChange={([value]) => setN({ margin: value })} />
                    </OptionField>
                  </div>
                  <Swatches label={t('pdf.stamp.color')} colors={NUMBER_COLORS} value={numbers.color} onChange={(color) => setN({ color })} />
                </motion.div>
              )}
            </AnimatePresence>
          </PanelSection>

          <PanelSection title={t('pdf.stamp.pages')} icon={<StampIcon />}>
            <OptionField label={t('pdf.stamp.pagesLabel')}>
              <Input
                value={range}
                onChange={(event) => setRange(event.target.value)}
                placeholder={t('pdf.allPages', { count: total })}
                aria-invalid={!selection.ok || undefined}
                className="h-8 max-w-xs font-mono text-xs"
              />
              <span className={cn('text-[11px]', selection.ok ? 'text-muted-foreground' : 'text-destructive')}>
                {selection.ok ? t('pdf.stamp.pagesHint', { count: targets.length }) : rangeIssueMessage(t, selection.issue)}
              </span>
            </OptionField>
          </PanelSection>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border bg-card/70 p-3 shadow-xs @[860px]:sticky @[860px]:top-2">
          <p className="text-xs font-semibold">{t('pdf.stamp.preview')}</p>
          <div className="relative mx-auto w-full max-w-80">
            <PdfPageImage doc={doc.handle} pageNumber={preview + 1} width={info.width} height={info.height} eager alt={t('fileui.page', { index: preview + 1, total })} />
            <svg viewBox={`0 0 ${info.width} ${info.height}`} className="pointer-events-none absolute inset-0 size-full overflow-hidden" aria-hidden>
              <motion.g initial={false} animate={{ opacity: anchors.length ? watermark.opacity : 0 }} transition={{ duration: reduce ? 0 : 0.2 }}>
                {anchors.map((anchor, index) => (
                  <text
                    key={index}
                    x={anchor.x}
                    y={info.height - anchor.y}
                    transform={`rotate(${-watermark.angle} ${anchor.x} ${info.height - anchor.y})`}
                    fill={watermark.color}
                    fontSize={watermark.fontSize}
                    fontWeight={watermark.bold ? 700 : 400}
                    fontFamily="Helvetica, Arial, sans-serif"
                    style={{ whiteSpace: 'pre' }}
                  >
                    {watermark.text}
                  </text>
                ))}
              </motion.g>
              {numberPoint && (
                <text x={numberPoint.x} y={info.height - numberPoint.y} fill={numbers.color} fontSize={numbers.fontSize} fontFamily="Helvetica, Arial, sans-serif" style={{ whiteSpace: 'pre' }}>
                  {label}
                </text>
              )}
            </svg>
          </div>
          {total > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" size="icon-xs" onClick={() => setPreview((value) => Math.max(0, value - 1))} disabled={preview === 0} aria-label={t('pdf.view.previousPage')}>
                <ChevronLeftIcon />
              </Button>
              <span className="text-[11px] text-muted-foreground tabular-nums">{t('fileui.page', { index: preview + 1, total })}</span>
              <Button variant="ghost" size="icon-xs" onClick={() => setPreview((value) => Math.min(total - 1, value + 1))} disabled={preview >= total - 1} aria-label={t('pdf.view.nextPage')}>
                <ChevronRightIcon />
              </Button>
            </div>
          )}
          {!stamped && <p className="text-center text-[11px] text-muted-foreground">{t('pdf.stamp.notStamped')}</p>}
        </div>
      </div>

      {error && <PanelError message={error} />}

      <ActionBar>
        <Button onClick={() => void apply()} disabled={busy || !enabled || !selection.ok || !targets.length} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <StampIcon aria-hidden />}
          {t('pdf.stamp.apply', { count: targets.length })}
        </Button>
      </ActionBar>
    </div>
  )
}
