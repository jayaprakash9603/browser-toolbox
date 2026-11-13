import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { analyzeAnchorText, brandTermsFromGraph } from '@/core/engines/links/anchorIntel'
import type { LinkGraph } from '@/core/engines/links/graph'
import { SearchInput } from '@/shared/components/SearchInput'

interface AnchorPanelProps {
  graph: LinkGraph
}

export function AnchorPanel({ graph }: AnchorPanelProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const report = useMemo(() => analyzeAnchorText(graph, brandTermsFromGraph(graph)), [graph])
  const query = search.trim().toLowerCase()
  const rows = report.insights.filter((item) => !query || item.text.toLowerCase().includes(query) || (!item.text && query === ''))

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">{t('web.links.anchors.noPenalty')}</p>
      <div className="grid grid-cols-2 gap-1.5">
        <Stat label={t('web.links.anchors.emptyPct')} value={`${pct(report.empty, report.total)}%`} />
        <Stat label={t('web.links.anchors.generic')} value={String(report.generic)} />
        <Stat label={t('web.links.anchors.repeated')} value={String(report.repeated)} />
        <Stat label={t('web.links.anchors.imageAlt')} value={String(report.imageMissingAlt)} />
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder={t('web.links.searchPlaceholder')} ariaLabel={t('web.links.searchPlaceholder')} />
      <ul className="space-y-1.5">
        {rows.slice(0, 80).map((item) => (
          <li key={item.text || '(empty)'} className="rounded-lg border bg-card">
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between gap-2 px-2.5 py-2 text-left text-[12px]"
              onClick={() => setOpen((current) => (current === item.text ? null : item.text))}
            >
              <span className="min-w-0 truncate">{item.text || t('web.links.noTextLabel')}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{item.count}×</span>
            </button>
            {open === item.text && (
              <div className="space-y-1 border-t px-2.5 py-2 text-[11px] text-muted-foreground">
                {item.destinations.slice(0, 12).map((url) => (
                  <p key={url} className="truncate">
                    {url}
                  </p>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-2.5 py-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  )
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}
