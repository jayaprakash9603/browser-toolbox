import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'

import type { A11yCategory, A11yReport } from '@/core/engines/a11y'
import { cn } from '@/shared/utils/cn'

import { CATEGORY_ICON, categoryTone, PASS_ICON, SEVERITY_TONE } from './meta'

interface CategoryGridProps {
  report: A11yReport
  active: A11yCategory | null
  onSelect: (category: A11yCategory | null) => void
}

export function CategoryGrid({ report, active, onSelect }: CategoryGridProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  return (
    <div className="grid grid-cols-3 gap-1" role="group" aria-label={t('a11y.categories')}>
      {report.categories.map((summary, index) => {
        const Icon = CATEGORY_ICON[summary.id]
        const tone = categoryTone(summary)
        const applicable = tone !== 'na'
        const toneStyle = applicable ? SEVERITY_TONE[tone] : null
        const selected = active === summary.id
        const name = t(`a11y.cat.${summary.id}`)
        const status = !applicable
          ? t('a11y.cat.na')
          : summary.failed
            ? t('a11y.cat.issues', { count: summary.failed })
            : t('a11y.cat.clear')
        return (
          <motion.button
            key={summary.id}
            type="button"
            aria-pressed={selected}
            title={`${name}: ${status}`}
            onClick={() => onSelect(selected ? null : summary.id)}
            initial={reduce ? false : { opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.035, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            whileHover={reduce ? undefined : { y: -1 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            className={cn(
              'group/tile relative flex min-w-0 cursor-pointer flex-col gap-1 overflow-hidden rounded-lg border bg-card p-1.5 text-left outline-none transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/40 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring',
              selected && 'border-primary/60 bg-primary/5 ring-1 ring-primary/40',
              !applicable && 'opacity-55',
            )}
          >
            <span className="flex items-center justify-between gap-1">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-lg transition-transform duration-200 group-hover/tile:scale-110 motion-reduce:transition-none',
                  toneStyle ? cn(toneStyle.soft, toneStyle.text) : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </span>
              {applicable &&
                (summary.failed ? (
                  <span className={cn('text-xs font-semibold tabular-nums', toneStyle?.text)}>{summary.failed}</span>
                ) : (
                  <PASS_ICON className={cn('size-3.5', SEVERITY_TONE.pass.text)} aria-hidden />
                ))}
            </span>
            <span className="truncate text-xs leading-tight font-medium">{name}</span>
            <span className="sr-only">{status}</span>
            <span className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
              {applicable && (
                <motion.span
                  className={cn('block h-full origin-left rounded-full', toneStyle?.bar)}
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={{ scaleX: summary.score / 100 }}
                  transition={{ delay: 0.2 + index * 0.035, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
