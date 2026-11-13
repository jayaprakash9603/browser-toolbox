import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { LinkEdge, LinkGraph } from '@/core/engines/links/graph'
import { SearchInput } from '@/shared/components/SearchInput'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { healthTone } from './graphStyle'
import { LT_FILTER_CHIP, LT_FILTER_CHIP_IDLE, LT_FILTER_CHIP_ON } from './layout'

interface EdgeTableProps {
  graph: LinkGraph
  kind: 'internal' | 'external'
}

type GroupKey = 'none' | 'source' | 'destination' | 'anchor'

export function EdgeTable({ graph, kind }: EdgeTableProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<GroupKey>('none')
  const [onlyNofollow, setOnlyNofollow] = useState(false)
  const [onlyEmpty, setOnlyEmpty] = useState(false)
  const [onlyBroken, setOnlyBroken] = useState(false)
  const edges = useMemo(() => {
    const query = search.trim().toLowerCase()
    return graph.edges.filter((edge) => {
      if (edge.linkType !== kind) return false
      if (onlyNofollow && !edge.nofollow) return false
      if (onlyEmpty && edge.occurrences.every((item) => item.anchorText.trim())) return false
      if (onlyBroken && edge.destinationHealth !== 'broken') return false
      if (!query) return true
      const source = graph.nodes.find((node) => node.id === edge.sourcePageId)?.url ?? ''
      return `${source} ${edge.destinationUrl} ${edge.anchorText}`.toLowerCase().includes(query)
    })
  }, [graph, kind, onlyBroken, onlyEmpty, onlyNofollow, search])

  return (
    <div className="space-y-2">
      <SearchInput value={search} onChange={setSearch} placeholder={t('web.links.searchPlaceholder')} ariaLabel={t('web.links.searchPlaceholder')} />
      <div className="flex flex-wrap gap-1">
        {(['none', 'source', 'destination', 'anchor'] as const).map((key) => (
          <FilterChip key={key} pressed={group === key} onClick={() => setGroup(key)}>
            {key === 'none' ? t('web.links.viewList') : t(`web.links.groupBy.${key}`)}
          </FilterChip>
        ))}
        <FilterChip pressed={onlyNofollow} onClick={() => setOnlyNofollow((value) => !value)}>
          {t('web.links.flag.nofollow')}
        </FilterChip>
        <FilterChip pressed={onlyEmpty} onClick={() => setOnlyEmpty((value) => !value)}>
          {t('web.links.filter.emptyAnchor')}
        </FilterChip>
        <FilterChip pressed={onlyBroken} onClick={() => setOnlyBroken((value) => !value)}>
          {t('web.links.flag.broken')}
        </FilterChip>
      </div>
      <p className="text-[11px] text-muted-foreground">{t('web.links.resultCount', { count: edges.length })}</p>
      {groupedEdges(edges, graph, group).map((bucket) => (
        <div key={bucket.label || 'all'} className="space-y-1.5">
          {bucket.label ? <p className="truncate text-[11px] font-medium text-muted-foreground">{bucket.label}</p> : null}
          <ul className="space-y-1.5">
            {bucket.edges.slice(0, 120).map((edge) => (
              <EdgeRow key={edge.id} edge={edge} graph={graph} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function FilterChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(LT_FILTER_CHIP, pressed ? LT_FILTER_CHIP_ON : LT_FILTER_CHIP_IDLE)}
    >
      {children}
    </button>
  )
}

function groupedEdges(edges: LinkEdge[], graph: LinkGraph, group: GroupKey): { label: string; edges: LinkEdge[] }[] {
  if (group === 'none') return [{ label: '', edges }]
  const buckets = new Map<string, LinkEdge[]>()
  for (const edge of edges) {
    const label = groupLabel(edge, graph, group)
    const list = buckets.get(label) ?? []
    list.push(edge)
    buckets.set(label, list)
  }
  return [...buckets.entries()].map(([label, grouped]) => ({ label, edges: grouped }))
}

function groupLabel(edge: LinkEdge, graph: LinkGraph, group: Exclude<GroupKey, 'none'>): string {
  if (group === 'destination') return edge.destinationUrl
  if (group === 'anchor') return edge.anchorText.trim() || '—'
  return graph.nodes.find((node) => node.id === edge.sourcePageId)?.url ?? edge.sourcePageId
}

function EdgeRow({ edge, graph }: { edge: LinkEdge; graph: LinkGraph }) {
  const source = graph.nodes.find((node) => node.id === edge.sourcePageId)
  return (
    <li className="rounded-lg border bg-card px-2.5 py-2 text-[11px]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{edge.anchorText || '—'}</p>
          <p className="truncate text-muted-foreground" title={source?.url}>
            {source?.url}
          </p>
          <p className={cn('truncate', healthTone(edge.destinationHealth))} title={edge.destinationUrl}>
            {edge.destinationUrl}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <CopyButton text={edge.destinationUrl} />
          <Button size="icon-xs" variant="ghost" onClick={() => window.open(edge.destinationUrl, '_blank', 'noopener')}>
            ↗
          </Button>
        </div>
      </div>
      <p className="mt-1 text-muted-foreground">
        {edge.nofollow ? 'nofollow ' : ''}
        {edge.sponsored ? 'sponsored ' : ''}
        {edge.ugc ? 'ugc ' : ''}
        {edge.occurrenceCount > 1 ? `${edge.occurrenceCount}×` : ''}
      </p>
    </li>
  )
}
