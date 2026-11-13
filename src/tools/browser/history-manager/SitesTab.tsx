import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDownAZIcon, ArrowDownWideNarrowIcon, ArrowUpNarrowWideIcon, ChevronRightIcon, Clock3Icon } from 'lucide-react'

import { groupByDomain, type DomainSort, type HistoryPage } from '@/core/history-manager'
import { SiteFavicon } from '@/shared/components/SiteFavicon'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

import { HistoryRow, type HistoryRowActions } from './HistoryRow'

interface SitesTabProps {
  pages: HistoryPage[]
  compact: boolean
  selected: Set<string>
  rowActions: HistoryRowActions
  onDeleteDomain?: (domain: string, pages: HistoryPage[]) => void
}

const SORTS: DomainSort[] = ['most', 'recent', 'alpha', 'least']
const TOP_LIMITS = [10, 20, 50] as const

const SORT_ICONS: Record<DomainSort, typeof ArrowDownWideNarrowIcon> = {
  most: ArrowDownWideNarrowIcon,
  recent: Clock3Icon,
  alpha: ArrowDownAZIcon,
  least: ArrowUpNarrowWideIcon,
}

export function SitesTab({ pages, compact, selected, rowActions, onDeleteDomain }: SitesTabProps) {
  const { t } = useTranslation()
  const [sort, setSort] = useState<DomainSort>('most')
  const [topLimit, setTopLimit] = useState<(typeof TOP_LIMITS)[number]>(20)
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Select value={sort} onValueChange={(value) => setSort(value as DomainSort)}>
          <SelectTrigger className="h-8 min-w-0 flex-1" aria-label={t('historyManager.sort.label')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((value) => {
              const Icon = SORT_ICONS[value]
              return (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    {t(`historyManager.sort.${value}`)}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        {sort === 'most' ? (
          <Select
            value={String(topLimit)}
            onValueChange={(value) => setTopLimit(Number(value) as (typeof TOP_LIMITS)[number])}
          >
            <SelectTrigger className="h-8 w-[6.25rem] shrink-0" aria-label={t('historyManager.top.limit')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {TOP_LIMITS.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {t('historyManager.top.count', { count })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
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
