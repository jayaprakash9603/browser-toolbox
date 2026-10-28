import { useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'

import { type HistogramBin } from '@/core/netmon'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/shared/components/ui/chart'

const config = {
  count: { label: 'Samples', color: 'var(--netmon-latency)' },
} satisfies ChartConfig

export function LatencyHistogram({ bins }: { bins: HistogramBin[] }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  if (!bins.length) return null
  const rows = bins.map((bin) => ({
    ...bin,
    label: `${bin.from}–${bin.to}`,
  }))

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-28 w-full"
      role="img"
      aria-label={t('netmon.realtime.histogram')}
    >
      <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={4} minTickGap={12} fontSize={10} />
        <YAxis hide allowDecimals={false} />
        <ChartTooltip
          cursor={{ fillOpacity: 0.4 }}
          content={
            <ChartTooltipContent
              indicator="dot"
              labelFormatter={(_, payload) => {
                const row = payload[0]?.payload as HistogramBin | undefined
                return row ? t('netmon.realtime.bin', { from: row.from, to: row.to }) : ''
              }}
            />
          }
        />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[3, 3, 0, 0]}
          maxBarSize={22}
          isAnimationActive={!reduce}
          animationDuration={400}
        />
      </BarChart>
    </ChartContainer>
  )
}
