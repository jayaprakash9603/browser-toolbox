import { useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'

import { formatAvailability, formatClockDuration, type BucketStats } from '@/core/netmon'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/shared/components/ui/chart'

import { availabilityColor } from '@/features/netmon/statusStyle'

export type BucketMetric = 'availability' | 'disconnects' | 'downtime'

const METRIC_COLORS: Record<BucketMetric, string> = {
  availability: 'var(--netmon-online)',
  disconnects: 'var(--netmon-offline)',
  downtime: 'var(--netmon-lan)',
}

type Row = BucketStats & { value: number | null }

function toValue(bucket: BucketStats, metric: BucketMetric): number | null {
  if (metric === 'availability') return bucket.availability === null ? null : Math.round(bucket.availability * 10000) / 100
  if (metric === 'disconnects') return bucket.disconnects
  return Math.round((bucket.downtimeMs / 60_000) * 10) / 10
}

export function BucketChart({
  data,
  metric,
  metricLabel,
  ariaLabel,
  tickFormatter,
}: {
  data: BucketStats[]
  metric: BucketMetric
  metricLabel: string
  ariaLabel: string
  tickFormatter?: (label: string) => string
}) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const rows = useMemo<Row[]>(() => data.map((b) => ({ ...b, value: toValue(b, metric) })), [data, metric])
  const config = useMemo(
    () => ({ value: { label: metricLabel, color: METRIC_COLORS[metric] } }) satisfies ChartConfig,
    [metric, metricLabel],
  )

  return (
    <ChartContainer config={config} className="aspect-auto h-44 w-full" role="img" aria-label={ariaLabel}>
      <BarChart data={rows} margin={{ top: 6, right: 4, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          minTickGap={8}
          interval="preserveStartEnd"
          tickFormatter={tickFormatter}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          allowDecimals={metric !== 'disconnects'}
          domain={metric === 'availability' ? [(min: number) => Math.max(0, Math.floor(min - 1)), 100] : [0, 'auto']}
        />
        <ChartTooltip
          cursor={{ fillOpacity: 0.5 }}
          content={
            <ChartTooltipContent
              indicator="dot"
              labelFormatter={(_, payload) => {
                const row = payload[0]?.payload as Row | undefined
                return row?.label ?? ''
              }}
              formatter={(_value, _name, item) => {
                const row = item.payload as unknown as Row
                return (
                  <div className="grid w-full gap-1 text-[11px]">
                    <TooltipLine label={t('netmon.general.availability')} value={formatAvailability(row.availability)} />
                    <TooltipLine label={t('netmon.general.disconnects')} value={String(row.disconnects)} />
                    <TooltipLine label={t('netmon.general.downtime')} value={formatClockDuration(row.downtimeMs)} />
                  </div>
                )
              }}
            />
          }
        />
        <Bar
          dataKey="value"
          radius={[4, 4, 0, 0]}
          fill="var(--color-value)"
          maxBarSize={28}
          isAnimationActive={!reduceMotion}
          animationDuration={500}
        >
          {metric === 'availability' &&
            rows.map((row) => <Cell key={row.key} fill={availabilityColor(row.availability)} />)}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

function TooltipLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium tabular-nums">{value}</span>
    </div>
  )
}
