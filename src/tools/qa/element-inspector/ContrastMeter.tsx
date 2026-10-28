import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import type { ContrastResult } from '@/core/engines/color'
import { cn } from '@/shared/utils/cn'

const MAX_RATIO = 21

function markerPct(ratio: number): number {
  return Math.min(100, (ratio / MAX_RATIO) * 100)
}

export function ContrastMeter({
  contrast,
  foreground,
  background,
}: {
  contrast: ContrastResult | null
  foreground?: string
  background?: string
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  if (!contrast) {
    return (
      <p className="text-[11px] leading-4 text-muted-foreground">{t('inspectorEl.contrastNone')}</p>
    )
  }

  const pct = markerPct(contrast.ratio)
  const tone = contrast.aaNormal
    ? 'bg-emerald-500'
    : contrast.aaLarge
      ? 'bg-amber-500'
      : 'bg-destructive'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-semibold tabular-nums leading-none">
          {contrast.ratio}
          <span className="ml-0.5 text-[11px] font-medium text-muted-foreground">:1</span>
        </p>
        <div className="flex items-center gap-1">
          {foreground && background && (
            <span
              className="inline-flex size-5 items-center justify-center rounded border text-[9px] font-semibold"
              style={{ color: foreground, backgroundColor: background }}
              aria-hidden
            >
              Aa
            </span>
          )}
          <span
            className={cn(
              'rounded-full px-1.5 py-px text-[10px] font-medium',
              contrast.aaNormal
                ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                : 'bg-destructive/10 text-destructive',
            )}
          >
            {t('inspectorEl.aa')} {contrast.aaNormal ? t('inspectorEl.pass') : t('inspectorEl.fail')}
          </span>
          <span
            className={cn(
              'rounded-full px-1.5 py-px text-[10px] font-medium',
              contrast.aaaNormal
                ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {t('inspectorEl.aaa')} {contrast.aaaNormal ? t('inspectorEl.pass') : t('inspectorEl.fail')}
          </span>
        </div>
      </div>
      <div
        className="relative h-2.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuemin={1}
        aria-valuemax={MAX_RATIO}
        aria-valuenow={Number(contrast.ratio.toFixed(2))}
        aria-label={t('inspectorEl.contrast')}
      >
        <motion.span
          className={cn('absolute inset-y-0 left-0 rounded-full', tone)}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        />
        <span
          className="absolute inset-y-0 w-px bg-foreground/50"
          style={{ left: `${markerPct(4.5)}%` }}
          title="AA 4.5:1"
        />
        <span
          className="absolute inset-y-0 w-px bg-foreground/30"
          style={{ left: `${markerPct(7)}%` }}
          title="AAA 7:1"
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        AA 4.5:1 · AAA 7:1 · large text AA 3:1
      </p>
    </div>
  )
}
