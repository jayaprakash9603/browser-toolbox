import { useMemo, useState } from 'react'
import {
  ExpandIcon,
  FocusIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  ScanSearchIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { LinkGraph } from '@/core/engines/links/graph'
import type { GraphLayoutKind } from '@/core/engines/links/graphLayout'
import { SearchInput } from '@/shared/components/SearchInput'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'

import { DEFAULT_GRAPH_FILTERS, type GraphFilters } from './graphStyle'
import { LT_FILTER_CHIP, LT_FILTER_CHIP_IDLE, LT_FILTER_CHIP_ON } from './layout'
import { PageInspector } from './PageInspector'
import { SphereGraph } from './SphereGraph'

const LAYOUTS: GraphLayoutKind[] = ['spherical', 'hierarchical', 'radial', 'force']

interface GraphWorkspaceProps {
  graph: LinkGraph
  selectedId: string | null
  onSelect: (id: string | null) => void
  animated: boolean
  showLabels: boolean
  reducedMotion: boolean
  onInspectAnchors: () => void
}

export function GraphWorkspace({
  graph,
  selectedId,
  onSelect,
  animated,
  showLabels,
  reducedMotion,
  onInspectAnchors,
}: GraphWorkspaceProps) {
  const { t } = useTranslation()
  const [layout, setLayout] = useState<GraphLayoutKind>('spherical')
  const [filters, setFilters] = useState<GraphFilters>({ ...DEFAULT_GRAPH_FILTERS, labels: showLabels })
  const [search, setSearch] = useState('')
  const [paused, setPaused] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [focusToken, setFocusToken] = useState(0)
  const [resetToken, setResetToken] = useState(0)
  const [zoomInToken, setZoomInToken] = useState(0)
  const [zoomOutToken, setZoomOutToken] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const selected = graph.nodes.find((node) => node.id === selectedId) ?? null
  const neighborhood = useMemo(() => {
    if (!collapsed || !selectedId) return null
    const ids = new Set([selectedId])
    for (const edge of graph.edges) {
      if (edge.sourcePageId === selectedId && edge.destinationPageId) ids.add(edge.destinationPageId)
      if (edge.destinationPageId === selectedId) ids.add(edge.sourcePageId)
    }
    return ids
  }, [collapsed, graph.edges, selectedId])

  const graphProps = {
    graph,
    layout,
    selectedId,
    onSelect,
    filters,
    animated: animated && !paused,
    reducedMotion,
    focusToken,
    resetToken,
    zoomInToken,
    zoomOutToken,
    neighborhood,
    search,
  }

  return (
    <div className="flex flex-col gap-3 @[720px]:grid @[720px]:grid-cols-[minmax(0,1fr)_16rem] @[720px]:items-start @[720px]:gap-4">
      <div className="min-w-0 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            size="sm"
            value={layout}
            onValueChange={(value) => setLayout(value as GraphLayoutKind)}
            ariaLabel={t('web.links.tab.graph')}
            options={LAYOUTS.map((value) => ({ value, label: t(`web.links.layout.${value}`) }))}
          />
          <IconBtn label={t('web.links.graph.zoomIn')} onClick={() => setZoomInToken((value) => value + 1)}>
            <ZoomInIcon />
          </IconBtn>
          <IconBtn label={t('web.links.graph.zoomOut')} onClick={() => setZoomOutToken((value) => value + 1)}>
            <ZoomOutIcon />
          </IconBtn>
          <IconBtn label={t('web.links.graph.reset')} onClick={() => setResetToken((value) => value + 1)}>
            <RotateCcwIcon />
          </IconBtn>
          <IconBtn label={t('web.links.graph.fit')} onClick={() => setResetToken((value) => value + 1)}>
            <ScanSearchIcon />
          </IconBtn>
          <IconBtn
            label={paused ? t('web.links.graph.resume') : t('web.links.graph.pause')}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
          </IconBtn>
          <IconBtn label={t('web.links.graph.focus')} onClick={() => setFocusToken((value) => value + 1)}>
            <FocusIcon />
          </IconBtn>
          <IconBtn label={t('web.links.graph.fullscreen')} onClick={() => setExpanded(true)}>
            <ExpandIcon />
          </IconBtn>
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('web.links.graph.search')}
          ariaLabel={t('web.links.graph.search')}
        />
        <div className="flex flex-wrap gap-1">
          <Toggle label={t('web.links.graph.labels')} checked={filters.labels} onChange={(labels) => setFilters((prev) => ({ ...prev, labels }))} />
          <Toggle label={t('web.links.graph.internal')} checked={filters.internal} onChange={(internal) => setFilters((prev) => ({ ...prev, internal }))} />
          <Toggle label={t('web.links.graph.external')} checked={filters.external} onChange={(external) => setFilters((prev) => ({ ...prev, external }))} />
          <Toggle label={t('web.links.graph.broken')} checked={filters.broken} onChange={(broken) => setFilters((prev) => ({ ...prev, broken }))} />
          <Toggle label={t('web.links.graph.nofollow')} checked={filters.nofollow} onChange={(nofollow) => setFilters((prev) => ({ ...prev, nofollow }))} />
          <Toggle label={t('web.links.graph.types')} checked={filters.types} onChange={(types) => setFilters((prev) => ({ ...prev, types }))} />
          <Toggle
            label={collapsed ? t('web.links.graph.expand') : t('web.links.graph.collapse')}
            checked={collapsed}
            onChange={setCollapsed}
          />
        </div>
        {!expanded && <SphereGraph {...graphProps} />}
        <GraphLegend />
      </div>
      <div className="min-w-0">
        {selected ? (
          <PageInspector graph={graph} node={selected} onFocus={() => setFocusToken((value) => value + 1)} onAnchors={onInspectAnchors} />
        ) : (
          <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">{t('web.links.graph.search')}</p>
        )}
      </div>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="w-[min(96vw,64rem)] max-w-5xl p-3">
          <DialogTitle className="sr-only">{t('web.links.graph.fullscreen')}</DialogTitle>
          {expanded && <SphereGraph {...graphProps} expanded className="h-[min(70vh,640px)]" />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="icon-xs" aria-label={label} title={label} onClick={onClick}>
      {children}
    </Button>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={cn(LT_FILTER_CHIP, checked ? LT_FILTER_CHIP_ON : LT_FILTER_CHIP_IDLE)}
    >
      {label}
    </button>
  )
}

function GraphLegend() {
  const { t } = useTranslation()
  const items = [
    ['bg-sky-400', t('web.links.legend.internal')],
    ['bg-violet-400', t('web.links.legend.structural')],
    ['border border-dashed border-amber-500', t('web.links.legend.nofollow')],
    ['border border-dotted border-zinc-400', t('web.links.legend.external')],
    ['bg-red-500', t('web.links.legend.broken')],
  ] as const
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1 text-[10px] text-muted-foreground" aria-label={t('web.links.legend.title')}>
      {items.map(([swatch, label]) => (
        <li key={label} className="flex items-center gap-1">
          <span className={`size-2.5 rounded-full ${swatch}`} />
          {label}
        </li>
      ))}
    </ul>
  )
}

