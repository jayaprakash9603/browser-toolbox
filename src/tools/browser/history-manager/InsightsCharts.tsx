import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'

import { chartColor, chartColorAt } from '@/shared/chart/series'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/shared/components/ui/chart'

import { DomainRankList } from './DomainRankList'
import { HM_CHART_SHELL, HM_SECTION_TITLE } from './layout'

interface InsightsChartsProps {
  data: {
    byDay: { key: string; count: number; start: number }[]
    byHour: number[]
    byWeekday: { day: number; label: string; count: number }[]
    topDomains: { domain: string; visits: number }[]
  }
  onDayPick: (start: number) => void
}

const CHART_MARGIN = { left: 4, right: 8, top: 10, bottom: 8 }

function heatClass(count: number, max: number): string {
  if (count <= 0) return 'border-border/50 bg-muted/40 text-muted-foreground'
  const ratio = count / Math.max(max, 1)
  if (ratio < 0.2) return 'border-primary/15 bg-primary/10 text-foreground'
  if (ratio < 0.45) return 'border-primary/25 bg-primary/20 text-foreground'
  if (ratio < 0.7) return 'border-[hsl(var(--chart-2)/0.35)] bg-[hsl(var(--chart-2)/0.22)] text-foreground'
  return 'border-primary/40 bg-primary/35 text-primary-foreground'
}

export default function InsightsCharts({ data, onDayPick }: InsightsChartsProps) {
  const { t } = useTranslation()
  const hourRows = data.byHour.map((count, hour) => ({ hour: `${hour}`, count }))
  const dayRows = data.byDay
  const maxWeekday = Math.max(...data.byWeekday.map((d) => d.count), 1)
  const visitsColor = chartColor(1)
  const hourColor = chartColor(2)

  return (
    <div className="flex flex-col gap-4">
      <div className={HM_CHART_SHELL}>
        <p className={HM_SECTION_TITLE}>{t('historyManager.insights.visitsByDay')}</p>
        <ChartContainer config={{ count: { label: 'Visits', color: visitsColor } }} className="aspect-auto h-[148px] w-full">
          <BarChart data={dayRows} margin={CHART_MARGIN}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.55} />
            <XAxis dataKey="key" tickLine={false} axisLine={false} fontSize={10} interval="preserveEnd" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={4}>
              {dayRows.map((row, index) => (
                <Cell
                  key={row.key}
                  className="cursor-pointer"
                  onClick={() => onDayPick(row.start)}
                  fill={index === dayRows.length - 1 ? chartColor(4) : visitsColor}
                  fillOpacity={index === dayRows.length - 1 ? 1 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
      <div className={HM_CHART_SHELL}>
        <p className={HM_SECTION_TITLE}>{t('historyManager.insights.byHour')}</p>
        <ChartContainer config={{ count: { label: 'Pages', color: hourColor } }} className="aspect-auto h-[132px] w-full">
          <BarChart data={hourRows} margin={CHART_MARGIN}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.55} />
            <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={9} interval={3} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={3}>
              {hourRows.map((row, index) => (
                <Cell key={row.hour} fill={chartColorAt(index % 6)} fillOpacity={0.9} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
      <DomainRankList title={t('historyManager.insights.topDomains')} rows={data.topDomains} barToken={3} />
      <section className={HM_CHART_SHELL}>
        <p className={HM_SECTION_TITLE}>{t('historyManager.insights.heatmap')}</p>
        <div className="grid grid-cols-7 gap-2">
          {data.byWeekday.map((row) => (
            <div
              key={row.day}
              className={`rounded-xl border p-2 text-center text-[10px] font-medium ${heatClass(row.count, maxWeekday)}`}
              title={`${row.label}: ${row.count}`}
            >
              <div>{row.label}</div>
              <div className="mt-1 tabular-nums">{row.count}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
