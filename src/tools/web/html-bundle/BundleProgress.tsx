import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  CheckIcon,
  FileArchiveIcon,
  FileCodeIcon,
  FileTextIcon,
  ImageIcon,
  LoaderCircleIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  BUNDLE_PHASES as PHASES,
  overallPercent,
  type BundleProgressEvent,
} from '@/core/htmlBundleJob'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

const FLYING_ICONS = [FileTextIcon, FileCodeIcon, ImageIcon]

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`
}

interface BundleProgressProps {
  active: boolean
  pageCount: number
  progress: BundleProgressEvent | null
  startedAt?: number
  runsInBackground?: boolean
  onCancel?: () => void
}

export function BundleProgress({
  active,
  pageCount,
  progress,
  startedAt,
  runsInBackground = false,
  onCancel,
}: BundleProgressProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [elapsed, setElapsed] = useState(0)
  const localStart = useRef(0)

  useEffect(() => {
    if (!active) return undefined
    localStart.current = startedAt ?? Date.now()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - localStart.current) / 1000)))
    tick()
    const clock = window.setInterval(tick, 1000)
    return () => window.clearInterval(clock)
  }, [active, startedAt])

  const percent = overallPercent(progress)
  const phaseIndex = progress ? PHASES.findIndex((item) => item.id === progress.phase) : 0
  const remaining =
    percent >= 5 && elapsed >= 3 ? Math.max(1, Math.round((elapsed * (100 - percent)) / percent)) : null

  const detail = (() => {
    if (!progress) return t('htmlBundle.phaseStarting')
    const counts = { done: progress.done, total: progress.total }
    switch (progress.phase) {
      case 'pages':
        return t('htmlBundle.detailPages', counts)
      case 'assets':
        return progress.total > 0 ? t('htmlBundle.detailAssets', counts) : t('htmlBundle.detailAssetsScan')
      case 'zip':
        return t('htmlBundle.detailZip')
      case 'transfer':
        return t('htmlBundle.detailTransfer')
    }
  })()

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
          className="overflow-hidden rounded-lg border border-primary/20 bg-primary/5 p-3"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex size-11 shrink-0 items-center justify-center">
              {!reduce &&
                FLYING_ICONS.map((Icon, index) => (
                  <motion.span
                    key={index}
                    className="absolute text-primary/70"
                    initial={{ x: -18, y: -14 + index * 14, opacity: 0, scale: 0.6 }}
                    animate={{ x: 0, y: 0, opacity: [0, 1, 0], scale: [0.6, 0.9, 0.4] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.45, ease: 'easeInOut' }}
                    aria-hidden
                  >
                    <Icon className="size-3.5" />
                  </motion.span>
                ))}
              <motion.span
                className="relative flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
                animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden
              >
                <FileArchiveIcon className="size-4.5" />
              </motion.span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold">
                  {t('htmlBundle.preparing', { count: pageCount })}
                </p>
                <span className="text-sm font-semibold tabular-nums text-primary">{percent}%</span>
              </div>
              <div className="relative h-4 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={progress?.phase ?? 'start'}
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
              initial={{ width: '0%' }}
              animate={{ width: `${Math.max(percent, 3)}%` }}
              transition={{ duration: reduce ? 0 : 0.35, ease: 'easeOut' }}
            >
              {!reduce && (
                <motion.span
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </motion.div>
          </div>

          <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-muted-foreground">
            <span>{t('htmlBundle.elapsed', { time: formatDuration(elapsed) })}</span>
            <span>
              {remaining != null
                ? t('htmlBundle.remaining', { time: formatDuration(remaining) })
                : t('htmlBundle.estimating')}
            </span>
          </div>

          <ol className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1">
            {PHASES.map((phase, index) => {
              const state = index < phaseIndex ? 'done' : index === phaseIndex ? 'current' : 'todo'
              return (
                <li
                  key={phase.id}
                  className={cn(
                    'flex items-center gap-1.5 text-[11px]',
                    state === 'todo' ? 'text-muted-foreground/60' : 'text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-3.5 shrink-0 items-center justify-center rounded-full',
                      state === 'done' && 'bg-primary text-primary-foreground',
                      state === 'current' && 'text-primary',
                      state === 'todo' && 'border border-muted-foreground/30',
                    )}
                    aria-hidden
                  >
                    {state === 'done' && <CheckIcon className="size-2.5" />}
                    {state === 'current' && (
                      <LoaderCircleIcon className={cn('size-3.5', !reduce && 'animate-spin')} />
                    )}
                  </span>
                  {t(phase.label)}
                </li>
              )
            })}
          </ol>

          <div className="mt-2.5 flex items-center gap-2 rounded-md bg-background/70 px-2 py-1.5">
            <p className="min-w-0 flex-1 text-[10px] leading-snug text-muted-foreground">
              {runsInBackground ? t('htmlBundle.backgroundHint') : t('htmlBundle.keepOpenHint')}
            </p>
            {onCancel && (
              <Button size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-[11px]" onClick={onCancel}>
                {t('htmlBundle.cancel')}
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
