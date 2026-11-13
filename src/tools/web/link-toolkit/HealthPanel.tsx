import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { sendMessage } from '@/core/messaging'
import type { LinkCheckResult } from '@/core/engines/linkChecker/check'
import type { LinkEdge, LinkGraph, NodeHealth } from '@/core/engines/links/graph'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { healthTone } from './graphStyle'
import { LT_FILTER_CHIP, LT_FILTER_CHIP_IDLE, LT_FILTER_CHIP_ON } from './layout'

interface HealthPanelProps {
  graph: LinkGraph
  onRecheck: (hrefs: string[]) => void
}

const ORDER: NodeHealth[] = ['broken', 'server', 'redirect', 'timeout', 'network', 'blocked', 'unchecked', 'ok']

export function HealthPanel({ graph, onRecheck }: HealthPanelProps) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<NodeHealth | 'all'>('all')
  const [hops, setHops] = useState<Record<string, string>>({})
  const edges = useMemo(() => {
    return graph.edges.filter((edge) => (filter === 'all' ? true : edge.destinationHealth === filter))
  }, [filter, graph.edges])
  const counts = useMemo(() => {
    const map = new Map<NodeHealth, number>()
    for (const edge of graph.edges) map.set(edge.destinationHealth, (map.get(edge.destinationHealth) ?? 0) + 1)
    return map
  }, [graph.edges])

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-relaxed text-muted-foreground">{t('web.links.health.hint')}</p>
      <div className="flex flex-wrap gap-1">
        <Chip label={t('web.links.type.all')} active={filter === 'all'} onClick={() => setFilter('all')} />
        {ORDER.map((health) => (
          <Chip
            key={health}
            label={`${t(`web.links.health.${health}`)} ${counts.get(health) ?? 0}`}
            active={filter === health}
            onClick={() => setFilter(health)}
          />
        ))}
      </div>
      <Button size="xs" variant="outline" onClick={() => onRecheck(uniqueDestinations(edges))}>
        {t('web.links.health.recheckSelected')}
      </Button>
      <ul className="space-y-1.5">
        {edges.slice(0, 80).map((edge) => (
          <li key={edge.id} className="rounded-lg border px-2.5 py-2 text-[11px]">
            <p className="truncate">{edge.destinationUrl}</p>
            <p className={cn('mt-0.5', healthTone(edge.destinationHealth))}>{t(`web.links.health.${edge.destinationHealth}`)}</p>
            {hops[edge.destinationUrl] && <p className="text-muted-foreground">{hops[edge.destinationUrl]}</p>}
            <div className="mt-1 flex gap-1">
              <Button size="xs" variant="ghost" onClick={() => onRecheck([edge.destinationUrl])}>
                {t('web.links.health.recheck')}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  void sendMessage<Pick<LinkCheckResult, 'hops' | 'loop'>>({ type: 'TRACE_HTTP_REDIRECTS', href: edge.destinationUrl }).then(
                    (result) => {
                      if (!result) return
                      const label = result.loop
                        ? t('web.links.health.loop')
                        : t('web.links.health.chain', { count: result.hops?.length ?? 0 })
                      setHops((current) => ({ ...current, [edge.destinationUrl]: label }))
                    },
                  )
                }}
              >
                {t('web.links.health.trace')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(LT_FILTER_CHIP, active ? LT_FILTER_CHIP_ON : LT_FILTER_CHIP_IDLE)}
    >
      {label}
    </button>
  )
}

function uniqueDestinations(edges: LinkEdge[]): string[] {
  return [...new Set(edges.map((edge) => edge.destinationUrl))]
}
