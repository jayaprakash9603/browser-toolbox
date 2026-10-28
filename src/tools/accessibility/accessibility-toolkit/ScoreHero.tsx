import { useEffect, useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon, SparklesIcon } from 'lucide-react'

import { gradeFor, type A11yReport, type A11ySeverity } from '@/core/engines/a11y'
import { cn } from '@/shared/utils/cn'

import { GRADE_STYLE, PASS_ICON, SEVERITY_ICON, SEVERITY_TONE } from './meta'

const RADIUS = 30
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
    const controls = animate(value, score, reduce ? { duration: 0 } : { duration: 1.1, ease: EASE_OUT })
    return () => controls.stop()
  }, [score, reduce, value])

  return (
    <div className="relative size-[76px] shrink-0" role="img" aria-label={t('a11y.scoreLabel', { score })}>
      <svg viewBox="0 0 76 76" className="size-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={style.from} />
            <stop offset="100%" stopColor={style.to} />
          </linearGradient>
        </defs>
        <circle cx="38" cy="38" r={RADIUS} fill="none" strokeWidth="7" className="stroke-muted" />
        <motion.circle
          cx="38"
          cy="38"
          r={RADIUS}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          strokeDasharray={CIRCUMFERENCE}
          style={{ strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none" aria-hidden>
        <motion.span className="text-[22px] font-semibold tracking-tight tabular-nums">{rounded}</motion.span>
        <span className="mt-0.5 text-[10px] text-muted-foreground">/100</span>
      </div>
    </div>
  )
}

function ScoreDelta({ score, previous }: { score: number; previous: number | null }) {
  const { t } = useTranslation()
  if (previous == null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <SparklesIcon className="size-3" aria-hidden />
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
    <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums', tone)}>
      <Icon className="size-3" aria-hidden />
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
  index: number
}

function Counter({ kind, count, label, pressed, onClick, index }: CounterProps) {
  const reduce = useReducedMotion()
  const Icon = kind === 'pass' ? PASS_ICON : SEVERITY_ICON[kind]
  const tone = SEVERITY_TONE[kind]
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.05, duration: 0.3, ease: EASE_OUT }}
      whileTap={reduce ? undefined : { scale: 0.96 }}
      className={cn(
        'group/counter flex min-w-0 cursor-pointer flex-col items-start gap-0.5 rounded-xl border bg-background/60 px-2 py-1.5 text-left outline-none transition-[background-color,border-color,box-shadow] duration-200 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring',
        pressed && 'border-transparent ring-2 ring-primary/50',
        count === 0 && kind !== 'pass' && 'opacity-60',
      )}
    >
      <span className={cn('inline-flex items-center gap-1', tone.text)}>
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="text-base leading-none font-semibold tabular-nums">{count}</span>
      </span>
      <span className="w-full truncate text-[11px] text-muted-foreground">{label}</span>
    </motion.button>
  )
}

interface ScoreHeroProps {
  report: A11yReport
  previousScore: number | null
  scanning: boolean
  severity: SeverityFilter
  onSeverity: (severity: SeverityFilter) => void
  onShowPassed: () => void
  actions?: ReactNode
}

export function ScoreHero({ report, previousScore, scanning, severity, onSeverity, onShowPassed, actions }: ScoreHeroProps) {
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
      className="relative isolate overflow-hidden rounded-2xl border bg-card p-3 shadow-xs"
    >
      <motion.div
        aria-hidden
        className={cn('pointer-events-none absolute -top-20 -right-16 -z-10 size-48 rounded-full blur-3xl', style.glow)}
        initial={reduce ? false : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
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

      <div className="flex items-center gap-3">
        <ScoreGauge score={report.score} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{t('a11y.score')}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={grade}
                initial={reduce ? false : { opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', style.chip)}
              >
                {t(`a11y.grade.${grade}`)}
              </motion.span>
            </AnimatePresence>
            <ScoreDelta score={report.score} previous={previousScore} />
          </div>
          <p className="mt-1 truncate text-[11px] text-muted-foreground" title={scan.url}>
            {location}
          </p>
        </div>
        {actions && <div className="flex shrink-0 flex-col items-end gap-1 self-start">{actions}</div>}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <Counter
          index={0}
          kind="error"
          count={counts.errors}
          label={t('a11y.count.errors', { count: counts.errors })}
          pressed={severity === 'error'}
          onClick={() => toggle('error')}
        />
        <Counter
          index={1}
          kind="warning"
          count={counts.warnings}
          label={t('a11y.count.warnings', { count: counts.warnings })}
          pressed={severity === 'warning'}
          onClick={() => toggle('warning')}
        />
        <Counter
          index={2}
          kind="notice"
          count={counts.notices}
          label={t('a11y.count.notices', { count: counts.notices })}
          pressed={severity === 'notice'}
          onClick={() => toggle('notice')}
        />
        <Counter
          index={3}
          kind="pass"
          count={counts.passed}
          label={t('a11y.count.passed', { count: counts.passed })}
          onClick={onShowPassed}
        />
      </div>
    </section>
  )
}
