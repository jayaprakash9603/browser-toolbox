import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronRightIcon, CircleAlertIcon, CircleCheckIcon, FileArchiveIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import { isJobRunning, isJobStalled, overallPercent, STALE_AFTER_MS } from '@/core/htmlBundleJob'
import { toolRegistry } from '@/core/registry'
import { useHtmlBundleJob } from '@/features/html-bundle-job/useHtmlBundleJob'
import { cn } from '@/shared/utils/cn'

const RESULT_VISIBLE_MS = 2 * 60 * 1000

export function BundleJobBanner() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const job = useHtmlBundleJob()
  const route = toolRegistry.get('web.html-bundle')?.route

  const now = Date.now()
  const running = isJobRunning(job, now)
  const finishedRecently =
    job != null &&
    job.status !== 'running' &&
    job.status !== 'cancelled' &&
    now - (job.finishedAt ?? 0) < RESULT_VISIBLE_MS
  const stalled = isJobStalled(job, now)
  const stalledRecently = job != null && stalled && now - job.updatedAt < STALE_AFTER_MS + RESULT_VISIBLE_MS
  const visible = Boolean(route) && (running || finishedRecently || stalledRecently)
  const percent = overallPercent(job?.progress ?? null, job?.mode)
  const failed = job?.status === 'error' || stalled

  return (
    <AnimatePresence initial={false}>
      {visible && job && route && (
        <motion.div
          key="bundle-job"
          initial={reduce ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="mb-3"
        >
          <Link
            to={route}
            role="status"
            aria-live="polite"
            className={cn(
              'flex min-h-11 items-center gap-2.5 rounded-xl border bg-card p-2.5 shadow-[var(--shadow-card)] outline-none transition-[transform,box-shadow] duration-150',
              'hover:shadow-[var(--shadow-card-hover)] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring',
              running && 'border-primary/25',
              failed && 'border-destructive/30',
            )}
          >
            <span
              className={cn(
                'relative flex size-9 shrink-0 items-center justify-center rounded-lg',
                failed ? 'bg-destructive/10 text-destructive' : 'bg-primary text-primary-foreground',
              )}
              aria-hidden
            >
              {running && !reduce && (
                <motion.span
                  className="absolute inset-0 rounded-lg bg-primary"
                  animate={{ scale: [1, 1.18], opacity: [0.45, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              {running ? (
                <FileArchiveIcon className="relative size-4" />
              ) : failed ? (
                <CircleAlertIcon className="size-4" />
              ) : (
                <CircleCheckIcon className="size-4" />
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs font-semibold">
                  {running
                    ? t('htmlBundle.bannerPreparing', {
                        count: job.mode === 'crawl' ? (job.progress?.crawl?.saved ?? 0) : job.pageCount,
                      })
                    : failed
                      ? t('htmlBundle.bannerFailed')
                      : t('htmlBundle.bannerDone')}
                </span>
                {running && (
                  <span className="text-xs font-semibold tabular-nums text-primary">{percent}%</span>
                )}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">{job.fileName}</span>
              {running && (
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-primary/15">
                  <motion.span
                    className="block h-full rounded-full bg-primary"
                    initial={false}
                    animate={{ width: `${Math.max(percent, 3)}%` }}
                    transition={{ duration: reduce ? 0 : 0.35, ease: 'easeOut' }}
                  />
                </span>
              )}
            </span>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
