import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { FeatherIcon, GaugeIcon, LoaderCircleIcon, Minimize2Icon, ScaleIcon, TriangleAlertIcon, ZapIcon, type LucideIcon } from 'lucide-react'

import { formatBytes } from '@/core/engines/image'
import { assemblePdf, optimizePdf, type PageSpec } from '@/core/engines/pdf/edit'
import { canvasToBlob, renderPdfPage } from '@/core/engines/pdf/pdfjs'
import { ActionBar, OptionSwitch, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { pdfArtifact, sourceOf, stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

type Level = 'lossless' | 'balanced' | 'strong'

const LEVELS: Record<Level, { icon: LucideIcon; dpi?: number; quality?: number }> = {
  lossless: { icon: FeatherIcon },
  balanced: { icon: ScaleIcon, dpi: 150, quality: 0.75 },
  strong: { icon: ZapIcon, dpi: 110, quality: 0.55 },
}

async function rasterPage(canvas: HTMLCanvasElement, grayscale: boolean, quality: number): Promise<Uint8Array> {
  let output = canvas
  if (grayscale) {
    output = document.createElement('canvas')
    output.width = canvas.width
    output.height = canvas.height
    const context = output.getContext('2d')
    if (!context) throw new Error('Canvas is not available in this browser.')
    context.filter = 'grayscale(1)'
    context.drawImage(canvas, 0, 0)
  }
  const blob = await canvasToBlob(output, 'image/jpeg', quality)
  canvas.width = 0
  output.width = 0
  return new Uint8Array(await blob.arrayBuffer())
}

export function CompressPanel() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const [level, setLevel] = useState<Level>('balanced')
  const [grayscale, setGrayscale] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [last, setLast] = useState<{ before: number; after: number } | null>(null)
  const { busy, error, run } = useTask()
  const raster = level !== 'lossless'

  const compress = () =>
    run(async () => {
      let bytes: Uint8Array
      const { dpi, quality } = LEVELS[level]
      if (dpi && quality) {
        const specs: PageSpec[] = []
        setProgress({ done: 0, total: doc.pages.length })
        for (const [index, info] of doc.pages.entries()) {
          const canvas = await renderPdfPage(doc.handle, index + 1, { scale: dpi / 72 })
          specs.push({ kind: 'image', bytes: await rasterPage(canvas, grayscale, quality), format: 'jpg', width: info.width, height: info.height })
          setProgress({ done: index + 1, total: doc.pages.length })
        }
        bytes = await assemblePdf([sourceOf(doc)], specs, { metadataFrom: 0 })
      } else {
        bytes = await optimizePdf(sourceOf(doc))
      }
      setProgress(null)
      setLast({ before: doc.bytes.length, after: bytes.length })
      const larger = bytes.length >= doc.bytes.length
      showResults({
        artifacts: [
          pdfArtifact(`${stemOf(doc)}-compressed.pdf`, bytes, {
            source: { name: doc.name, size: doc.bytes.length },
            note: larger ? t('pdf.compress.noGain') : raster ? t('pdf.compress.rasterNote') : t('pdf.compress.losslessNote'),
          }),
        ],
      })
    }).finally(() => setProgress(null))

  const saved = last ? 1 - last.after / last.before : 0

  return (
    <div className="flex flex-col gap-3">
      <PanelSection title={t('pdf.compress.levelTitle')} icon={<GaugeIcon />}>
        <div role="radiogroup" aria-label={t('pdf.compress.levelTitle')} className="grid gap-2 @[560px]:grid-cols-3">
          {(Object.keys(LEVELS) as Level[]).map((value) => {
            const Icon = LEVELS[value].icon
            const active = value === level
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setLevel(value)}
                className={cn(
                  'relative flex cursor-pointer items-start gap-2.5 rounded-xl border bg-background/60 p-3 text-left outline-none transition-[border-color,background-color] hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring',
                  active && 'border-transparent',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="pdf-compress-level"
                    className="absolute inset-0 rounded-xl bg-primary/[0.06] ring-[1.5px] ring-primary/70"
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    'relative flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors [&_svg]:size-4',
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                  aria-hidden
                >
                  <Icon />
                </span>
                <span className="relative flex min-w-0 flex-col gap-0.5">
                  <span className="text-xs font-semibold">{t(`pdf.compress.${value}`)}</span>
                  <span className="text-[11px] leading-snug text-muted-foreground">{t(`pdf.compress.${value}Hint`)}</span>
                </span>
              </button>
            )
          })}
        </div>
        <AnimatePresence initial={false}>
          {raster && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-2 overflow-hidden"
            >
              <OptionSwitch label={t('pdf.compress.grayscale')} hint={t('pdf.compress.grayscaleHint')} checked={grayscale} onChange={setGrayscale} />
              <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
                <TriangleAlertIcon className="mt-px size-3.5 shrink-0" aria-hidden />
                {t('pdf.compress.rasterWarning')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </PanelSection>

      <AnimatePresence>
        {last && (
          <motion.div initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <PanelSection title={t('pdf.compress.resultTitle')} icon={<Minimize2Icon />}>
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <div className="flex flex-col">
                  <span className={cn('text-3xl font-bold tracking-tight tabular-nums', saved > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                    {saved > 0 ? `−${Math.round(saved * 100)}%` : '0%'}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{saved > 0 ? t('pdf.compress.saved', { size: formatBytes(last.before - last.after) }) : t('pdf.compress.noGainShort')}</span>
                </div>
                <div className="flex min-w-48 flex-1 flex-col gap-2 text-[11px]">
                  {[
                    { label: t('pdf.compress.before'), size: last.before, ratio: 1, tone: 'bg-muted-foreground/40' },
                    { label: t('pdf.compress.after'), size: last.after, ratio: Math.min(1, last.after / last.before), tone: 'bg-gradient-to-r from-[var(--hero-from)] to-[var(--hero-to)]' },
                  ].map((bar, index) => (
                    <div key={bar.label} className="flex items-center gap-2">
                      <span className="w-12 shrink-0 text-muted-foreground">{bar.label}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className={cn('h-full rounded-full', bar.tone)}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(2, bar.ratio * 100)}%` }}
                          transition={{ duration: reduce ? 0 : 0.8, delay: index * 0.15, ease: [0.2, 0.8, 0.2, 1] }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right font-medium tabular-nums">{formatBytes(bar.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </PanelSection>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <PanelError message={error} />}

      <ActionBar progress={progress ? progress.done / progress.total : null}>
        <Button onClick={() => void compress()} disabled={busy} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <Minimize2Icon aria-hidden />}
          {progress ? t('pdf.compress.progress', { done: progress.done, total: progress.total }) : t('pdf.compress.run')}
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums" role="status" aria-live="polite">
          {t('pdf.compress.current', { size: formatBytes(doc.bytes.length) })}
        </span>
      </ActionBar>
    </div>
  )
}
