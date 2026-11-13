import { useTranslation } from 'react-i18next'
import { Bar, BarChart, Cell, XAxis } from 'recharts'

import type { LinkGraph } from '@/core/engines/links/graph'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/shared/components/ui/chart'
import { cn } from '@/shared/utils/cn'

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
    { key: 'internal', count: stats.internalLinks },
    { key: 'external', count: stats.externalLinks },
  ]
  const depth = depthRows(graph)
  const topPages = [...graph.nodes]
    .filter((node) => !node.isExternal)
    .sort((a, b) => b.incomingCount - a.incomingCount)
    .slice(0, 5)
  const domains = topDomains(graph)

  return (
    <div className="space-y-3">
      {stats.incomplete && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
          {t('web.links.incompleteCrawl')}
        </p>
      )}
      <div className="grid grid-cols-2 gap-1.5 @[520px]:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-card px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <MiniChart title={t('web.links.chart.internalExternal')} data={mix} />
      <MiniChart title={t('web.links.chart.health')} data={healthMix(graph, (health) => t(`web.links.health.${health}`))} />
      <MiniChart title={t('web.links.chart.depth')} data={depth} />
      <RankList title={t('web.links.chart.topPages')} rows={topPages.map((node) => [node.title || node.url, node.incomingCount])} />
      <RankList title={t('web.links.chart.topDomains')} rows={domains} />
      <p className="text-[11px] text-muted-foreground">{t('web.links.importanceHint')}</p>
    </div>
  )
}

function MiniChart({ title, data }: { title: string; data: { key: string; count: number }[] }) {
  return (
    <div className="rounded-xl border p-2.5">
      <p className="mb-1 text-[11px] font-medium">{title}</p>
      <ChartContainer config={{ count: { label: title, color: 'hsl(var(--chart-1))' } }} className="aspect-auto h-[88px] w-full min-w-[1px]">
        <BarChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <XAxis dataKey="key" tickLine={false} axisLine={false} fontSize={10} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" radius={4}>
            {data.map((row) => (
              <Cell key={row.key} fill="hsl(var(--chart-1))" />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}

function RankList({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((row) => row[1]))
  return (
    <div className="rounded-xl border p-2.5">
      <p className="mb-2 text-[11px] font-medium">{title}</p>
      <ul className="space-y-1.5">
        {rows.map(([label, count]) => (
          <li key={label} className="min-w-0">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate">{label}</span>
              <span className="tabular-nums text-muted-foreground">{count}</span>
            </div>
            <div className="mt-0.5 h-1 rounded-full bg-muted">
              <div className={cn('h-1 rounded-full bg-primary')} style={{ width: `${(count / max) * 100}%` }} />
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

function healthMix(graph: LinkGraph, label: (health: string) => string): { key: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const edge of graph.edges) {
    counts.set(edge.destinationHealth, (counts.get(edge.destinationHealth) ?? 0) + 1)
  }
  return [...counts.entries()].map(([key, count]) => ({ key: label(key), count }))
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
