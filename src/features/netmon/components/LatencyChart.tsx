import { useReducedMotion } from 'motion/react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, CartesianGrid, ReferenceArea, XAxis, YAxis } from 'recharts'

import { formatLatency, type RealtimePoint, type StatusSegment } from '@/core/netmon'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/shared/components/ui/chart'
import { cn } from '@/shared/utils/cn'

import { statusColor } from '../statusStyle'
import { StatusBadge } from './StatusBadge'

const chartConfig = {
  latency: { label: 'Latency', color: 'var(--netmon-latency)' },
} satisfies ChartConfig

function timeLabel(ts: number, withSeconds: boolean): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  })
}

export function LatencyChart({
  points,
  segments,
  from,
  to,
  compact = false,
  className,
}: {
  points: RealtimePoint[]
  segments: StatusSegment[]
  from: number
  to: number
  compact?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const gradientId = `netmon-latency-${useId().replace(/:/g, '')}`
  const reduceMotion = useReducedMotion()
  const shortRange = to - from <= 30 * 60_000

  return (
    <ChartContainer
      config={chartConfig}
      className={cn('aspect-auto w-full', compact ? 'h-14' : 'h-52', className)}
      role="img"
      aria-label={t('netmon.realtime.chartLabel')}
    >
      <AreaChart
        data={points}
        margin={compact ? { top: 4, right: 0, bottom: 0, left: 0 } : { top: 8, right: 8, bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-latency)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-latency)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {!compact && <CartesianGrid vertical={false} />}
        <XAxis
          dataKey="at"
          type="number"
          scale="time"
          domain={[from, to]}
          hide={compact}
          tickLine={false}
          axisLine={false}
          minTickGap={36}
          tickMargin={6}
          tickFormatter={(v: number) => timeLabel(v, shortRange)}
        />
        <YAxis hide={compact} width={54} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v} ms`} />
        {segments.map((s) => (
          <ReferenceArea
            key={`${s.start}-${s.status}`}
            x1={s.start}
            x2={Math.max(s.end, s.start + 1)}
            fill={statusColor(s.status)}
            fillOpacity={compact ? 0.28 : 0.18}
            strokeOpacity={0}
            ifOverflow="hidden"
          />
        ))}
        {!compact && (
          <ChartTooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(_, payload) => {
                  const at = payload[0]?.payload?.at
                  return typeof at === 'number' ? timeLabel(at, true) : ''
                }}
                formatter={(value, _name, item) => (
                  <div className="flex w-full items-center justify-between gap-3">
                    <StatusBadge status={(item.payload as unknown as RealtimePoint).status} />
                    <span className="font-mono font-medium tabular-nums">
                      {formatLatency(typeof value === 'number' ? value : null)}
                    </span>
                  </div>
                )}
              />
            }
          />
        )}
        <Area
          dataKey="latency"
          type="monotone"
          stroke="var(--color-latency)"
          strokeWidth={compact ? 1.5 : 1.75}
          fill={`url(#${gradientId})`}
          dot={false}
          connectNulls={false}
          isAnimationActive={!compact && !reduceMotion}
          animationDuration={400}
        />
      </AreaChart>
    </ChartContainer>
  )
}
