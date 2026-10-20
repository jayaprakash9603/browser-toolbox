import { BarChart3Icon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { dailyStats, hourStats, weekdayStats, type NetEvent } from '@/core/netmon'
import { useNow } from '@/features/netmon/hooks'
import { Segmented } from '@/shared/components/ui/segmented'

import { BucketChart, type BucketMetric } from './BucketChart'
import { EmptyState, Panel } from './ui'

const METRICS: BucketMetric[] = ['availability', 'disconnects', 'downtime']

export function StatsTab({ events }: { events: NetEvent[] }) {
  const { t } = useTranslation()
  const now = useNow(60_000)
  const [metric, setMetric] = useState<BucketMetric>('availability')
  const metricLabel = t(`netmon.stats.${metric}`)

  const data = useMemo(
    () => ({
      daily: dailyStats(events, now, 30),
      weekday: weekdayStats(events, now),
      hour: hourStats(events, now),
    }),
    [events, now],
  )
  const hasData = data.daily.some((d) => d.availability !== null)

  return (
    <div className="flex flex-col gap-3">
      <Segmented
        ariaLabel={t('netmon.stats.metric')}
        value={metric}
        onValueChange={setMetric}
        className="self-start"
        options={METRICS.map((m) => ({ value: m, label: t(`netmon.stats.${m}`) }))}
      />
      {!hasData ? (
        <Panel>
          <EmptyState icon={BarChart3Icon}>{t('netmon.stats.empty')}</EmptyState>
        </Panel>
      ) : (
        <>
          <Panel title={t('netmon.stats.daily')} description={metricLabel}>
            <BucketChart
              data={data.daily}
              metric={metric}
              metricLabel={metricLabel}
              ariaLabel={`${t('netmon.stats.daily')}: ${metricLabel}`}
            />
          </Panel>
          <Panel title={t('netmon.stats.weekday')} description={metricLabel}>
            <BucketChart
              data={data.weekday}
              metric={metric}
              metricLabel={metricLabel}
              ariaLabel={`${t('netmon.stats.weekday')}: ${metricLabel}`}
            />
          </Panel>
          <Panel title={t('netmon.stats.hour')} description={metricLabel}>
            <BucketChart
              data={data.hour}
              metric={metric}
              metricLabel={metricLabel}
              ariaLabel={`${t('netmon.stats.hour')}: ${metricLabel}`}
              tickFormatter={(label) => label.split('-')[0]}
            />
          </Panel>
        </>
      )}
    </div>
  )
}
