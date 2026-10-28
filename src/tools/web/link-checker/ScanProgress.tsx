import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { PauseIcon, PlayIcon, SquareIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { HEALTH_ORDER, type LinkHealth } from '@/core/engines/linkChecker/report'
import { Button } from '@/shared/components/ui/button'
import { formatElapsedSeconds } from '@/shared/utils/formatElapsedSeconds'
import { cn } from '@/shared/utils/cn'

import { HEALTH_META } from './meta'
import { scanElapsedMs, type ScanPhase, type ScanProgress as Progress, type ScanTiming } from './useLinkScan'
import { Ring } from './visuals'

interface ScanProgressProps {
  progress: Progress
  phase: ScanPhase
  timing: ScanTiming | null
  pausedSince: number | null
  counts: Record<LinkHealth, number>
  onPause: () => void
  onResume: () => void
  onStop: () => void
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active])
  return now
}

export function ScanProgress({ progress, phase, timing, pausedSince, counts, onPause, onResume, onStop }: ScanProgressProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const paused = phase === 'paused'
  const now = useNow(true)
  const elapsedMs = scanElapsedMs(timing, now, pausedSince)
  const ratio = progress.total > 0 ? progress.done / progress.total : 0
  const percent = Math.round(ratio * 100)
  const seconds = elapsedMs / 1000
  const rate = seconds >= 1 && progress.done > 0 ? progress.done / seconds : null
  const remaining = rate && progress.done < progress.total ? Math.max(1, Math.round((progress.total - progress.done) / rate)) : null
  const title = paused
    ? t('linkChecker.progress.paused')
    : progress.retrying
      ? t('linkChecker.progress.retrying', { count: progress.total })
      : t('linkChecker.progress.title')
  const tallies = HEALTH_ORDER.filter((health) => counts[health] > 0)

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-3.5 transition-colors duration-300',
        paused ? 'border-amber-500/30 bg-amber-500/5' : 'border-primary/20 bg-primary/5',
      )}
      aria-label={t('linkChecker.progress.label')}
    >
      {!reduce && !paused && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/8 to-transparent"
          animate={{ x: ['-120%', '420%'] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <div className="relative flex items-center gap-3.5">
        <div
          role="progressbar"
          aria-label={t('linkChecker.progress.label')}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.done}
        >
          <Ring
            value={ratio}
            size={64}
            stroke={6}
            orbit={!paused}
            className={paused ? 'stroke-amber-500' : 'stroke-primary'}
            trackClassName={paused ? 'stroke-amber-500/15' : 'stroke-primary/15'}
          >
            <span className="text-sm font-bold tabular-nums">{percent}%</span>
          </Ring>
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-5 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={title}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-x-0 truncate text-[13px] leading-5 font-semibold"
              >
                {title}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {t('linkChecker.progress.detail', { done: progress.done, total: progress.total })}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground tabular-nums">
            <span>{t('linkChecker.progress.elapsed', { time: formatElapsedSeconds(Math.floor(seconds)) })}</span>
            {rate != null && <span>{t('linkChecker.progress.rate', { rate: rate.toFixed(1) })}</span>}
            {remaining != null && !paused && (
              <span>{t('linkChecker.progress.remaining', { time: formatElapsedSeconds(remaining) })}</span>
            )}
          </p>
        </div>
      </div>

      <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
        <AnimatePresence initial={false}>
          {tallies.map((health) => {
            const meta = HEALTH_META[health]
            const Icon = meta.icon
            return (
              <motion.span
                key={health}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.18 }}
                className={cn('inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium', meta.soft, meta.text)}
              >
                <Icon className="size-3" aria-hidden />
                {t(`linkChecker.health.${health}`)}
                <motion.span
                  key={counts[health]}
                  initial={reduce ? false : { y: -6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.16 }}
                  className="font-semibold tabular-nums"
                >
                  {counts[health]}
                </motion.span>
              </motion.span>
            )
          })}
        </AnimatePresence>
        <div className="ml-auto flex items-center gap-1.5">
          {paused ? (
            <Button size="xs" onClick={onResume}>
              <PlayIcon />
              {t('linkChecker.resume')}
            </Button>
          ) : (
            <Button size="xs" variant="outline" onClick={onPause}>
              <PauseIcon />
              {t('linkChecker.pause')}
            </Button>
          )}
          <Button size="xs" variant="ghost" onClick={onStop}>
            <SquareIcon />
            {t('linkChecker.stop')}
          </Button>
        </div>
      </div>
    </motion.section>
  )
}
