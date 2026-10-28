import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { GlobeIcon, ShieldAlertIcon } from 'lucide-react'

import { cn } from '@/shared/utils/cn'

import type { CaptureRun } from './useCaptureRun'
import type { CaptureTarget, CaptureTargetState } from './useCaptureTarget'

type TargetStatus = 'loading' | 'ready' | 'blocked' | 'none'

const CORNERS = [
  { className: 'top-0 left-0 rounded-tl-lg border-t-2 border-l-2', x: 3, y: 3 },
  { className: 'top-0 right-0 rounded-tr-lg border-t-2 border-r-2', x: -3, y: 3 },
  { className: 'bottom-0 left-0 rounded-bl-lg border-b-2 border-l-2', x: 3, y: -3 },
  { className: 'right-0 bottom-0 rounded-br-lg border-r-2 border-b-2', x: -3, y: -3 },
] as const

const RING_RADIUS = 30

function statusOf(state: CaptureTargetState): TargetStatus {
  if (!state.ready) return 'loading'
  if (!state.target) return 'none'
  return state.target.restricted ? 'blocked' : 'ready'
}

function PageIcon({ target }: { target: CaptureTarget | null }) {
  const [broken, setBroken] = useState<string | null>(null)
  const src = target?.favIconUrl
  if (!src || broken === src) return <GlobeIcon className="size-5 text-muted-foreground" />
  return <img src={src} alt="" className="size-5 rounded-sm" onError={() => setBroken(src)} />
}

function Viewfinder({ target, run, shots }: { target: CaptureTarget | null; run: CaptureRun; shots: number }) {
  const reduce = useReducedMotion()
  const counting = run.phase === 'countdown'
  const capturing = run.phase === 'running' && run.mode !== 'menu'
  const locked = counting || capturing
  const circumference = 2 * Math.PI * RING_RADIUS

  return (
    <div className="relative flex size-16 shrink-0 items-center justify-center" aria-hidden>
      {CORNERS.map((corner) => (
        <motion.span
          key={corner.className}
          className={cn(
            'absolute size-4 transition-colors duration-300',
            corner.className,
            locked ? 'border-primary' : 'border-foreground/30',
          )}
          animate={locked && !reduce ? { x: corner.x, y: corner.y } : { x: 0, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        />
      ))}
      {counting && (
        <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={RING_RADIUS} fill="none" strokeWidth="2" className="stroke-primary/15" />
          <motion.circle
            cx="32"
            cy="32"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            className="stroke-primary"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: circumference * (1 - (run.remaining - 1) / run.total) }}
            transition={reduce ? { duration: 0 } : { duration: 1, ease: 'linear' }}
          />
        </svg>
      )}
      <div
        className={cn(
          'relative flex size-10 items-center justify-center overflow-hidden rounded-xl bg-background/85 shadow-sm ring-1 ring-border',
          !reduce && !locked && 'hero-float-icon',
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {counting ? (
            <motion.span
              key={`count-${run.remaining}`}
              className="text-lg font-bold text-primary tabular-nums"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            >
              {run.remaining}
            </motion.span>
          ) : (
            <motion.span
              key="page"
              className="flex"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18 }}
            >
              <PageIcon target={target} />
            </motion.span>
          )}
        </AnimatePresence>
        {capturing && !reduce && (
          <motion.span
            className="absolute inset-0 border-b-2 border-primary bg-gradient-to-b from-transparent from-60% to-primary/35"
            initial={{ y: '-100%' }}
            animate={{ y: ['-100%', '0%'] }}
            transition={{ duration: 0.9, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          />
        )}
      </div>
      {shots > 0 && !reduce && (
        <motion.span
          key={shots}
          className="pointer-events-none absolute -inset-1 rounded-2xl bg-white mix-blend-screen"
          initial={{ opacity: 0.95, scale: 0.9 }}
          animate={{ opacity: 0, scale: 1.25 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      )}
    </div>
  )
}

function StatusPill({ status }: { status: TargetStatus }) {
  const { t } = useTranslation()
  if (status === 'loading') return <span className="h-4 w-14 animate-pulse rounded-full bg-muted" />
  const tone =
    status === 'ready'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : status === 'blocked'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : 'border-border bg-muted text-muted-foreground'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
        tone,
      )}
    >
      <span className="relative flex size-1.5">
        {status === 'ready' && (
          <span className="absolute inline-flex size-full rounded-full bg-emerald-500 opacity-70 motion-safe:animate-ping" />
        )}
        <span className="relative inline-flex size-1.5 rounded-full bg-current" />
      </span>
      {t(`capture.target.status.${status}`)}
    </span>
  )
}

/** Banner naming the page the capture buttons will capture, with a viewfinder that runs the countdown. */
export function TargetHero({
  state,
  run,
  shots,
  blockedId,
}: {
  state: CaptureTargetState
  run: CaptureRun
  shots: number
  blockedId: string
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const status = statusOf(state)
  const { target } = state

  return (
    <section
      aria-label={t('capture.target.label')}
      aria-busy={run.phase !== 'idle'}
      className="relative isolate overflow-hidden rounded-2xl border bg-card px-4 py-3.5 shadow-xs"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--hero-from) 16%, transparent), transparent 55%), radial-gradient(90% 120% at 100% 100%, color-mix(in srgb, var(--hero-to) 18%, transparent), transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-60 [mask-image:linear-gradient(90deg,transparent,black_60%)]"
        style={{
          backgroundImage: 'radial-gradient(color-mix(in srgb, var(--foreground) 12%, transparent) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      />
      <div className="flex items-center gap-4">
        <Viewfinder target={target} run={run} shots={shots} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t('capture.target.from')}
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={target?.url ?? status}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {status === 'loading' ? (
                <span className="mt-1.5 block h-5 w-2/3 animate-pulse rounded-md bg-muted" />
              ) : (
                <p
                  className="mt-0.5 truncate text-base leading-tight font-semibold tracking-tight"
                  title={target?.title}
                >
                  {target?.title ?? t('capture.target.noneTitle')}
                </p>
              )}
              <div className="mt-1.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                {target && <span className="min-w-0 truncate">{target.host}</span>}
                <StatusPill status={status} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {(status === 'blocked' || status === 'none') && (
          <motion.p
            id={blockedId}
            key={status}
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <span className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs leading-5 text-amber-800 dark:text-amber-200">
              <ShieldAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {t(status === 'blocked' ? 'capture.target.blocked' : 'capture.target.none')}
            </span>
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  )
}
