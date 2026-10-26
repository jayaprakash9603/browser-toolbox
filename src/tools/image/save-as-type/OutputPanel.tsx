import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckIcon, GaugeIcon, PaintBucketIcon, PlusIcon, ScalingIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { IMAGE_MAX_SIZES, type SaveImageAsState } from '@/core/imageConvert'
import { PanelSection } from '@/shared/components/toolkit'
import { Slider } from '@/shared/components/ui/slider'
import { cn } from '@/shared/utils/cn'

import { BACKGROUND_SWATCHES, CHECKERBOARD, EASE_OUT, QUALITY_PRESETS, qualityTier } from './formatMeta'

interface PanelProps {
  state: SaveImageAsState
  patch: (next: Partial<SaveImageAsState>) => unknown
}

const SIZE_HINT: Partial<Record<number, string>> = { 3840: '4K', 1920: 'Full HD', 1280: 'HD' }

export function OutputPanel({ state, patch }: PanelProps) {
  return (
    <>
      <QualitySection state={state} patch={patch} />
      <SizeSection state={state} patch={patch} />
      <BackgroundSection state={state} patch={patch} />
    </>
  )
}

function QualitySection({ state, patch }: PanelProps) {
  const { t } = useTranslation()
  const stored = Math.round(state.quality * 100)
  const [draft, setDraft] = useState<number | null>(null)
  const value = draft ?? stored
  const tier = qualityTier(value)

  const commit = (next: number) => {
    setDraft(null)
    if (next !== stored) patch({ quality: next / 100 })
  }

  return (
    <PanelSection
      title={t('sia.quality.title')}
      icon={<GaugeIcon />}
      actions={
        <div className="flex items-center gap-2">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={tier}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
            >
              {t(`sia.quality.tier.${tier}`)}
            </motion.span>
          </AnimatePresence>
          <span className="w-11 text-right font-mono text-sm font-semibold tabular-nums">{value}%</span>
        </div>
      }
    >
      <Slider
        value={[value]}
        min={10}
        max={100}
        step={1}
        onValueChange={([next]) => setDraft(next)}
        onValueCommit={([next]) => commit(next)}
        thumbLabel={t('sia.quality.title')}
        getValueText={(v) => `${v}%`}
      />
      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label={t('sia.quality.presets')}>
        {QUALITY_PRESETS.map((preset) => {
          const active = value === preset.value
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => commit(preset.value)}
              className={cn(
                'relative flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-lg border px-1 py-1 outline-none transition-[border-color,color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]',
                active ? 'border-transparent text-primary' : 'text-foreground/80 hover:border-foreground/20 hover:bg-accent',
              )}
            >
              {active && (
                <motion.span
                  layoutId="sia-quality-preset"
                  className="absolute inset-0 rounded-lg bg-primary/10 ring-[1.5px] ring-primary/60"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  aria-hidden
                />
              )}
              <span className="relative text-[11px] font-semibold">{t(`sia.quality.tier.${preset.id}`)}</span>
              <span className="relative font-mono text-[10px] tabular-nums text-muted-foreground">{preset.value}%</span>
            </button>
          )
        })}
      </div>
      <p className="text-[11px] leading-4 text-muted-foreground">{t('sia.quality.hint')}</p>
    </PanelSection>
  )
}

function SizeSection({ state, patch }: PanelProps) {
  const { t } = useTranslation()
  return (
    <PanelSection title={t('sia.size.title')} icon={<ScalingIcon />}>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('sia.size.title')}>
        {IMAGE_MAX_SIZES.map((size) => {
          const active = state.maxSize === size
          return (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => patch({ maxSize: size })}
              className={cn(
                'relative inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border px-2.5 text-xs font-medium outline-none transition-[border-color,color] duration-150 focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'border-transparent text-primary' : 'text-foreground/80 hover:border-foreground/20 hover:bg-accent',
              )}
            >
              {active && (
                <motion.span
                  layoutId="sia-size"
                  className="absolute inset-0 rounded-lg bg-primary/10 ring-[1.5px] ring-primary/60"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  aria-hidden
                />
              )}
              <span className="relative font-mono tabular-nums">{size === 0 ? t('sia.size.original') : `${size}px`}</span>
              {SIZE_HINT[size] && <span className="relative text-[10px] text-muted-foreground">{SIZE_HINT[size]}</span>}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] leading-4 text-muted-foreground">{t('sia.size.hint')}</p>
    </PanelSection>
  )
}

function BackgroundSection({ state, patch }: PanelProps) {
  const { t } = useTranslation()
  const colorId = useId()
  const [custom, setCustom] = useState<string | null>(null)
  const color = custom ?? state.background
  const isPreset = (BACKGROUND_SWATCHES as readonly string[]).includes(color)

  useEffect(() => {
    if (custom == null || custom === state.background) return
    const timer = setTimeout(() => patch({ background: custom }), 350)
    return () => clearTimeout(timer)
  }, [custom, state.background, patch])

  const pick = (hex: string) => {
    setCustom(null)
    patch({ background: hex })
  }

  return (
    <PanelSection title={t('sia.background.title')} icon={<PaintBucketIcon />}>
      <div className="flex items-center gap-3">
        <div className={cn('relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border shadow-inner', CHECKERBOARD)} aria-hidden>
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2"
            animate={{ backgroundColor: color }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
          />
          <span className="absolute inset-y-2 left-1/2 w-px bg-foreground/20" />
        </div>
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t('sia.background.title')}>
          {BACKGROUND_SWATCHES.map((hex) => {
            const active = color === hex
            return (
              <button
                key={hex}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={t(`sia.background.swatch.${hex.slice(1)}`)}
                title={t(`sia.background.swatch.${hex.slice(1)}`)}
                onClick={() => pick(hex)}
                className={cn(
                  'relative flex size-9 cursor-pointer items-center justify-center rounded-full border shadow-xs outline-none transition-transform duration-150 hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95',
                  active && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
                style={{ backgroundColor: hex }}
              >
                <AnimatePresence>
                  {active && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex">
                      <CheckIcon className={cn('size-3.5', hex === '#ffffff' || hex === '#f4f4f5' ? 'text-zinc-900' : 'text-white')} strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )
          })}
          <label
            htmlFor={colorId}
            title={t('sia.background.custom')}
            className={cn(
              'relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed text-muted-foreground transition-transform duration-150 hover:scale-110 focus-within:ring-2 focus-within:ring-ring',
              !isPreset && 'border-solid ring-2 ring-primary ring-offset-2 ring-offset-background',
            )}
            style={!isPreset ? { backgroundColor: color } : undefined}
          >
            {isPreset && <PlusIcon className="size-3.5" aria-hidden />}
            <span className="sr-only">{t('sia.background.custom')}</span>
            <input
              id={colorId}
              type="color"
              value={color}
              onChange={(e) => setCustom(e.target.value.toLowerCase())}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <span className="font-mono text-[11px] uppercase tabular-nums text-muted-foreground">{color}</span>
        </div>
      </div>
      <p className="text-[11px] leading-4 text-muted-foreground">{t('sia.background.hint')}</p>
    </PanelSection>
  )
}
