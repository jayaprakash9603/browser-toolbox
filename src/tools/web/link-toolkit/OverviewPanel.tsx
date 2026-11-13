import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Cell, XAxis } from 'recharts'

import type { LinkGraph } from '@/core/engines/links/graph'
import { chartColor, chartColorAt, type ChartToken } from '@/shared/chart/series'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/shared/components/ui/chart'
import { cn } from '@/shared/utils/cn'

import { LT_CHART_SHELL, LT_SECTION_TITLE, LT_STAT_CARD } from './layout'

interface OverviewPanelProps {
  graph: LinkGraph
}

export function OverviewPanel({ graph }: OverviewPanelProps) {
  const { t } = useTranslation()
  const stats = graph.stats
  const cards = [
    [t('web.links.card.pages'), stats.pages],
    [t('web.links.card.internal'), stats.internalLinks],
    [t('web.links.card.external'), stats.externalLinks],
    [t('web.links.card.destinations'), stats.uniqueDestinations],
    [t('web.links.card.broken'), stats.brokenDestinations],
    [t('web.links.card.orphans'), stats.orphanPages],
    [t('web.links.card.nofollow'), stats.nofollowLinks],
    [t('web.links.card.empty'), stats.emptyAnchors],
  ] as const
  const mix = [
    { key: t('web.links.tab.internal'), count: stats.internalLinks, fill: chartColor(1) },
    { key: t('web.links.tab.external'), count: stats.externalLinks, fill: chartColor(4) },
  ]
  const depth = depthRows(graph)
  const topPages = [...graph.nodes]
    .filter((node) => !node.isExternal)
    .sort((a, b) => b.incomingCount - a.incomingCount)
    .slice(0, 5)
  const domains = topDomains(graph)
  const health = healthMix(graph, (health) => t(`web.links.health.${health}`))

  return (
    <div className="flex flex-col gap-4 pb-2">
      {stats.incomplete && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[11px] text-amber-800 dark:text-amber-200">
          {t('web.links.incompleteCrawl')}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 @xs:grid-cols-2 @[520px]:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className={LT_STAT_CARD}>
            <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums leading-none">{value}</p>
          </div>
        ))}
      </div>
      <MiniChart title={t('web.links.chart.internalExternal')} data={mix} />
      <MiniChart title={t('web.links.chart.health')} data={health} varied />
      <MiniChart title={t('web.links.chart.depth')} data={depth} varied />
      <RankList title={t('web.links.chart.topPages')} rows={topPages.map((node) => [node.title || node.url, node.incomingCount])} />
      <RankList title={t('web.links.chart.topDomains')} rows={domains} barToken={2} />
      <p className="text-[11px] leading-relaxed text-muted-foreground">{t('web.links.importanceHint')}</p>
    </div>
  )
}

type ChartRow = { key: string; count: number; fill?: string }

function MiniChart({ title, data, varied }: { title: string; data: ChartRow[]; varied?: boolean }) {
  const accent = chartColor(1)
  return (
    <div className={LT_CHART_SHELL}>
      <p className={LT_SECTION_TITLE}>{title}</p>
      <ChartContainer config={{ count: { label: title, color: accent } }} className="aspect-auto h-[96px] w-full min-w-[1px]">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.55} />
          <XAxis dataKey="key" tickLine={false} axisLine={false} fontSize={10} interval={0} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" radius={4}>
            {data.map((row, index) => (
              <Cell key={row.key} fill={row.fill ?? (varied ? chartColorAt(index) : accent)} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}

function RankList({
  title,
  rows,
  barToken = 1,
}: {
  title: string
  rows: [string, number][]
  barToken?: ChartToken
}) {
  const max = Math.max(1, ...rows.map((row) => row[1]))
  const barColor = chartColor(barToken)
  return (
    <div className={LT_CHART_SHELL}>
      <p className={LT_SECTION_TITLE}>{title}</p>
      <ul className="space-y-2">
        {rows.map(([label, count]) => (
          <li key={label} className="min-w-0">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate">{label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{count}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn('h-full rounded-full')} style={{ width: `${(count / max) * 100}%`, backgroundColor: barColor }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function depthRows(graph: LinkGraph): { key: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const node of graph.nodes) {
    if (node.isExternal) continue
    const key = node.linkDepth == null ? '—' : String(node.linkDepth)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()].map(([key, count]) => ({ key, count }))
}

function healthMix(graph: LinkGraph, label: (health: string) => string): ChartRow[] {
  const counts = new Map<string, number>()
  for (const edge of graph.edges) {
    counts.set(edge.destinationHealth, (counts.get(edge.destinationHealth) ?? 0) + 1)
  }
  return [...counts.entries()].map(([key, count], index) => ({
    key: label(key),
    count,
    fill: healthChartColor(key, index),
  }))
}

function healthChartColor(health: string, index: number): string {
  if (health === 'ok') return chartColor(3)
  if (health === 'broken') return 'var(--destructive)'
  if (health === 'redirect' || health === 'blocked' || health === 'server') return chartColor(5)
  return chartColorAt(index)
}

function topDomains(graph: LinkGraph): [string, number][] {
  const counts = new Map<string, number>()
  for (const edge of graph.edges) {
    if (edge.linkType !== 'external') continue
    try {
      const host = new URL(edge.destinationUrl).hostname.replace(/^www\./, '')
      counts.set(host, (counts.get(host) ?? 0) + edge.occurrenceCount)
    } catch {
      /* skip */
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
}
