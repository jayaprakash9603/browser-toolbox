import { useTranslation } from 'react-i18next'

import type { LinkEdge, LinkGraph, PageNode } from '@/core/engines/links/graph'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { healthTone } from './graphStyle'

interface PageInspectorProps {
  graph: LinkGraph
  node: PageNode
  onFocus: () => void
  onAnchors: () => void
}

export function PageInspector({ graph, node, onFocus, onAnchors }: PageInspectorProps) {
  const { t } = useTranslation()
  const incoming = graph.edges.filter((edge) => edge.destinationPageId === node.id)
  const outgoing = graph.edges.filter((edge) => edge.sourcePageId === node.id)
  return (
    <section className="rounded-xl border bg-card p-3 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{node.title || node.url}</p>
          <p className="truncate text-muted-foreground" title={node.url}>
            {node.url}
          </p>
        </div>
        <CopyButton text={node.url} label={t('web.links.inspector.copy')} />
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
        <Item label={t(`web.links.pageType.${node.pageType}`)} value={t(`web.links.health.${node.health}`)} tone={healthTone(node.health)} />
        <Item label={t('web.links.linkDepth')} value={node.linkDepth == null ? t('web.links.depthUnknown') : String(node.linkDepth)} />
        <Item label={t('web.links.incomingCount', { count: node.incomingCount })} value={String(node.incomingCount)} />
        <Item label={t('web.links.outgoingCount', { count: node.outgoingCount })} value={String(node.outgoingCount)} />
        {node.canonical && <Item label={t('web.links.canonical')} value={node.canonical} />}
        {node.robots && <Item label={t('web.links.robots')} value={node.robots} />}
        {node.status != null && <Item label={t('web.links.statusCode', { status: node.status })} value={String(node.status)} />}
        <Item label={t('web.links.importance')} value={String(node.importance)} />
      </dl>
      {node.isOrphan && (
        <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
          {node.orphanConfidence === 'crawl-incomplete' ? t('web.links.orphanIncomplete') : t('web.links.orphanIsolated')}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button size="xs" variant="outline" onClick={() => window.open(node.url, '_blank', 'noopener')}>
          {t('web.links.inspector.open')}
        </Button>
        <Button size="xs" variant="outline" onClick={onFocus}>
          {t('web.links.inspector.inGraph')}
        </Button>
        <Button size="xs" variant="outline" onClick={onAnchors}>
          {t('web.links.inspector.anchors')}
        </Button>
      </div>
      <EdgeList title={t('web.links.inspector.incoming')} edges={incoming} graph={graph} mode="in" />
      <EdgeList title={t('web.links.inspector.outgoing')} edges={outgoing} graph={graph} mode="out" />
    </section>
  )
}

function Item({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('truncate font-medium', tone)} title={value}>
        {value}
      </dd>
    </div>
  )
}

function EdgeList({
  title,
  edges,
  graph,
  mode,
}: {
  title: string
  edges: LinkEdge[]
  graph: LinkGraph
  mode: 'in' | 'out'
}) {
  if (edges.length === 0) return null
  return (
    <div className="mt-3">
      <p className="mb-1 font-medium">{title}</p>
      <ul className="max-h-40 space-y-1 overflow-auto">
        {edges.slice(0, 40).map((edge) => {
          const other = mode === 'in' ? graph.nodes.find((node) => node.id === edge.sourcePageId) : null
          return (
            <li key={edge.id} className="rounded-md border px-2 py-1">
              <p className="truncate">{edge.anchorText || edge.destinationUrl}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {mode === 'in' ? other?.url ?? edge.sourcePageId : edge.destinationUrl}
                {edge.nofollow ? ' · nofollow' : ''}
                {edge.sponsored ? ' · sponsored' : ''}
                {edge.ugc ? ' · ugc' : ''}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
