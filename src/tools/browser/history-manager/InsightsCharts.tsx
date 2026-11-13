import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/shared/components/ui/chart'

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

function heatClass(count: number): string {
  if (count <= 0) return 'bg-muted/40 text-muted-foreground'
  if (count < 5) return 'bg-violet-500/10 text-violet-900 dark:text-violet-200'
  if (count < 15) return 'bg-violet-500/20 text-violet-950 dark:text-violet-100'
  return 'bg-violet-500/30 text-violet-950 dark:text-violet-50'
}

export default function InsightsCharts({ data, onDayPick }: InsightsChartsProps) {
  const { t } = useTranslation()
  const hourRows = data.byHour.map((count, hour) => ({ hour: `${hour}`, count }))
  const dayRows = data.byDay
  const maxDomain = Math.max(...data.topDomains.map((d) => d.visits), 1)

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className={HM_CHART_SHELL}>
        <p className={HM_SECTION_TITLE}>{t('historyManager.insights.visitsByDay')}</p>
        <ChartContainer config={{ count: { label: 'Visits', color: 'hsl(var(--chart-1))' } }} className="aspect-auto h-[140px] w-full">
          <BarChart data={dayRows} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
            <XAxis dataKey="key" tickLine={false} axisLine={false} fontSize={10} interval="preserveEnd" />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={4}>
              {dayRows.map((row) => (
                <Cell
                  key={row.key}
                  className="cursor-pointer"
                  onClick={() => onDayPick(row.start)}
                  fill="hsl(var(--chart-1))"
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
      <div className={HM_CHART_SHELL}>
        <p className={HM_SECTION_TITLE}>{t('historyManager.insights.byHour')}</p>
        <ChartContainer config={{ count: { label: 'Pages', color: 'hsl(var(--chart-2))' } }} className="aspect-auto h-[120px] w-full">
          <BarChart data={hourRows} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
            <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={9} interval={3} />
            <YAxis hide />
            <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={3} />
          </BarChart>
        </ChartContainer>
      </div>
      <section>
        <p className={HM_SECTION_TITLE}>{t('historyManager.insights.topDomains')}</p>
        <ul className="space-y-1.5 rounded-xl border border-border/70 bg-card/50 p-2 text-sm">
          {data.topDomains.map((row) => (
            <li key={row.domain} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">{row.domain}</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-sky-500/80"
                    style={{ width: `${Math.round((row.visits / maxDomain) * 100)}%` }}
                  />
                </div>
                <span className="shrink-0 tabular-nums text-muted-foreground">{row.visits}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <p className={HM_SECTION_TITLE}>{t('historyManager.insights.heatmap')}</p>
        <div className="grid grid-cols-7 gap-1.5">
          {data.byWeekday.map((row) => (
            <div
              key={row.day}
              className={`rounded-lg border border-border/60 p-1.5 text-center text-[10px] font-medium ${heatClass(row.count)}`}
              title={`${row.label}: ${row.count}`}
            >
              <div>{row.label}</div>
              <div className="mt-0.5 tabular-nums">{row.count}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
