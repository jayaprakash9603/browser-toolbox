import { useState } from 'react'
import { motion } from 'motion/react'
import { ChevronLeftIcon, ChevronRightIcon, LockIcon, UnlockIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { hslToRgb, rgbToHex, rgbToHsl, type Hsl } from '@/core/engines/color'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { Slider } from '@/shared/components/ui/slider'
import { cn } from '@/shared/utils/cn'
import { EASE_OUT, useColorLabels } from './labels'
import { DARK_TEXT, LIGHT_TEXT, buildScale, formatCmyk, formatColor, hexToRgb, ratioBetween, type Swatch } from './paletteModel'
import { LevelBadge } from './parts'

interface InspectPanelProps {
  swatch: Swatch
  index: number
  count: number
  onChange: (hex: string, transient?: boolean) => void
  onCommit: () => void
  onMove: (direction: -1 | 1) => void
  onToggleLock: () => void
}

export function InspectPanel({ swatch, index, count, onChange, onCommit, onMove, onToggleLock }: InspectPanelProps) {
  const { t } = useTranslation()
  const labels = useColorLabels()
  const [dragging, setDragging] = useState<Hsl | null>(null)
  const hsl = dragging ?? rgbToHsl(hexToRgb(swatch.hex))
  const role = labels.role(index)

  const values = [
    { label: 'HEX', value: swatch.hex.toUpperCase() },
    { label: 'RGB', value: formatColor(swatch.hex, 'rgb') },
    { label: 'HSL', value: formatColor(swatch.hex, 'hsl') },
    { label: 'OKLCH', value: formatColor(swatch.hex, 'oklch') },
    { label: 'CMYK', value: formatCmyk(swatch.hex) },
  ]

  const update = (patch: Partial<Hsl>) => {
    const next = { ...hsl, ...patch }
    setDragging(next)
    onChange(rgbToHex(hslToRgb(next)), true)
  }
  const finish = () => {
    setDragging(null)
    onCommit()
  }

  const sliders: { key: keyof Hsl; max: number; unit: string; track: string }[] = [
    {
      key: 'h',
      max: 359,
      unit: '°',
      track: `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map((h) => `hsl(${h} ${hsl.s}% ${hsl.l}%)`).join(', ')})`,
    },
    { key: 's', max: 100, unit: '%', track: `linear-gradient(to right, hsl(${hsl.h} 0% ${hsl.l}%), hsl(${hsl.h} 100% ${hsl.l}%))` },
    {
      key: 'l',
      max: 100,
      unit: '%',
      track: `linear-gradient(to right, hsl(${hsl.h} ${hsl.s}% 0%), hsl(${hsl.h} ${hsl.s}% 50%), hsl(${hsl.h} ${hsl.s}% 100%))`,
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-3 shadow-xs @[480px]:p-4">
        <header className="flex items-center gap-3">
          <motion.span
            className="size-12 shrink-0 rounded-xl border border-black/10 shadow-inner dark:border-white/10"
            initial={false}
            animate={{ backgroundColor: swatch.hex }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{role}</p>
            <h2 className="truncate text-sm font-semibold">{labels.name(swatch.hex)}</h2>
            <p className="font-mono text-xs text-muted-foreground uppercase">{swatch.hex}</p>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" onClick={() => onMove(-1)} disabled={index === 0} aria-label={t('pg.moveLeft')} title={t('pg.moveLeft')}>
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onMove(1)}
              disabled={index === count - 1}
              aria-label={t('pg.moveRight')}
              title={t('pg.moveRight')}
            >
              <ChevronRightIcon />
            </Button>
            <Button
              variant={swatch.locked ? 'secondary' : 'ghost'}
              size="icon-sm"
              onClick={onToggleLock}
              aria-pressed={swatch.locked}
              aria-label={swatch.locked ? t('pg.unlock', { role }) : t('pg.lock', { role })}
              title={swatch.locked ? t('pg.unlock', { role }) : t('pg.lock', { role })}
            >
              {swatch.locked ? <LockIcon /> : <UnlockIcon />}
            </Button>
          </div>
        </header>

        <dl className="grid grid-cols-1 gap-1 @[480px]:grid-cols-2">
          {values.map((row) => (
            <div key={row.label} className="flex items-center gap-2 rounded-lg border bg-background/60 py-0.5 pr-0.5 pl-2.5">
              <dt className="w-12 shrink-0 text-[10px] font-semibold tracking-wide text-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 flex-1 truncate font-mono text-xs">{row.value}</dd>
              <CopyButton text={row.value} label={t('pg.copyValue', { format: row.label })} />
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-3 shadow-xs @[480px]:p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t('pg.inspect.adjust')}</h3>
          {swatch.locked && <span className="text-[11px] text-muted-foreground">{t('pg.inspect.lockedHint')}</span>}
        </div>
        <div className="flex flex-col gap-3">
          {sliders.map((slider) => (
            <div key={slider.key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-muted-foreground">{t(`pg.inspect.${slider.key}`)}</span>
                <span className="font-mono tabular-nums">
                  {Math.round(hsl[slider.key])}
                  {slider.unit}
                </span>
              </div>
              <div className="h-2 rounded-full border border-black/5 dark:border-white/10" style={{ background: slider.track }} aria-hidden />
              <Slider
                min={0}
                max={slider.max}
                step={1}
                value={[hsl[slider.key]]}
                onValueChange={([value]) => update({ [slider.key]: value })}
                onValueCommit={finish}
                thumbLabel={t(`pg.inspect.${slider.key}`)}
                getValueText={(value) => `${value}${slider.unit}`}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-3 shadow-xs @[480px]:p-4">
        <h3 className="text-sm font-semibold">{t('pg.inspect.textOn')}</h3>
        <div className="grid grid-cols-2 gap-2">
          {[LIGHT_TEXT, DARK_TEXT].map((text) => {
            const ratio = ratioBetween(swatch.hex, text)
            return (
              <motion.div
                key={text}
                className="flex flex-col gap-1 rounded-xl p-3"
                initial={false}
                animate={{ backgroundColor: swatch.hex }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                style={{ color: text }}
              >
                <span className="text-2xl leading-none font-bold">Aa</span>
                <span className="text-[11px] opacity-90">{t('pg.inspect.sample')}</span>
                <span className="mt-1 flex items-center gap-1.5">
                  <span className="font-mono text-xs font-semibold tabular-nums">{ratio.toFixed(2)}:1</span>
                  <LevelBadge ratio={ratio} plain />
                </span>
              </motion.div>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border bg-card/70 p-3 shadow-xs @[480px]:p-4">
        <div>
          <h3 className="text-sm font-semibold">{t('pg.inspect.scale')}</h3>
          <p className="text-[11px] text-muted-foreground">{t('pg.inspect.scaleHint')}</p>
        </div>
        <div className="flex gap-1">
          {buildScale(swatch.hex).map((step, stepIndex) => (
            <motion.button
              key={step.step}
              type="button"
              onClick={() => onChange(step.hex)}
              aria-label={t('pg.inspect.useStep', { step: step.step, hex: step.hex })}
              title={`${step.step} · ${step.hex}`}
              className={cn(
                'relative h-11 flex-1 cursor-pointer rounded-md outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring',
                step.isBase && 'ring-2 ring-foreground/70',
              )}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, backgroundColor: step.hex }}
              whileHover={{ y: -3 }}
              transition={{ delay: stepIndex * 0.02, duration: 0.3, ease: EASE_OUT, backgroundColor: { duration: 0.35 } }}
            >
              {step.isBase && (
                <span className="absolute inset-x-0 bottom-1 mx-auto size-1.5 rounded-full" style={{ backgroundColor: ratioBetween(step.hex, LIGHT_TEXT) > 3 ? LIGHT_TEXT : DARK_TEXT }} />
              )}
            </motion.button>
          ))}
        </div>
        <div className="flex justify-between font-mono text-[9px] text-muted-foreground" aria-hidden>
          <span>50</span>
          <span>500</span>
          <span>950</span>
        </div>
      </section>
    </div>
  )
}
