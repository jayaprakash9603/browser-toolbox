import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { BarcodeIcon, PaletteIcon, SlidersHorizontalIcon, SparklesIcon } from 'lucide-react'

import type { BarcodeFormat } from '@/core/engines/barcode'
import { PanelSection } from '@/shared/components/toolkit'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Segmented } from '@/shared/components/ui/segmented'
import { Slider } from '@/shared/components/ui/slider'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

import { BARCODE_FORMATS, BARCODE_SAMPLES, type BarcodeStyle } from './barcodeModel'

interface BarcodePanelProps {
  format: BarcodeFormat
  onFormat: (format: BarcodeFormat) => void
  value: string
  onValue: (value: string) => void
  style: BarcodeStyle
  onStyle: (patch: Partial<BarcodeStyle>) => void
}

export function BarcodePanel({ format, onFormat, value, onValue, style, onStyle }: BarcodePanelProps) {
  const { t } = useTranslation()
  const inputId = useId()

  return (
    <div className="flex flex-col gap-3">
      <PanelSection title={t('qrk.barcode.contentTitle')} icon={<BarcodeIcon className="size-4" />}>
        <div className="flex flex-col gap-3">
          <Segmented
            ariaLabel={t('qrk.barcode.formatLabel')}
            value={format}
            onValueChange={(next) => onFormat(next as BarcodeFormat)}
            size="sm"
            className="w-full"
            options={BARCODE_FORMATS.map((entry) => ({
              value: entry,
              label: t(`qrk.barcode.format.${entry}`),
            }))}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={inputId}>{t('qrk.barcode.value')}</Label>
            <Input
              id={inputId}
              value={value}
              onChange={(e) => onValue(e.target.value)}
              placeholder={t(`qrk.barcode.placeholder.${format}`)}
              className="font-mono text-sm"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="w-full text-[11px] text-muted-foreground">{t('qrk.barcode.samples')}</span>
            {BARCODE_FORMATS.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => {
                  onFormat(entry)
                  onValue(BARCODE_SAMPLES[entry])
                }}
                className={cn(
                  'cursor-pointer rounded-full border bg-background/70 px-2 py-0.5 font-mono text-[10px] tabular-nums transition-colors hover:bg-accent',
                  entry === format && 'border-primary/40 text-primary',
                )}
              >
                {t(`qrk.barcode.format.${entry}`)}
              </button>
            ))}
          </div>
        </div>
      </PanelSection>

      <PanelSection title={t('qrk.barcode.styleTitle')} icon={<SlidersHorizontalIcon className="size-4" />}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <ColorField label={t('qrk.barcode.ink')} value={style.lineColor} onChange={(lineColor) => onStyle({ lineColor })} />
            <ColorField
              label={t('qrk.barcode.paper')}
              value={style.background}
              onChange={(background) => onStyle({ background })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span>{t('qrk.barcode.barHeight')}</span>
              <span className="font-mono tabular-nums">{style.height}px</span>
            </div>
            <Slider value={[style.height]} min={40} max={120} step={4} onValueChange={([height]) => onStyle({ height })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span>{t('qrk.barcode.moduleWidth')}</span>
              <span className="font-mono tabular-nums">{style.moduleWidth}px</span>
            </div>
            <Slider
              value={[style.moduleWidth]}
              min={1}
              max={4}
              step={1}
              onValueChange={([moduleWidth]) => onStyle({ moduleWidth })}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 px-2.5 py-2">
            <Label htmlFor="barcode-label" className="text-xs font-medium">
              {t('qrk.barcode.showLabel')}
            </Label>
            <Switch id="barcode-label" checked={style.displayValue} onCheckedChange={(displayValue) => onStyle({ displayValue })} />
          </div>
        </div>
      </PanelSection>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground"
      >
        <SparklesIcon className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
        <p>{t(`qrk.barcode.hint.${format}`)}</p>
      </motion.div>
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2 rounded-lg border bg-background/60 px-2 py-1">
        <PaletteIcon className="size-3.5 text-muted-foreground" aria-hidden />
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <span className="font-mono text-[11px] tabular-nums">{value}</span>
      </div>
    </div>
  )
}
