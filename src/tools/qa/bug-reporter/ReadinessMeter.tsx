import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { CheckIcon, CircleIcon } from 'lucide-react'

import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/utils/cn'
import { READINESS_CHECKS, type ReadinessCheck } from './report'

const LEVEL_FILL = {
  low: 'bg-amber-500',
  good: 'bg-primary',
  complete: 'bg-emerald-500',
} as const

export function ReadinessMeter({ checks }: { checks: Record<ReadinessCheck, boolean> }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const done = READINESS_CHECKS.filter((check) => checks[check]).length
  const total = READINESS_CHECKS.length
  const level = done === total ? 'complete' : done >= 3 ? 'good' : 'low'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('bugReporter.readiness.label', { done, total })}
          className="flex h-8 min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-0.5" aria-hidden>
            {READINESS_CHECKS.map((check, index) => (
              <span key={check} className="h-1.5 w-2.5 overflow-hidden rounded-full bg-muted">
                <motion.span
                  className={cn('block size-full origin-left rounded-full', LEVEL_FILL[level])}
                  initial={false}
                  animate={{ scaleX: index < done ? 1 : 0 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 420, damping: 30, delay: index * 0.03 }
                  }
                />
              </span>
            ))}
          </span>
          <span className="text-[11px] font-medium whitespace-nowrap text-muted-foreground tabular-nums">
            {t(`bugReporter.readiness.${level}`)}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-64 p-2">
        <p className="px-1.5 pt-0.5 pb-1.5 text-xs font-semibold">
          {t('bugReporter.readiness.title', { done, total })}
        </p>
        <ul className="flex flex-col gap-0.5">
          {READINESS_CHECKS.map((check) => (
            <li
              key={check}
              className={cn(
                'flex items-center gap-2 rounded-md px-1.5 py-1 text-xs',
                checks[check] ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {checks[check] ? (
                <CheckIcon className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <CircleIcon className="size-3.5 shrink-0 opacity-50" aria-hidden />
              )}
              <span className={cn(checks[check] && 'line-through decoration-muted-foreground/40')}>
                {t(`bugReporter.readiness.check.${check}`)}
              </span>
              <span className="sr-only">
                {checks[check] ? t('bugReporter.readiness.done') : t('bugReporter.readiness.todo')}
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
