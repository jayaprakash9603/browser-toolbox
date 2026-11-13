import { useMemo, useState, type ReactNode } from 'react'
import { GlobeIcon, LayoutTemplateIcon, LinkIcon, ListIcon, SearchXIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  countByType,
  countFlags,
  duplicateHrefSet,
  groupByDomain,
  groupBySection,
  hasFlag,
  LINK_TYPE_FILTERS,
  matchesSearch,
  matchesType,
  toEntries,
  type LinkFlag,
  type LinkStatusInfo,
  type PageLink,
  type PageLinksSnapshot,
  type StatusLookup,
} from '@/core/engines/links/pageLinks'
import { SearchInput } from '@/shared/components/SearchInput'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { Switch } from '@/shared/components/ui/switch'
import { useDeepLinkParam } from '@/shared/hooks/useDeepLinkTab'

import { LinkGroups } from './LinkGroups'
import { LinkOverview, type CheckSummary } from './LinkOverview'
import { LinkRow } from './LinkRow'
import type { CheckProgress } from './useLinkChecks'

const PAGE_SIZE = 100
const VIEWS = ['list', 'sites', 'sections'] as const
type View = (typeof VIEWS)[number]

interface InternalLinksPanelProps {
  snapshot: PageLinksSnapshot
  statusOf: StatusLookup
  statuses: Map<string, LinkStatusInfo>
  progress: CheckProgress | null
  checking: boolean
  onCheck: () => void
  onCancelCheck: () => void
  onLocate: (link: PageLink) => void
}

function countRepeats(links: PageLink[]): number {
  const seen = new Set<string>()
  let repeats = 0
  for (const link of links) {
    if (seen.has(link.href)) repeats += 1
    else seen.add(link.href)
  }
  return repeats
}

export function InternalLinksPanel({
  snapshot,
  statusOf,
  statuses,
  progress,
  checking,
  onCheck,
  onCancelCheck,
  onLocate,
}: InternalLinksPanelProps) {
  const { t } = useTranslation()
  const [type, setType] = useDeepLinkParam('filter', LINK_TYPE_FILTERS, 'all')
  const [view, setView] = useDeepLinkParam<View>('view', VIEWS, 'list')
  const [search, setSearch] = useState('')
  const [flags, setFlags] = useState<ReadonlySet<LinkFlag>>(() => new Set())
  const [merge, setMerge] = useState(true)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [page, setPage] = useState({ key: '', limit: PAGE_SIZE })

  const model = useMemo(() => {
    const links = snapshot.links
    const duplicates = duplicateHrefSet(links)
    const typeCounts = countByType(links)
    const entries = toEntries(links.filter((link) => matchesType(link, type)), merge).filter((entry) =>
      matchesSearch(entry, search),
    )
    const flagCounts = countFlags(entries, duplicates, statusOf)
    const visible =
      flags.size === 0 ? entries : entries.filter((entry) => [...flags].every((flag) => hasFlag(entry, flag, duplicates, statusOf)))
    const externalSites = new Set(links.filter((link) => link.kind === 'external').map((link) => link.host)).size
    return {
      typeCounts,
      flagCounts,
      visible,
      stats: { unique: links.length - countRepeats(links), externalSites },
    }
  }, [snapshot, type, merge, search, flags, statusOf])

  const groups = useMemo(() => {
    if (view === 'sites') return groupByDomain(model.visible)
    if (view === 'sections') return groupBySection(model.visible)
    return []
  }, [view, model.visible])

  const summary = useMemo<CheckSummary | null>(() => {
    if (checking || statuses.size === 0) return null
    let ok = 0
    let broken = 0
    for (const info of statuses.values()) {
      if (info.checking) continue
      if (info.health === 'broken') broken += 1
      else if (info.health === 'ok' || info.ok) ok += 1
    }
    return ok + broken > 0 ? { ok, broken } : null
  }, [checking, statuses])

  const filterKey = `${snapshot.url}|${type}|${search}|${[...flags].join(',')}|${merge}|${view}`
  const limit = page.key === filterKey ? page.limit : PAGE_SIZE
  const filtersActive = type !== 'all' || search.trim() !== '' || flags.size > 0

  const toggleFlag = (flag: LinkFlag) => {
    setFlags((prev) => {
      const next = new Set(prev)
      if (next.has(flag)) next.delete(flag)
      else next.add(flag)
      return next
    })
  }

  const clearFilters = () => {
    setType('all')
    setSearch('')
    setFlags(new Set())
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('web.links.searchPlaceholder')}
          ariaLabel={t('web.links.searchPlaceholder')}
          shortcut="/"
          className="min-w-44 flex-1"
        />
        <div className="flex w-full items-center justify-between gap-2 @[520px]:w-auto">
          <Segmented
            size="sm"
            value={view}
            onValueChange={setView}
            ariaLabel={t('web.links.view')}
            options={[
              { value: 'list', label: <><ListIcon aria-hidden />{t('web.links.viewList')}</> },
              { value: 'sites', label: <><GlobeIcon aria-hidden />{t('web.links.viewSites')}</> },
              { value: 'sections', label: <><LayoutTemplateIcon aria-hidden />{t('web.links.viewSections')}</> },
            ]}
          />
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground" title={t('web.links.mergeHint')}>
            <Switch checked={merge} onCheckedChange={setMerge} aria-label={t('web.links.merge')} />
            {t('web.links.merge')}
          </label>
        </div>
      </div>

      <LinkOverview
        snapshot={snapshot}
        stats={model.stats}
        typeCounts={model.typeCounts}
        type={type}
        onTypeChange={setType}
        flagCounts={model.flagCounts}
        flags={flags}
        onToggleFlag={toggleFlag}
        progress={progress}
        summary={summary}
        onCheck={onCheck}
        onCancelCheck={onCancelCheck}
      />

      {snapshot.links.length === 0 ? (
        <Hint icon={LinkIcon} title={t('web.links.empty')} hint={t('web.links.emptyHint')} />
      ) : model.visible.length === 0 ? (
        <Hint
          icon={SearchXIcon}
          title={t('web.links.noMatches')}
          hint={t('web.links.noMatchesHint')}
          action={
            filtersActive ? (
              <Button size="sm" variant="outline" onClick={clearFilters}>
                {t('web.links.clearFilters')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
            <span aria-live="polite">
              {t('web.links.resultCount', { count: model.visible.length })}
              {snapshot.truncated && ` · ${t('web.links.truncated')}`}
            </span>
            {filtersActive && (
              <button
                type="button"
                className="cursor-pointer rounded-sm font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                onClick={clearFilters}
              >
                {t('web.links.clearFilters')}
              </button>
            )}
          </div>
          {view === 'list' ? (
            <>
              <ul className="space-y-1.5">
                {model.visible.slice(0, limit).map((entry) => (
                  <LinkRow
                    key={entry.key}
                    entry={entry}
                    status={statusOf(entry.link.href)}
                    expanded={expandedKey === entry.key}
                    onToggle={(key) => setExpandedKey((prev) => (prev === key ? null : key))}
                    onLocate={onLocate}
                  />
                ))}
              </ul>
              {model.visible.length > limit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setPage({ key: filterKey, limit: limit + PAGE_SIZE })}
                >
                  {t('web.links.showMore', { count: Math.min(PAGE_SIZE, model.visible.length - limit) })}
                </Button>
              )}
            </>
          ) : (
            <LinkGroups
              key={`${view}|${snapshot.url}`}
              mode={view}
              groups={groups}
              statusOf={statusOf}
              expandedKey={expandedKey}
              onToggleRow={(key) => setExpandedKey((prev) => (prev === key ? null : key))}
              onLocate={onLocate}
            />
          )}
        </div>
      )}
    </div>
  )
}

function Hint({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: typeof LinkIcon
  title: string
  hint: string
  action?: ReactNode
}) {
  return (
    <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-72 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
