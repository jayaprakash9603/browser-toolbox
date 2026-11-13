import { useTranslation } from 'react-i18next'

import { formatBytes, formatSpeed, type DownloadLiveSnapshot } from '@/core/download-manager'
import { cn } from '@/shared/utils/cn'

type MetricAccent = false | true | 'danger'

function MetricHalf({
  label,
  value,
  accent,
  align = 'start',
}: {
  label: string
  value: string | number
  accent?: MetricAccent
  align?: 'start' | 'end'
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-0.5',
        align === 'end' && 'items-end text-right',
        accent === true && 'text-sky-700 dark:text-sky-300',
        accent === 'danger' && 'text-rose-700 dark:text-rose-300',
      )}
    >
      <span className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="truncate text-base font-semibold tabular-nums leading-none tracking-tight @xs:text-lg">{value}</span>
    </div>
  )
}

function DuoStatCard({
  left,
  right,
  highlight,
  className,
}: {
  left: { label: string; value: string | number; accent?: MetricAccent }
  right: { label: string; value: string | number; accent?: MetricAccent }
  highlight?: 'active' | 'danger' | false
  className?: string
}) {
  const summary = `${left.label} ${left.value}, ${right.label} ${right.value}`
  return (
    <article
      aria-label={summary}
      className={cn(
        'min-h-[4.25rem] rounded-xl border bg-card/90 p-2.5 shadow-xs',
        highlight === 'active' && 'border-sky-500/25 bg-sky-500/5',
        highlight === 'danger' && 'border-rose-500/20 bg-rose-500/5',
        className,
      )}
    >
      <div className="flex h-full items-stretch gap-2">
        <MetricHalf label={left.label} value={left.value} accent={left.accent} />
        <div className="w-px shrink-0 self-stretch bg-border/80" aria-hidden />
        <MetricHalf label={right.label} value={right.value} accent={right.accent} align="end" />
      </div>
    </article>
  )
}

export function DownloadStatsHero({ snapshot }: { snapshot: DownloadLiveSnapshot | null }) {
  const { t } = useTranslation()
  const stats = snapshot?.stats
  const active = stats?.active ?? 0
  const failed = stats?.failed ?? 0

  return (
    <section aria-label={t('downloadManager.stats.aria')}>
      <div className="grid grid-cols-3 gap-2 @md:gap-2.5">
        <DuoStatCard
          highlight={active > 0 ? 'active' : false}
          left={{ label: t('downloadManager.stats.total'), value: stats?.total ?? 0 }}
          right={{
            label: t('downloadManager.stats.active'),
            value: active,
            accent: active > 0 ? true : false,
          }}
        />
        <DuoStatCard
          highlight={failed > 0 ? 'danger' : false}
          left={{ label: t('downloadManager.stats.completed'), value: stats?.completed ?? 0 }}
          right={{
            label: t('downloadManager.stats.failed'),
            value: failed,
            accent: failed > 0 ? 'danger' : false,
          }}
        />
        <DuoStatCard
          left={{ label: t('downloadManager.stats.data'), value: formatBytes(stats?.bytesCompleted ?? 0) }}
          right={{ label: t('downloadManager.stats.speed'), value: formatSpeed(stats?.aggregateSpeedBps ?? 0) }}
        />
      </div>
    </section>
  )
}
