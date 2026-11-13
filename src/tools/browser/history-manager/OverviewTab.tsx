import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, XAxis } from 'recharts'

import { deriveHistoryStats, sortByRecent, topDomainsFromPages, visitsByDay, type HistoryPage } from '@/core/history-manager'
import { chartColor } from '@/shared/chart/series'
import { ChartContainer } from '@/shared/components/ui/chart'

import { DomainRankList } from './DomainRankList'
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

  return (
    <div className="flex flex-col gap-4">
      <HistoryStatsHero stats={stats} />
      <div className={HM_CHART_SHELL}>
        <p className={HM_SECTION_TITLE}>{t('historyManager.insights.visitsByDay')}</p>
        <ChartContainer
          config={{ count: { label: 'Visits', color: chartColor(1) } }}
          className="aspect-auto h-[128px] w-full"
        >
          <AreaChart data={spark} margin={{ top: 10, right: 8, left: 4, bottom: 8 }}>
            <XAxis dataKey="key" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Area
              type="monotone"
              dataKey="count"
              stroke={chartColor(1)}
              fill={chartColor(1)}
              fillOpacity={0.22}
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
      <DomainRankList title={t('historyManager.insights.topDomains')} rows={top} />
    </div>
  )
}
