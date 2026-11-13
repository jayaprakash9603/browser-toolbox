import { useTranslation } from 'react-i18next'

import type { HistoryStats } from '@/core/history-manager'
import { cn } from '@/shared/utils/cn'

type StatAccent = false | 'active' | 'insight'

function StatCell({
  label,
  value,
  accent = false,
  className,
}: {
  label: string
  value: string | number
  accent?: StatAccent
  className?: string
}) {
  return (
    <article
      className={cn(
        'min-h-[4rem] rounded-xl border bg-card/95 p-2.5 shadow-xs',
        accent === 'active' && 'border-sky-500/25 bg-sky-500/5',
        accent === 'insight' && 'border-violet-500/20 bg-violet-500/5',
        className,
      )}
    >
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 truncate text-base font-semibold tabular-nums leading-none tracking-tight',
          accent === 'active' && 'text-sky-800 dark:text-sky-200',
          accent === 'insight' && 'text-violet-900 dark:text-violet-200',
        )}
      >
        {value}
      </p>
    </article>
  )
}

export function HistoryStatsHero({ stats }: { stats: HistoryStats }) {
  const { t } = useTranslation()
  const peak =
    stats.peakHour === null ? '—' : `${String(stats.peakHour).padStart(2, '0')}:00 (${stats.peakHourCount})`

  return (
    <section aria-label={t('historyManager.stats.aria')} className="space-y-2">
      <div className="grid grid-cols-2 gap-2 @xs:grid-cols-3 @md:gap-2.5">
        <StatCell label={t('historyManager.stats.total')} value={stats.totalPages} />
        <StatCell label={t('historyManager.stats.sites')} value={stats.uniqueDomains} accent="insight" />
        <StatCell
          label={t('historyManager.stats.today')}
          value={stats.todayVisits}
          accent={stats.todayVisits > 0 ? 'active' : false}
        />
        <StatCell label={t('historyManager.stats.yesterday')} value={stats.yesterdayVisits} />
        <StatCell label={t('historyManager.stats.week')} value={stats.weekVisits} />
        <StatCell
          label={t('historyManager.stats.topSite')}
          value={stats.topDomain ?? '—'}
          className="col-span-2 @xs:col-span-1"
        />
      </div>
      <StatCell label={t('historyManager.stats.peakHour')} value={peak} accent={stats.peakHourCount > 0 ? 'insight' : false} />
    </section>
  )
}
