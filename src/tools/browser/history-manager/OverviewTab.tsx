import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, XAxis } from 'recharts'

import { deriveHistoryStats, sortByRecent, topDomainsFromPages, visitsByDay, type HistoryPage } from '@/core/history-manager'
import { ChartContainer } from '@/shared/components/ui/chart'
import { SiteFavicon } from '@/shared/components/SiteFavicon'

import { HistoryStatsHero } from './HistoryStatsHero'
import { HistoryRow, type HistoryRowActions } from './HistoryRow'
import { HM_CHART_SHELL, HM_SECTION_TITLE } from './layout'

interface OverviewTabProps {
  pages: HistoryPage[]
  compact: boolean
  selected: Set<string>
  rowActions: HistoryRowActions
}

export function OverviewTab({ pages, compact, selected, rowActions }: OverviewTabProps) {
  const { t } = useTranslation()
  const stats = useMemo(() => deriveHistoryStats(pages), [pages])
  const spark = useMemo(() => visitsByDay(pages, 14), [pages])
  const recent = useMemo(() => sortByRecent(pages).slice(0, 8), [pages])
  const top = useMemo(() => topDomainsFromPages(pages, 10), [pages])
  const maxVisits = top[0]?.visits ?? 1

  return (
    <div className="flex flex-col gap-4 pb-4">
      <HistoryStatsHero stats={stats} />
      <div className={HM_CHART_SHELL}>
        <p className={HM_SECTION_TITLE}>{t('historyManager.insights.visitsByDay')}</p>
        <ChartContainer
          config={{ count: { label: 'Visits', color: 'hsl(var(--chart-1))' } }}
          className="aspect-auto h-[108px] w-full"
        >
          <AreaChart data={spark} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="key" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--chart-1))"
              fill="hsl(var(--chart-1))"
              fillOpacity={0.18}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </div>
      <section>
        <h3 className={HM_SECTION_TITLE}>{t('historyManager.sort.recent')}</h3>
        <ul className="space-y-1.5">
          {recent.map((page) => (
            <HistoryRow
              key={page.id}
              page={page}
              selected={selected.has(page.id)}
              compact={compact}
              actions={rowActions}
            />
          ))}
        </ul>
      </section>
      <section>
        <h3 className={HM_SECTION_TITLE}>{t('historyManager.insights.topDomains')}</h3>
        <ul className="space-y-1.5 rounded-xl border border-border/70 bg-card/50 p-2">
          {top.map((row) => (
            <li key={row.domain} className="flex items-center gap-2.5 text-sm">
              <SiteFavicon url={`https://${row.domain}`} />
              <span className="min-w-0 flex-1 truncate font-medium">{row.domain}</span>
              <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-violet-500/75 dark:bg-violet-400/80"
                  style={{ width: `${Math.round((row.visits / maxVisits) * 100)}%` }}
                />
              </div>
              <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{row.visits}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
