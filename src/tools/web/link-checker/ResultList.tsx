import { useMemo, useState } from 'react'
import { ChevronRightIcon, Loader2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  groupEntries,
  isProblem,
  type CheckEntry,
  type CheckTarget,
  type EntryGroup,
  type GroupKey,
} from '@/core/engines/linkChecker/report'
import type { PageLink } from '@/core/engines/links/pageLinks'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { SiteAvatar } from '../link-toolkit/LinkVisuals'
import { HEALTH_META } from './meta'
import { ResultRow } from './ResultRow'

const PAGE_SIZE = 60
const GROUP_PAGE_SIZE = 40

interface ResultListProps {
  entries: CheckEntry[]
  group: GroupKey
  redirectsAsIssues: boolean
  expanded: string | null
  busy: boolean
  /** Changes whenever filters change, so paging starts over. */
  resetKey: string
  onToggle: (url: string) => void
  onLocate: (link: PageLink) => void
  onRecheck: (target: CheckTarget) => void
  onSkipHost: (host: string) => void
}

type RowHandlers = Omit<ResultListProps, 'entries' | 'group' | 'resetKey'>

function Rows({ entries, limit, ...handlers }: RowHandlers & { entries: CheckEntry[]; limit: number }) {
  return (
    <ul className="space-y-1.5">
      {entries.slice(0, limit).map((entry, index) => (
        <ResultRow
          key={entry.target.url}
          entry={entry}
          index={index}
          problem={entry.state.phase === 'done' && isProblem(entry.state.health, handlers.redirectsAsIssues)}
          expanded={handlers.expanded === entry.target.url}
          busy={handlers.busy}
          onToggle={handlers.onToggle}
          onLocate={handlers.onLocate}
          onRecheck={handlers.onRecheck}
          onSkipHost={handlers.onSkipHost}
        />
      ))}
    </ul>
  )
}

function ShowMore({ remaining, step, onClick }: { remaining: number; step: number; onClick: () => void }) {
  const { t } = useTranslation()
  if (remaining <= 0) return null
  return (
    <Button variant="outline" size="sm" className="mt-2 w-full" onClick={onClick}>
      {t('linkChecker.showMore', { count: Math.min(step, remaining) })}
    </Button>
  )
}

export function ResultList({ entries, group, resetKey, ...handlers }: ResultListProps) {
  const [page, setPage] = useState({ key: resetKey, limit: PAGE_SIZE })
  const limit = page.key === resetKey ? page.limit : PAGE_SIZE

  if (group === 'none') {
    return (
      <>
        <Rows entries={entries} limit={limit} {...handlers} />
        <ShowMore remaining={entries.length - limit} step={PAGE_SIZE} onClick={() => setPage({ key: resetKey, limit: limit + PAGE_SIZE })} />
      </>
    )
  }
  return <GroupedList key={`${group}|${resetKey}`} entries={entries} group={group} {...handlers} />
}

function GroupedList({ entries, group, ...handlers }: RowHandlers & { entries: CheckEntry[]; group: Exclude<GroupKey, 'none'> }) {
  const groups = useMemo(() => groupEntries(entries, group, handlers.redirectsAsIssues), [entries, group, handlers.redirectsAsIssues])
  const [toggled, setToggled] = useState<ReadonlySet<string>>(() => new Set())
  const [limits, setLimits] = useState<Record<string, number>>({})

  const openByDefault = (item: EntryGroup) =>
    group === 'status' ? item.health !== 'ok' : item.problems > 0 || groups.length <= 3

  const toggle = (key: string) =>
    setToggled((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div className="space-y-2">
      {groups.map((item) => {
        const open = openByDefault(item) !== toggled.has(item.key)
        const limit = limits[item.key] ?? GROUP_PAGE_SIZE
        return (
          <section key={item.key} aria-label={item.label}>
            <GroupHeader item={item} open={open} onToggle={() => toggle(item.key)} />
            {open && (
              <div className="pt-1.5 pb-1">
                <Rows entries={item.entries} limit={limit} {...handlers} />
                <ShowMore
                  remaining={item.entries.length - limit}
                  step={GROUP_PAGE_SIZE}
                  onClick={() => setLimits((prev) => ({ ...prev, [item.key]: limit + GROUP_PAGE_SIZE }))}
                />
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function GroupHeader({ item, open, onToggle }: { item: EntryGroup; open: boolean; onToggle: () => void }) {
  const { t } = useTranslation()
  const meta = item.health ? HEALTH_META[item.health] : null
  const Icon = meta?.icon
  const label = item.kind === 'status' ? (item.health ? t(`linkChecker.health.${item.health}`) : t('linkChecker.checking')) : item.label

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="sticky top-0 z-[1] flex w-full cursor-pointer items-center gap-2 rounded-lg border bg-background/95 px-2.5 py-1.5 text-left outline-none backdrop-blur transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ChevronRightIcon
        className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-90')}
        aria-hidden
      />
      {item.kind === 'site' ? (
        <SiteAvatar host={item.label} kind="domain" size="sm" />
      ) : meta && Icon ? (
        <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-md', meta.soft, meta.text)} aria-hidden>
          <Icon className="size-3.5" />
        </span>
      ) : (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground" aria-hidden>
          <Loader2Icon className="size-3.5 animate-spin motion-reduce:animate-none" />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-xs font-semibold">{label}</span>
      {item.kind === 'site' && item.problems > 0 && (
        <span className="shrink-0 text-[11px] font-medium text-red-700 dark:text-red-400">
          {t('linkChecker.groupProblems', { count: item.problems })}
        </span>
      )}
      <span className="shrink-0 rounded-full bg-muted px-1.5 text-[11px] leading-5 font-semibold text-muted-foreground tabular-nums">
        {item.entries.length}
      </span>
    </button>
  )
}
