import { ActivityIcon, PauseIcon, PlayIcon, RotateCcwIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  downsampleSamples,
  formatLatency,
  formatPercent,
  latencyHealth,
  latencyHistogram,
  outageSegments,
  type NetLive,
  type NetSample,
  type NetStatus,
} from '@/core/netmon'
import { LatencyChart } from '@/features/netmon/components/LatencyChart'
import { StatusBadge } from '@/features/netmon/components/StatusBadge'
import { statusColor } from '@/features/netmon/statusStyle'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'

import { LatencyHistogram } from './LatencyHistogram'
import { EmptyState, Panel } from './ui'

const RANGES = { '5m': 5 * 60_000, '1h': 3_600_000, '6h': 6 * 3_600_000, '24h': 24 * 3_600_000 } as const
type RangeKey = keyof typeof RANGES
const TABLE_LIMIT = 300
const CHART_POINTS = 160
const LEGEND: NetStatus[] = ['lan', 'offline', 'nodata']

export function RealtimeTab({
  live,
  samples,
  onReset,
}: {
  live: NetLive | null
  samples: NetSample[]
  onReset: () => void
}) {
  const { t } = useTranslation()
  const [range, setRange] = useState<RangeKey>('1h')
  const [view, setView] = useState<'graph' | 'table'>('graph')
  const [paused, setPaused] = useState(false)
  const [frozen, setFrozen] = useState<NetSample[] | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const active = paused && frozen ? frozen : samples

  const data = useMemo(() => {
    const to = active.at(-1)?.at ?? live?.lastSampleAt ?? 0
    const from = to - RANGES[range]
    const raw = active.filter((s) => s.at >= from)
    const points = downsampleSamples(raw, from, to, CHART_POINTS)
    return {
      from,
      to,
      raw,
      points,
      segments: outageSegments(points, to),
      health: latencyHealth(raw),
      bins: latencyHistogram(raw),
    }
  }, [active, range, live?.lastSampleAt])

  const togglePause = () => {
    if (paused) {
      setPaused(false)
      setFrozen(null)
      return
    }
    setFrozen(samples)
    setPaused(true)
  }

  return (
    <Panel
      actions={
        <>
          <Segmented
            size="sm"
            ariaLabel={t('netmon.realtime.range')}
            value={range}
            onValueChange={setRange}
            options={(Object.keys(RANGES) as RangeKey[]).map((key) => ({ value: key, label: key }))}
          />
          <Segmented
            size="sm"
            ariaLabel={t('netmon.realtime.view')}
            value={view}
            onValueChange={setView}
            options={[
              { value: 'graph', label: t('netmon.realtime.graph') },
              { value: 'table', label: t('netmon.realtime.table') },
            ]}
          />
          <Button
            variant={paused ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={!samples.length}
            onClick={togglePause}
            aria-pressed={paused}
          >
            {paused ? <PlayIcon className="size-3.5" aria-hidden /> : <PauseIcon className="size-3.5" aria-hidden />}
            {paused ? t('netmon.realtime.resume') : t('netmon.realtime.pause')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={!samples.length}
            onClick={() => setConfirmReset(true)}
          >
            <RotateCcwIcon className="size-3.5" aria-hidden />
            {t('netmon.realtime.reset')}
          </Button>
        </>
      }
    >
      <dl className="mb-3 grid grid-cols-3 gap-1.5 text-center @[560px]:grid-cols-6">
        <Summary label={t('netmon.realtime.avg')} value={formatLatency(data.health.avg)} />
        <Summary label={t('netmon.realtime.p50')} value={formatLatency(data.health.p50)} />
        <Summary label={t('netmon.realtime.p95')} value={formatLatency(data.health.p95)} />
        <Summary label={t('netmon.realtime.max')} value={formatLatency(data.health.max)} />
        <Summary label={t('netmon.realtime.jitter')} value={formatLatency(data.health.jitter)} />
        <Summary label={t('netmon.realtime.failed')} value={formatPercent(data.health.failureRate)} />
      </dl>

      {!data.raw.length ? (
        <EmptyState icon={ActivityIcon}>{t('netmon.realtime.empty')}</EmptyState>
      ) : view === 'graph' ? (
        <>
          <LatencyChart points={data.points} segments={data.segments} from={data.from} to={data.to} />
          <p className="mt-3 mb-1 text-[11px] font-medium text-muted-foreground">{t('netmon.realtime.histogram')}</p>
          <LatencyHistogram bins={data.bins} />
          <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ backgroundColor: 'var(--netmon-latency)' }} />
              {t('netmon.realtime.latency')}
            </li>
            {LEGEND.map((status) => (
              <li key={status} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2.5 rounded-[3px]"
                  style={{ backgroundColor: `color-mix(in srgb, ${statusColor(status)} 35%, transparent)` }}
                />
                {t(`netmon.status.${status}`)}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <RealtimeTable samples={data.raw} />
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        {paused ? t('netmon.realtime.pausedHint') : t('netmon.realtime.keep')}
      </p>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={t('netmon.realtime.resetTitle')}
        description={t('netmon.realtime.resetBody')}
        confirmLabel={t('netmon.realtime.reset')}
        destructive
        onConfirm={onReset}
      />
    </Panel>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col-reverse rounded-lg border bg-background/60 px-1.5 py-1.5">
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-xs font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function RealtimeTable({ samples }: { samples: NetSample[] }) {
  const { t } = useTranslation()
  const rows = useMemo(() => samples.slice(-TABLE_LIMIT).reverse(), [samples])
  return (
    <>
      <div className="max-h-96 overflow-auto rounded-xl border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/80 text-left text-[11px] text-muted-foreground backdrop-blur">
            <tr>
              <th className="px-2.5 py-2 font-medium">{t('netmon.realtime.time')}</th>
              <th className="px-2.5 py-2 font-medium">{t('netmon.log.status')}</th>
              <th className="px-2.5 py-2 text-right font-medium">{t('netmon.hero.latency')}</th>
              <th className="hidden px-2.5 py-2 font-medium @[420px]:table-cell">{t('netmon.log.ip')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((s) => (
              <tr key={s.at} className="hover:bg-muted/40">
                <td className="px-2.5 py-1.5 font-mono whitespace-nowrap tabular-nums">
                  {new Date(s.at).toLocaleTimeString()}
                </td>
                <td className="px-2.5 py-1.5">
                  <StatusBadge status={s.status} short />
                </td>
                <td className="px-2.5 py-1.5 text-right font-mono tabular-nums">{formatLatency(s.latency)}</td>
                <td className="hidden px-2.5 py-1.5 font-mono @[420px]:table-cell">{s.ip ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {samples.length > TABLE_LIMIT && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t('netmon.realtime.showing', { count: TABLE_LIMIT, total: samples.length.toLocaleString() })}
        </p>
      )}
    </>
  )
}
