import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  formatAvailability,
  formatClockDuration,
  generalStats,
  type GeneralStatsKey,
  type NetEvent,
  type WindowStats,
} from '@/core/netmon'
import { useNow } from '@/features/netmon/hooks'
import { availabilityColor } from '@/features/netmon/statusStyle'

import { Panel } from './ui'

const WINDOWS: GeneralStatsKey[] = ['today', 'week', 'month', 'all']

export function GeneralStatsGrid({ events }: { events: NetEvent[] }) {
  const { t } = useTranslation()
  const now = useNow(5000)
  const stats = useMemo(() => generalStats(events, now), [events, now])

  return (
    <Panel title={t('netmon.general.title')} description={t('netmon.general.hint')}>
      <div className="grid grid-cols-2 gap-2 @[560px]:grid-cols-4">
        {WINDOWS.map((key) => (
          <WindowCard key={key} label={t(`netmon.general.${key}`)} stats={stats[key]} />
        ))}
      </div>
    </Panel>
  )
}

function WindowCard({ label, stats }: { label: string; stats: WindowStats }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const color = availabilityColor(stats.availability)
  const pct = stats.availability === null ? 0 : stats.availability * 100

  return (
    <div className="min-w-0 rounded-xl border bg-background/60 p-2.5">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-mono text-lg leading-none font-semibold tabular-nums" style={{ color }}>
        {formatAvailability(stats.availability)}
      </p>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={`${label} ${t('netmon.general.availability')}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct * 100) / 100}
      >
        <motion.div
          className="h-full origin-left rounded-full"
          style={{ backgroundColor: color }}
          initial={reduceMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
      <dl className="mt-2 space-y-1 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">{t('netmon.general.disconnects')}</dt>
          <dd className="font-mono font-medium tabular-nums">{stats.disconnects}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">{t('netmon.general.downtime')}</dt>
          <dd className="font-mono font-medium tabular-nums">{formatClockDuration(stats.downtimeMs)}</dd>
        </div>
      </dl>
    </div>
  )
}
