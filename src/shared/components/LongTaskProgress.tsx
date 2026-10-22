import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CheckIcon, LoaderCircleIcon, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { formatElapsedSeconds } from '@/shared/utils/formatElapsedSeconds'
import { cn } from '@/shared/utils/cn'

export type LongTaskStepState = 'done' | 'current' | 'todo'

export interface LongTaskStep {
  id: string
  label: ReactNode
  state: LongTaskStepState
}

export type LongTaskLayout = 'auto' | 'compact' | 'expanded'

export interface LongTaskProgressProps {
  active: boolean
  title: ReactNode
  /** Omit or pass `null` for an indeterminate progress bar. */
  percent?: number | null
  detail: ReactNode
  detailKey?: string
  startedAt?: number
  centerIcon: LucideIcon
  flyingIcons?: LucideIcon[]
  steps?: LongTaskStep[]
  hint?: ReactNode
  onCancel?: () => void
  cancelLabel?: string
  layout?: LongTaskLayout
  className?: string
}

function useElapsedSeconds(active: boolean, startedAt?: number): number {
  const [elapsed, setElapsed] = useState(0)
  const localStart = useRef(0)

  useEffect(() => {
    if (!active) {
      setElapsed(0)
      return undefined
    }
    localStart.current = startedAt ?? Date.now()
    const tick = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - localStart.current) / 1000)))
    tick()
    const clock = window.setInterval(tick, 1000)
    return () => window.clearInterval(clock)
  }, [active, startedAt])

  return elapsed
}

export function LongTaskProgress({
  active,
  title,
  percent = 0,
  detail,
  detailKey,
  startedAt,
  centerIcon: CenterIcon,
  flyingIcons = [],
  steps,
  hint,
  onCancel,
  cancelLabel,
  layout = 'auto',
  className,
}: LongTaskProgressProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const elapsed = useElapsedSeconds(active, startedAt)
  const indeterminate = percent == null
  const safePercent = indeterminate ? 0 : Math.min(100, Math.max(0, percent))
  const remaining =
    !indeterminate && safePercent >= 5 && elapsed >= 3
      ? Math.max(1, Math.round((elapsed * (100 - safePercent)) / safePercent))
      : null

  const showSteps = steps && steps.length > 0 && layout !== 'compact'
  const showFlying = flyingIcons.length > 0 && layout !== 'compact'

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={cn(
            'overflow-hidden rounded-lg border border-primary/20 bg-primary/5',
            layout === 'compact' ? 'p-2.5' : 'p-3',
            className,
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'relative flex shrink-0 items-center justify-center',
                layout === 'compact' ? 'size-9' : 'size-11',
              )}
            >
              {!reduce &&
                showFlying &&
                flyingIcons.map((Icon, index) => (
                  <motion.span
                    key={index}
                    className="absolute text-primary/70"
                    initial={{ x: -18, y: -14 + index * 14, opacity: 0, scale: 0.6 }}
                    animate={{ x: 0, y: 0, opacity: [0, 1, 0], scale: [0.6, 0.9, 0.4] }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      delay: index * 0.45,
                      ease: 'easeInOut',
                    }}
                    aria-hidden
                  >
                    <Icon className="size-3.5" />
                  </motion.span>
                ))}
              <motion.span
                className={cn(
                  'relative flex items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm',
                  layout === 'compact' ? 'size-8' : 'size-9',
                )}
                animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden
              >
                <CenterIcon className={layout === 'compact' ? 'size-4' : 'size-4.5'} />
              </motion.span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold">{title}</p>
                {!indeterminate && (
                  <span className="text-sm font-semibold tabular-nums text-primary">{safePercent}%</span>
                )}
              </div>
              <div className="relative h-4 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={detailKey ?? String(detail)}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-x-0 truncate text-[11px] text-muted-foreground"
                  >
                    {detail}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-primary/15">
            <motion.div
              className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-primary"
              initial={{ width: indeterminate ? '35%' : '0%' }}
              animate={
                indeterminate
                  ? { width: ['28%', '72%', '38%'], x: ['0%', '8%', '0%'] }
                  : { width: `${Math.max(safePercent, 3)}%` }
              }
              transition={
                indeterminate
                  ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: reduce ? 0 : 0.35, ease: 'easeOut' }
              }
            >
              {!reduce && !indeterminate && (
                <motion.span
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </motion.div>
          </div>

          <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-muted-foreground">
            <span>{t('longTask.elapsed', { time: formatElapsedSeconds(elapsed) })}</span>
            <span>
              {indeterminate
                ? t('longTask.working')
                : remaining != null
                  ? t('longTask.remaining', { time: formatElapsedSeconds(remaining) })
                  : t('longTask.estimating')}
            </span>
          </div>

          {showSteps && (
            <ol
              className={cn(
                'mt-2.5 grid gap-x-3 gap-y-1',
                layout === 'expanded' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2',
              )}
            >
              {steps!.map((step) => (
                <li
                  key={step.id}
                  className={cn(
                    'flex items-center gap-1.5 text-[11px]',
                    step.state === 'todo' ? 'text-muted-foreground/60' : 'text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-3.5 shrink-0 items-center justify-center rounded-full',
                      step.state === 'done' && 'bg-primary text-primary-foreground',
                      step.state === 'current' && 'text-primary',
                      step.state === 'todo' && 'border border-muted-foreground/30',
                    )}
                    aria-hidden
                  >
                    {step.state === 'done' && <CheckIcon className="size-2.5" />}
                    {step.state === 'current' && (
                      <LoaderCircleIcon className={cn('size-3.5', !reduce && 'animate-spin')} />
                    )}
                  </span>
                  {step.label}
                </li>
              ))}
            </ol>
          )}

          {(hint || onCancel) && (
            <div className="mt-2.5 flex items-center gap-2 rounded-md bg-background/70 px-2 py-1.5">
              {hint && (
                <p className="min-w-0 flex-1 text-[10px] leading-snug text-muted-foreground">{hint}</p>
              )}
              {onCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 px-2 text-[11px]"
                  onClick={onCancel}
                >
                  {cancelLabel ?? t('common.cancel')}
                </Button>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
