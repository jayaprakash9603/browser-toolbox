import { ActivityIcon } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { formatMbps } from '@/core/speedtest'
import type { SpeedSeriesPoint } from '@/features/speedtest/useSpeedTest'
import { SPEED_DOWN, SPEED_UP } from '@/features/speedtest/style'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/shared/components/ui/chart'

import { EmptyState, Panel } from '../internet-monitor/ui'

export function ThroughputChart({ series, live }: { series: SpeedSeriesPoint[]; live: boolean }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const id = useId().replace(/:/g, '')
  const config = {
    download: { label: t('speedtest.metric.download'), color: SPEED_DOWN },
    upload: { label: t('speedtest.metric.upload'), color: SPEED_UP },
  } satisfies ChartConfig

  return (
    <Panel title={t('speedtest.chart.title')} description={t('speedtest.chart.description')}>
      {series.length < 2 ? (
        <EmptyState icon={ActivityIcon}>{t('speedtest.chart.empty')}</EmptyState>
      ) : (
        <ChartContainer config={config} className="aspect-auto h-48 w-full" role="img" aria-label={t('speedtest.chart.label')}>
          <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              {(['download', 'upload'] as const).map((key) => (
                <linearGradient key={key} id={`${id}-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, 'dataMax']}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tickMargin={6}
              tickFormatter={(v: number) => t('speedtest.chart.seconds', { value: Math.round(v) })}
            />
            <YAxis width={54} tickLine={false} axisLine={false} tickFormatter={(v: number) => String(Math.round(v))} />
            <ChartTooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const at = payload[0]?.payload?.t
                    return typeof at === 'number' ? t('speedtest.chart.seconds', { value: at.toFixed(1) }) : ''
                  }}
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-muted-foreground">{config[name as keyof typeof config]?.label}</span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatMbps(typeof value === 'number' ? value : null)} {t('speedtest.unit')}
                      </span>
                    </div>
                  )}
                />
              }
            />
            {(['download', 'upload'] as const).map((key) => (
              <Area
                key={key}
                dataKey={key}
                type="monotone"
                stroke={`var(--color-${key})`}
                strokeWidth={1.75}
                fill={`url(#${id}-${key})`}
                dot={false}
                connectNulls={false}
                isAnimationActive={!live && !reduceMotion}
                animationDuration={300}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      )}
    </Panel>
  )
}
