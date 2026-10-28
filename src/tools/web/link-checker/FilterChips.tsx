import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { AlertOctagonIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { HEALTH_FILTERS, type HealthFilter } from '@/core/engines/linkChecker/report'
import { cn } from '@/shared/utils/cn'

import { HEALTH_META } from './meta'

interface FilterChipsProps {
  value: HealthFilter
  onChange: (value: HealthFilter) => void
  counts: Record<HealthFilter, number>
}

export function FilterChips({ value, onChange, counts }: FilterChipsProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const groupId = useId()
  const items = HEALTH_FILTERS.filter((item) => item === 'all' || item === value || counts[item] > 0)

  return (
    <div role="group" aria-label={t('linkChecker.filtersLabel')} className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const selected = item === value
        const meta = item === 'all' || item === 'problems' ? null : HEALTH_META[item]
        return (
          <button
            key={item}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(item)}
            className={cn(
              'relative inline-flex h-7 cursor-pointer items-center rounded-full border px-2.5 text-xs font-medium whitespace-nowrap outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
              selected
                ? 'border-primary/50 text-primary'
                : 'border-border bg-background text-foreground/80 hover:bg-accent hover:text-foreground',
              !selected && item === 'problems' && 'text-red-700 dark:text-red-400',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`link-filter-${groupId}`}
                aria-hidden
                className="absolute inset-0 rounded-full bg-primary/10"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {meta && <span className={cn('size-2 shrink-0 rounded-full', meta.solid)} aria-hidden />}
              {item === 'problems' && <AlertOctagonIcon className="size-3 shrink-0" aria-hidden />}
              {item === 'all' || item === 'problems' ? t(`linkChecker.filter.${item}`) : t(`linkChecker.health.${item}`)}
              <span className="tabular-nums opacity-70">{counts[item].toLocaleString()}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
