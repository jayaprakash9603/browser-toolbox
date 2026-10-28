import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { LoaderCircleIcon, XIcon } from 'lucide-react'

import { ActionBar } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'

import { LAUNCHER_MODES } from './modes'
import type { CaptureRun, RunMode } from './useCaptureRun'

function modeLabel(mode: RunMode, t: TFunction): string {
  if (mode === 'batch-urls') return t('capture.launcher.urlBatch')
  const meta = LAUNCHER_MODES.find((item) => item.id === mode)
  return meta ? t(meta.labelKey) : mode
}

function describe(run: Exclude<CaptureRun, { phase: 'idle' }>, t: TFunction): { title: string; detail: string } {
  const label = modeLabel(run.mode, t)
  if (run.phase === 'countdown') {
    return { title: t('capture.run.countdown', { mode: label, count: run.remaining }), detail: t('capture.run.countdownHint') }
  }
  const step = run.total > 0 ? { current: Math.max(1, run.current), total: run.total } : null
  switch (run.mode) {
    case 'all-tabs':
      return { title: t('capture.run.capturing', { mode: label }), detail: step ? t('capture.run.tabStep', step) : t('capture.run.allTabs') }
    case 'batch-urls':
      return { title: t('capture.run.capturing', { mode: label }), detail: step ? t('capture.run.urlStep', step) : t('capture.run.batch') }
    case 'menu':
      return { title: t('capture.run.menu'), detail: t('capture.run.menuHint') }
    default:
      return { title: t('capture.run.capturing', { mode: label }), detail: t(`capture.run.${run.mode}`) }
  }
}

function progressOf(run: CaptureRun): number | null {
  if (run.phase === 'countdown') return (run.total - run.remaining) / run.total
  if (run.phase === 'running' && run.total > 0) return run.current / run.total
  return null
}

/** Sticky bar shown while a countdown or capture is under way. */
export function RunStatus({ run, onCancel }: { run: CaptureRun; onCancel: () => void }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const text = run.phase === 'idle' ? null : describe(run, t)

  return (
    <>
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {text?.title}
    </p>
    <AnimatePresence>
      {run.phase !== 'idle' && text && (
        <motion.div
          key="run"
          className="sticky bottom-0 z-10"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, transition: { duration: 0.15 } }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        >
          <ActionBar className="relative mx-0" progress={progressOf(run)}>
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              {run.phase === 'countdown' ? (
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={run.remaining}
                    className="text-sm font-bold tabular-nums"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {run.remaining}
                  </motion.span>
                </AnimatePresence>
              ) : (
                <LoaderCircleIcon className="size-4 animate-spin" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{text.title}</p>
              <p className="truncate text-xs text-muted-foreground">{text.detail}</p>
            </div>
            {run.phase === 'countdown' && (
              <Button size="sm" variant="outline" aria-keyshortcuts="Escape" onClick={onCancel}>
                <XIcon />
                {t('capture.run.cancel')}
                <kbd className="hidden rounded border bg-muted px-1 font-sans text-[10px] leading-4 text-muted-foreground @[360px]:inline">
                  Esc
                </kbd>
              </Button>
            )}
          </ActionBar>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}
