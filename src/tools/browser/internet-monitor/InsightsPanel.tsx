import { ActivityIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  currentStreak,
  formatClockDuration,
  hourHeatmap,
  incidents,
  longestIncident,
  statusMix,
  type NetEvent,
} from '@/core/netmon'
import { StatusBadge } from '@/features/netmon/components/StatusBadge'
import { useNow } from '@/features/netmon/hooks'

import { HourHeatmap } from './HourHeatmap'
import { StatusMixChart } from './StatusMixChart'
import { EmptyState, Panel } from './ui'

const INCIDENT_LIMIT = 6

export function InsightsPanel({ events }: { events: NetEvent[] }) {
  const { t } = useTranslation()
  const now = useNow(5000)
  const reduce = useReducedMotion()
  const data = useMemo(() => {
    const list = incidents(events, now)
    return {
      mix: statusMix(events, now),
      incidents: list.slice(0, INCIDENT_LIMIT),
      longest: longestIncident(list),
      streak: currentStreak(events, now),
      heat: hourHeatmap(events, now),
    }
  }, [events, now])
  const hasMix = Object.values(data.mix).some((ms) => ms > 0)

  if (!hasMix) {
    return (
      <Panel title={t('netmon.insights.title')} description={t('netmon.insights.hint')}>
        <EmptyState icon={ActivityIcon}>{t('netmon.insights.empty')}</EmptyState>
      </Panel>
    )
  }

  return (
    <Panel title={t('netmon.insights.title')} description={t('netmon.insights.hint')}>
      <div className="grid gap-3 @[640px]:grid-cols-[minmax(0,14rem)_1fr]">
        <div className="space-y-3">
          <StatusMixChart mix={data.mix} />
          <dl className="grid grid-cols-2 gap-1.5">
            <InsightStat
              label={t('netmon.insights.streak')}
              value={
                data.streak
                  ? `${formatClockDuration(data.streak.durationMs)}`
                  : '—'
              }
              hint={data.streak ? t(`netmon.statusShort.${data.streak.status}`) : undefined}
            />
            <InsightStat
              label={t('netmon.insights.longest')}
              value={data.longest ? formatClockDuration(data.longest.durationMs) : '—'}
              hint={data.longest ? t(`netmon.statusShort.${data.longest.status}`) : undefined}
            />
          </dl>
        </div>
        <div className="min-w-0">
          {data.incidents.length === 0 ? (
            <p className="rounded-xl border bg-background/60 px-3 py-6 text-center text-xs text-muted-foreground">
              {t('netmon.insights.noIncidents')}
            </p>
          ) : (
            <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border">
              {data.incidents.map((item, index) => (
                <motion.li
                  key={`${item.start}-${item.status}`}
                  initial={reduce ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduce ? 0 : index * 0.04, duration: 0.28 }}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-[11px]"
                >
                  <span className="min-w-0 truncate font-mono tabular-nums text-muted-foreground">
                    {new Date(item.start).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <StatusBadge status={item.status} short />
                  <span className="font-mono tabular-nums">{formatClockDuration(item.durationMs)}</span>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{t('netmon.stats.heatmap')}</p>
        <HourHeatmap cells={data.heat} />
      </div>
    </Panel>
  )
}

function InsightStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border bg-background/60 px-2.5 py-2">
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-mono text-sm font-semibold tabular-nums">{value}</dd>
      {hint && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )
}
