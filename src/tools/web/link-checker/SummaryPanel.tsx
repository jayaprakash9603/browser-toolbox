import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ListPlusIcon, RefreshCwIcon, RotateCcwIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { gradeOf, type CheckSummary, type HealthFilter, type LinkHealth } from '@/core/engines/linkChecker/report'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

import { formatDuration, GRADE_META } from './meta'
import { BreakdownBar, CountUp, Ring } from './visuals'

interface SummaryPanelProps {
  summary: CheckSummary
  stopped: boolean
  total: number
  remaining: number
  elapsedMs: number
  filter: HealthFilter
  busy: boolean
  marking: boolean
  onToggleMark: (next: boolean) => void
  onRecheckProblems: () => void
  onCheckAgain: () => void
  onCheckRemaining: () => void
}

export function SummaryPanel({
  summary,
  stopped,
  total,
  remaining,
  elapsedMs,
  filter,
  busy,
  marking,
  onToggleMark,
  onRecheckProblems,
  onCheckAgain,
  onCheckRemaining,
}: SummaryPanelProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const grade = summary.score == null ? 'unknown' : gradeOf(summary.score)
  const tone = GRADE_META[grade]
  const active: LinkHealth | null = filter === 'all' || filter === 'problems' ? null : filter

  const headline = stopped
    ? t('linkChecker.summary.stopped', { checked: summary.checked, total })
    : summary.problems > 0
      ? t('linkChecker.summary.problems', { count: summary.problems, checked: summary.checked })
      : t('linkChecker.summary.noProblems', { checked: summary.checked })

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="@container relative overflow-hidden rounded-2xl border bg-card p-3.5 shadow-xs"
      aria-label={t('linkChecker.summary.label')}
    >
      <div aria-hidden className={cn('pointer-events-none absolute -top-12 -left-10 size-40 rounded-full blur-3xl', tone.glow)} />
      <div className="relative flex items-center gap-3.5">
        <Ring
          value={(summary.score ?? 0) / 100}
          className={tone.stroke}
          label={summary.score == null ? t('linkChecker.grade.unknown') : t('linkChecker.healthScoreValue', { score: summary.score })}
        >
          <span className="text-lg leading-none font-bold tabular-nums">
            {summary.score == null ? '—' : <CountUp value={summary.score} />}
            {summary.score != null && <span className="text-[11px] font-semibold">%</span>}
          </span>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-muted-foreground">{t('linkChecker.healthScore')}</p>
          <p className={cn('text-base leading-6 font-semibold tracking-tight', tone.text)}>{t(`linkChecker.grade.${grade}`)}</p>
          <p className="text-xs text-foreground/80">{headline}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            {t('linkChecker.summary.duration', { time: formatDuration(elapsedMs) })}
            {summary.slowest && ` · ${t('linkChecker.summary.slowest', { ms: summary.slowest.durationMs.toLocaleString() })}`}
          </p>
        </div>
      </div>

      <BreakdownBar className="relative mt-3.5" counts={summary.counts} total={summary.checked} active={active} />

      <dl className="relative mt-3 grid grid-cols-2 gap-y-2 rounded-xl bg-muted/40 py-2 text-center @[340px]:grid-cols-4 @[340px]:divide-x">
        <Stat label={t('linkChecker.stat.checked')} value={<CountUp value={summary.checked} />} />
        <Stat
          label={t('linkChecker.stat.problems')}
          value={<CountUp value={summary.problems} />}
          className={summary.problems > 0 ? 'text-red-700 dark:text-red-400' : undefined}
        />
        <Stat label={t('linkChecker.stat.redirects')} value={<CountUp value={summary.counts.redirect} />} />
        <Stat
          label={t('linkChecker.stat.average')}
          value={summary.averageMs == null ? '—' : formatDuration(summary.averageMs)}
        />
      </dl>

      <div className="relative mt-3 flex flex-wrap items-center gap-2">
        {summary.problems > 0 && (
          <Button size="xs" onClick={onRecheckProblems} disabled={busy}>
            <RotateCcwIcon />
            {t('linkChecker.recheckProblems')}
          </Button>
        )}
        {stopped && remaining > 0 && (
          <Button size="xs" variant="outline" onClick={onCheckRemaining} disabled={busy}>
            <ListPlusIcon />
            {t('linkChecker.checkRemaining', { count: remaining })}
          </Button>
        )}
        <Button size="xs" variant="outline" onClick={onCheckAgain} disabled={busy}>
          <RefreshCwIcon />
          {t('linkChecker.checkAgain')}
        </Button>
        <label
          className="ml-auto flex min-h-7 cursor-pointer items-center gap-1.5 text-xs font-medium text-foreground/80"
          title={t('linkChecker.markOnPageHint')}
        >
          <Switch checked={marking} onCheckedChange={onToggleMark} aria-label={t('linkChecker.markOnPage')} />
          {t('linkChecker.markOnPage')}
        </label>
      </div>
    </motion.section>
  )
}

function Stat({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className="flex flex-col-reverse px-1">
      <dt className="truncate text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn('text-base leading-6 font-semibold tabular-nums', className)}>{value}</dd>
    </div>
  )
}
