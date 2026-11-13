import { lazy, Suspense, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { topDomainsFromPages, visitsByDay, visitsByHour, visitsByWeekday, type HistoryPage } from '@/core/history-manager'
import { EmptyState } from '@/shared/components/EmptyState'
import { BarChart3Icon } from 'lucide-react'

const InsightsCharts = lazy(() => import('./InsightsCharts'))

interface InsightsTabProps {
  pages: HistoryPage[]
  onDayPick: (start: number) => void
}

export default function InsightsTab({ pages, onDayPick }: InsightsTabProps) {
  const { t } = useTranslation()
  const data = useMemo(
    () => ({
      byDay: visitsByDay(pages, 14),
      byHour: visitsByHour(pages),
      byWeekday: visitsByWeekday(pages),
      topDomains: topDomainsFromPages(pages, 8),
    }),
    [pages],
  )

  if (pages.length === 0) {
    return <EmptyState icon={BarChart3Icon} title={t('historyManager.empty')} />
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      <p className="text-xs text-muted-foreground">{t('historyManager.insights.hourNote')}</p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{t('historyManager.loading')}</p>}>
        <InsightsCharts data={data} onDayPick={onDayPick} />
      </Suspense>
    </div>
  )
}
