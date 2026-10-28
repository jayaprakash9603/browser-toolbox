import { useEffect, useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon, SparklesIcon } from 'lucide-react'

import { gradeFor, type A11yReport, type A11ySeverity } from '@/core/engines/a11y'
import { cn } from '@/shared/utils/cn'

import { GRADE_STYLE, PASS_ICON, SEVERITY_ICON, SEVERITY_TONE } from './meta'

const RADIUS = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const EASE_OUT = [0.22, 1, 0.36, 1] as const

function ScoreGauge({ score }: { score: number }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const gradientId = `a11y-score-${useId().replace(/[^\w-]/g, '')}`
  const grade = gradeFor(score)
  const style = GRADE_STYLE[grade]
  const value = useMotionValue(reduce ? score : 0)
  const rounded = useTransform(value, (v) => Math.round(v))
  const offset = useTransform(value, (v) => CIRCUMFERENCE - (Math.min(Math.max(v, 0), 100) / 100) * CIRCUMFERENCE)

  useEffect(() => {
    const controls = animate(value, score, reduce ? { duration: 0 } : { duration: 0.85, ease: EASE_OUT })
    return () => controls.stop()
  }, [score, reduce, value])

  return (
    <div className="relative size-14 shrink-0" role="img" aria-label={t('a11y.scoreLabel', { score })}>
      <svg viewBox="0 0 56 56" className="size-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={style.from} />
            <stop offset="100%" stopColor={style.to} />
          </linearGradient>
        </defs>
        <circle cx="28" cy="28" r={RADIUS} fill="none" strokeWidth="5" className="stroke-muted" />
        <motion.circle
          cx="28"
          cy="28"
          r={RADIUS}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          strokeDasharray={CIRCUMFERENCE}
          style={{ strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none" aria-hidden>
        <motion.span className="text-lg font-semibold tracking-tight tabular-nums">{rounded}</motion.span>
      </div>
    </div>
  )
}

function ScoreDelta({ score, previous }: { score: number; previous: number | null }) {
  const { t } = useTranslation()
  if (previous == null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
        <SparklesIcon className="size-2.5" aria-hidden />
        {t('a11y.delta.first')}
      </span>
    )
  }
  const diff = score - previous
  const Icon = diff > 0 ? ArrowUpRightIcon : diff < 0 ? ArrowDownRightIcon : MinusIcon
  const tone =
    diff > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : diff < 0
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-muted-foreground'
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-medium tabular-nums', tone)}>
      <Icon className="size-2.5" aria-hidden />
      {diff === 0 ? t('a11y.delta.same') : t(diff > 0 ? 'a11y.delta.up' : 'a11y.delta.down', { count: Math.abs(diff) })}
    </span>
  )
}

export type SeverityFilter = A11ySeverity | 'all'

interface CounterProps {
  kind: A11ySeverity | 'pass'
  count: number
  label: string
  pressed?: boolean
  onClick: () => void
}

function Counter({ kind, count, label, pressed, onClick }: CounterProps) {
  const Icon = kind === 'pass' ? PASS_ICON : SEVERITY_ICON[kind]
  const tone = SEVERITY_TONE[kind]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      title={label}
      className={cn(
        'flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border bg-background/70 px-1 py-1 outline-none transition-[background-color,border-color,box-shadow] duration-200 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring',
        pressed && 'border-transparent ring-2 ring-primary/50',
        count === 0 && kind !== 'pass' && 'opacity-55',
      )}
    >
      <Icon className={cn('size-3 shrink-0', tone.text)} aria-hidden />
      <span className={cn('text-sm font-semibold tabular-nums leading-none', tone.text)}>{count}</span>
      <span className="sr-only">{label}</span>
    </button>
  )
}

interface ScoreHeroProps {
  report: A11yReport
  previousScore: number | null
  scanning: boolean
  severity: SeverityFilter
  onSeverity: (severity: SeverityFilter) => void
  onShowPassed: () => void
  scannedAtLabel?: string | null
  actions?: ReactNode
}

export function ScoreHero({
  report,
  previousScore,
  scanning,
  severity,
  onSeverity,
  onShowPassed,
  scannedAtLabel,
  actions,
}: ScoreHeroProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const grade = gradeFor(report.score)
  const style = GRADE_STYLE[grade]
  const { counts, scan } = report
  let location = scan.url
  try {
    const url = new URL(scan.url)
    location = `${url.host}${url.pathname === '/' ? '' : url.pathname}`
  } catch {
    // Keep the raw URL.
  }
  const toggle = (value: A11ySeverity) => onSeverity(severity === value ? 'all' : value)

  return (
    <section
      aria-label={t('a11y.summary')}
      className="relative isolate min-h-[5.5rem] shrink-0 overflow-hidden rounded-xl border bg-card px-2.5 py-2.5 shadow-xs"
    >
      <div
        aria-hidden
        className={cn('pointer-events-none absolute -right-10 -top-12 -z-10 size-28 rounded-full blur-2xl', style.glow)}
      />
      <AnimatePresence>
        {scanning && (
          <motion.div
            aria-hidden
            className="absolute inset-x-0 top-0 h-0.5 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {reduce ? (
              <span className="block h-full w-full bg-primary/60" />
            ) : (
              <motion.span
                className="block h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '300%' }}
                transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start gap-2">
        <ScoreGauge score={report.score} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className={cn('rounded-full px-1.5 py-px text-[10px] font-semibold', style.chip)}>
              {t(`a11y.grade.${grade}`)}
            </span>
            <ScoreDelta score={report.score} previous={previousScore} />
            {scannedAtLabel && (
              <span className="text-[10px] text-muted-foreground tabular-nums">{scannedAtLabel}</span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground" title={scan.url}>
            {location}
          </p>
          {actions && (
            <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1">{actions}</div>
          )}
        </div>
      </div>

      <div className="mt-2 flex gap-1" role="group" aria-label={t('a11y.filtersLabel')}>
        <Counter
          kind="error"
          count={counts.errors}
          label={t('a11y.count.errors', { count: counts.errors })}
          pressed={severity === 'error'}
          onClick={() => toggle('error')}
        />
        <Counter
          kind="warning"
          count={counts.warnings}
          label={t('a11y.count.warnings', { count: counts.warnings })}
          pressed={severity === 'warning'}
          onClick={() => toggle('warning')}
        />
        <Counter
          kind="notice"
          count={counts.notices}
          label={t('a11y.count.notices', { count: counts.notices })}
          pressed={severity === 'notice'}
          onClick={() => toggle('notice')}
        />
        <Counter
          kind="pass"
          count={counts.passed}
          label={t('a11y.count.passed', { count: counts.passed })}
          pressed={false}
          onClick={onShowPassed}
        />
      </div>
    </section>
  )
}
