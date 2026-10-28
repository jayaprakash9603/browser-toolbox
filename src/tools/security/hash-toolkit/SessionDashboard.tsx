import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { formatBytes } from '@/core/engines/image'
import { cn } from '@/shared/utils/cn'

import type { SessionAnalytics, TypeShare } from './sessionStats'

function ratio(part: number, total: number): number {
  return total === 0 ? 0 : part / total
}

function StatCard({
  label,
  value,
  detail,
  fill,
  tone = 'primary',
}: {
  label: string
  value: string
  detail: string
  fill: number
  tone?: 'primary' | 'ok' | 'warn' | 'danger'
}) {
  const reduce = useReducedMotion()
  const bar =
    tone === 'ok'
      ? 'bg-emerald-500'
      : tone === 'warn'
        ? 'bg-amber-500'
        : tone === 'danger'
          ? 'bg-red-500'
          : 'bg-primary'

  return (
    <article className="flex min-w-0 flex-col gap-1.5 rounded-xl border bg-muted/20 px-2.5 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold leading-none tabular-nums tracking-tight">{value}</p>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn('h-full rounded-full', bar)}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${Math.round(Math.min(1, fill) * 100)}%` }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{detail}</p>
    </article>
  )
}

export function SessionDashboard({ analytics }: { analytics: SessionAnalytics }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  if (analytics.hashed === 0) return null

  const baselineTotal = analytics.baselineMatch + analytics.baselineModified + analytics.baselineMetadata
  const matchPct = Math.round(ratio(analytics.baselineMatch, Math.max(1, baselineTotal)) * 100)

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border bg-card px-3 py-2.5 shadow-xs"
      aria-label={t('hashToolkit.stats.title')}
    >
      <div className="mb-2">
        <h3 className="text-[13px] font-semibold leading-tight">{t('hashToolkit.stats.title')}</h3>
        <p className="text-[11px] text-muted-foreground">{t('hashToolkit.stats.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 @md:grid-cols-4 @lg:gap-2.5">
        <StatCard
          label={t('hashToolkit.stats.baseline')}
          value={baselineTotal === 0 ? '—' : `${matchPct}%`}
          detail={t('hashToolkit.stats.baselineDetail', { count: analytics.baselineMatch })}
          fill={baselineTotal === 0 ? 0 : matchPct / 100}
          tone="ok"
        />
        <StatCard
          label={t('hashToolkit.stats.duplicates')}
          value={String(analytics.duplicateFileCount)}
          detail={t('hashToolkit.stats.duplicateGroups', { count: analytics.duplicates.length })}
          fill={ratio(analytics.duplicateFileCount, analytics.hashed)}
          tone={analytics.duplicateFileCount > 0 ? 'warn' : 'ok'}
        />
        <StatCard
          label={t('hashToolkit.stats.highEntropy')}
          value={String(analytics.bands.high)}
          detail={t('hashToolkit.stats.highEntropyDetail')}
          fill={ratio(analytics.bands.high, analytics.hashed)}
          tone={analytics.bands.high > 0 ? 'warn' : 'ok'}
        />
        <StatCard
          label={t('hashToolkit.stats.types')}
          value={String(analytics.types.length)}
          detail={t('hashToolkit.stats.risky', { count: analytics.risky })}
          fill={ratio(analytics.types.length, Math.max(4, analytics.types.length))}
        />
      </div>

      <div className="mt-3 grid gap-3 @md:grid-cols-2">
        <StackedShareBar
          ariaLabel={t('hashToolkit.stats.entropyMix')}
          slices={[
            {
              key: 'low',
              count: analytics.bands.low,
              color: 'var(--color-emerald-500, #10b981)',
              label: t('hashToolkit.viz.entropy.low'),
            },
            {
              key: 'mid',
              count: analytics.bands.mid,
              color: 'var(--color-amber-500, #f59e0b)',
              label: t('hashToolkit.viz.entropy.mid'),
            },
            {
              key: 'high',
              count: analytics.bands.high,
              color: 'var(--color-violet-500, #8b5cf6)',
              label: t('hashToolkit.viz.entropy.high'),
            },
          ]}
        />
        <TypeMixBars types={analytics.types} />
      </div>
    </motion.section>
  )
}

function StackedShareBar({
  ariaLabel,
  slices,
}: {
  ariaLabel: string
  slices: { key: string; count: number; color: string; label: string }[]
}) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0)
  if (total === 0) return null
  return (
    <figure className="space-y-1.5">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={ariaLabel}>
        {slices.map((slice) =>
          slice.count > 0 ? (
            <span
              key={slice.key}
              className="h-full"
              style={{ width: `${(slice.count / total) * 100}%`, backgroundColor: slice.color }}
            />
          ) : null,
        )}
      </div>
      <figcaption className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        {slices.map((slice) =>
          slice.count > 0 ? (
            <span key={slice.key} className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-sm" style={{ backgroundColor: slice.color }} aria-hidden />
              {slice.label}
            </span>
          ) : null,
        )}
      </figcaption>
    </figure>
  )
}

function TypeMixBars({ types }: { types: TypeShare[] }) {
  const reduce = useReducedMotion()
  const max = Math.max(...types.map((item) => item.count), 1)
  if (types.length === 0) return null
  return (
    <figure className="space-y-1.5">
      <figcaption className="text-[10px] font-medium text-muted-foreground">
        {types.length} signature{types.length === 1 ? '' : 's'}
      </figcaption>
      <ul className="space-y-1.5">
        {types.slice(0, 5).map((item, index) => (
          <li key={item.label} className="flex items-center gap-2 text-[10px]">
            <span className="w-[4.5rem] shrink-0 truncate text-muted-foreground" title={item.label}>
              {item.label}
            </span>
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary/80"
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${(item.count / max) * 100}%` }}
                transition={{ duration: 0.45, delay: reduce ? 0 : index * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
              />
            </div>
            <span className="w-6 shrink-0 text-right tabular-nums text-foreground/80">{item.count}</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

export function SessionMetricPills({
  analytics,
  algorithmCount,
}: {
  analytics: SessionAnalytics
  algorithmCount: number
}) {
  const { t } = useTranslation()
  const pills = [
    { key: 'files', label: t('hashToolkit.stats.files'), value: String(analytics.hashed) },
    { key: 'bytes', label: t('hashToolkit.stats.bytes'), value: formatBytes(analytics.totalBytes) },
    {
      key: 'entropy',
      label: t('hashToolkit.stats.avgEntropy'),
      value: analytics.avgEntropy.toFixed(2),
    },
    { key: 'algos', label: t('hashToolkit.stats.algorithms'), value: String(algorithmCount) },
  ]

  return (
    <ul className="mt-2 grid grid-cols-2 gap-1.5 @md:grid-cols-4">
      {pills.map((pill) => (
        <li key={pill.key} className="min-w-0 rounded-xl border bg-background/80 px-2.5 py-1.5">
          <p className="truncate text-[10px] text-muted-foreground">{pill.label}</p>
          <p className="truncate text-[13px] font-semibold tabular-nums leading-tight">{pill.value}</p>
        </li>
      ))}
    </ul>
  )
}
