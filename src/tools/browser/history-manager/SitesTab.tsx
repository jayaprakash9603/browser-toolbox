import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRightIcon } from 'lucide-react'

import { groupByDomain, type DomainSort, type HistoryPage } from '@/core/history-manager'
import { SiteFavicon } from '@/shared/components/SiteFavicon'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'

import { HistoryRow, type HistoryRowActions } from './HistoryRow'

interface SitesTabProps {
  pages: HistoryPage[]
  compact: boolean
  selected: Set<string>
  rowActions: HistoryRowActions
  topLimit: number
  onDeleteDomain?: (domain: string, pages: HistoryPage[]) => void
}

const SORTS: DomainSort[] = ['most', 'recent', 'alpha', 'least']

export function SitesTab({ pages, compact, selected, rowActions, topLimit, onDeleteDomain }: SitesTabProps) {
  const { t } = useTranslation()
  const [sort, setSort] = useState<DomainSort>('most')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const groups = useMemo(() => {
    const grouped = groupByDomain(pages, sort)
    return sort === 'most' ? grouped.slice(0, topLimit) : grouped
  }, [pages, sort, topLimit])

  const toggleDomain = (domain: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(domain)) next.delete(domain)
      else next.add(domain)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <Segmented
        fullWidth
        ariaLabel={t('historyManager.sort.most')}
        value={sort}
        onValueChange={(v) => setSort(v as DomainSort)}
        options={SORTS.map((value) => ({
          value,
          label: t(`historyManager.sort.${value === 'alpha' ? 'alpha' : value}`),
        }))}
      />
      <ul className="space-y-2">
        {groups.map((group) => (
          <li key={group.domain} className="overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-xs">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                onClick={() => toggleDomain(group.domain)}
              >
                <SiteFavicon url={group.pages[0]?.url ?? `https://${group.domain}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{group.domain}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.uniquePages} pages · {group.totalVisits} visits
                  </p>
                </div>
                <ChevronRightIcon
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${expanded.has(group.domain) ? 'rotate-90' : ''}`}
                />
              </button>
              {onDeleteDomain && (
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  className="shrink-0 text-destructive hover:bg-destructive/10"
                  onClick={() => onDeleteDomain(group.domain, group.pages)}
                >
                  {t('historyManager.domain.deleteAll')}
                </Button>
              )}
            </div>
            {expanded.has(group.domain) && (
              <ul className="space-y-1 border-t border-border/60 bg-muted/15 px-1.5 py-1.5">
                {group.pages.map((page) => (
                  <HistoryRow
                    key={page.id}
                    page={page}
                    selected={selected.has(page.id)}
                    compact={compact}
                    actions={rowActions}
                  />
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
