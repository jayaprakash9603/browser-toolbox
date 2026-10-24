import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { GlobeIcon, LayoutTemplateIcon, LinkIcon, ListIcon, RefreshCwIcon, SearchXIcon, ShieldAlertIcon } from 'lucide-react'
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
  type PageLink,
  type PageLinksSnapshot,
} from '@/core/engines/links/pageLinks'
import { SearchInput } from '@/shared/components/SearchInput'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { Switch } from '@/shared/components/ui/switch'
import { useDeepLinkParam } from '@/shared/hooks/useDeepLinkTab'
import { cn } from '@/shared/utils/cn'

import { useWebTool } from '../_shared'
import { sendToActiveTab } from '../tabMessaging'
import { ExportMenu } from './ExportMenu'
import { LinkGroups } from './LinkGroups'
import { LinkOverview, type CheckSummary } from './LinkOverview'
import { LinkRow } from './LinkRow'
import { MAX_CHECKED_URLS, useLinkChecks } from './useLinkChecks'

const PAGE_SIZE = 100
const VIEWS = ['list', 'sites', 'sections'] as const
type View = (typeof VIEWS)[number]

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; snapshot: PageLinksSnapshot }

function fetchLinks() {
  return sendToActiveTab<PageLinksSnapshot>({ type: 'GET_PAGE_LINKS' })
}

export default function LinkToolkitTool() {
  const { t } = useTranslation()
  const tool = useWebTool('web.link-toolkit')
  const reduceMotion = useReducedMotion()
  const { reset: resetChecks, run: runChecks, cancel: cancelChecks, statuses, progress, checking } = useLinkChecks()

  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [refreshing, setRefreshing] = useState(false)
  const [stale, setStale] = useState(false)
  const [type, setType] = useDeepLinkParam('filter', LINK_TYPE_FILTERS, 'all')
  const [view, setView] = useDeepLinkParam<View>('view', VIEWS, 'list')
  const [search, setSearch] = useState('')
  const [flags, setFlags] = useState<ReadonlySet<LinkFlag>>(() => new Set())
  const [merge, setMerge] = useState(true)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [page, setPage] = useState({ key: '', limit: PAGE_SIZE })
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null)
  const urlRef = useRef<string | null>(null)

  const showNotice = useCallback((text: string) => setNotice({ id: Date.now(), text }), [])

  const apply = useCallback(
    (data: PageLinksSnapshot | null) => {
      setRefreshing(false)
      setStale(false)
      if (!data) {
        setLoad({ status: 'error' })
        return
      }
      if (urlRef.current !== data.url) {
        resetChecks()
        setExpandedKey(null)
      }
      urlRef.current = data.url
      setLoad({ status: 'ready', snapshot: data })
    },
    [resetChecks],
  )

  const rescan = useCallback(() => {
    setRefreshing(true)
    void fetchLinks().then(apply)
  }, [apply])

  useEffect(() => {
    let live = true
    void fetchLinks().then((data) => {
      if (live) apply(data)
    })
    return () => {
      live = false
    }
  }, [apply])

  const latest = useRef({ checking, rescan })
  useEffect(() => {
    latest.current = { checking, rescan }
  })

  useEffect(() => {
    const tabs = typeof chrome === 'undefined' ? undefined : chrome.tabs
    if (!tabs?.onActivated || !tabs.onUpdated) return
    const pageChanged = () => {
      if (latest.current.checking) setStale(true)
      else latest.current.rescan()
    }
    const onUpdated = (_id: number, info: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => {
      if (info.status === 'complete' && tab.active) pageChanged()
    }
    tabs.onActivated.addListener(pageChanged)
    tabs.onUpdated.addListener(onUpdated)
    return () => {
      tabs.onActivated.removeListener(pageChanged)
      tabs.onUpdated.removeListener(onUpdated)
    }
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 3200)
    return () => clearTimeout(timer)
  }, [notice])

  const snapshot = load.status === 'ready' ? load.snapshot : null
  const statusOf = useCallback((href: string) => statuses.get(href), [statuses])

  const model = useMemo(() => {
    const links = snapshot?.links ?? []
    const duplicates = duplicateHrefSet(links)
    const typeCounts = countByType(links)
    const entries = toEntries(
      links.filter((link) => matchesType(link, type)),
      merge,
    ).filter((entry) => matchesSearch(entry, search))
    const flagCounts = countFlags(entries, duplicates, statusOf)
    const visible = flags.size === 0 ? entries : entries.filter((entry) => [...flags].every((flag) => hasFlag(entry, flag, duplicates, statusOf)))
    const externalSites = new Set(links.filter((link) => link.kind === 'external').map((link) => link.host)).size
    return {
      links,
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
      if (info.ok) ok += 1
      else broken += 1
    }
    return ok + broken > 0 ? { ok, broken } : null
  }, [checking, statuses])

  const filterKey = `${snapshot?.url}|${type}|${search}|${[...flags].join(',')}|${merge}|${view}`
  const limit = page.key === filterKey ? page.limit : PAGE_SIZE
  const filtersActive = type !== 'all' || search.trim() !== '' || flags.size > 0

  const toggleFlag = useCallback((flag: LinkFlag) => {
    setFlags((prev) => {
      const next = new Set(prev)
      if (next.has(flag)) next.delete(flag)
      else next.add(flag)
      return next
    })
  }, [])

  const clearFilters = () => {
    setType('all')
    setSearch('')
    setFlags(new Set())
  }

  const toggleRow = useCallback((key: string) => setExpandedKey((prev) => (prev === key ? null : key)), [])

  const locate = useCallback(
    async (link: PageLink) => {
      const result = await sendToActiveTab<{ found: boolean; visible: boolean }>({
        type: 'LOCATE_PAGE_LINK',
        index: link.index,
        href: link.href,
      })
      if (!result) showNotice(t('web.links.locateFailed'))
      else if (!result.found) {
        showNotice(t('web.links.locateMissing'))
        setStale(true)
      } else if (!result.visible) showNotice(t('web.links.locateHidden'))
    },
    [showNotice, t],
  )

  const startCheck = () => {
    const hrefs = [...new Set(model.links.filter((link) => link.kind === 'internal' || link.kind === 'external').map((link) => link.href))]
    if (hrefs.length > MAX_CHECKED_URLS) showNotice(t('web.links.checkCapped', { count: MAX_CHECKED_URLS }))
    void runChecks(hrefs)
  }

  const actions = (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('web.links.rescan')}
        title={t('web.links.rescan')}
        onClick={rescan}
        disabled={refreshing}
      >
        <RefreshCwIcon className={cn('size-4', refreshing && 'animate-spin motion-reduce:animate-none')} />
      </Button>
      <ExportMenu entries={model.visible} host={snapshot?.host ?? ''} statusOf={statusOf} onDone={showNotice} />
    </>
  )

  return (
    <ToolPage tool={tool} actions={actions} contentClassName="overflow-hidden p-0">
      <div className="relative h-full">
        <div className="scrollbar-styled h-full overflow-y-auto overscroll-contain px-3 pt-3 pb-6">
          {load.status === 'loading' && <LoadingState />}
          {load.status === 'error' && <ErrorState onRetry={rescan} retrying={refreshing} />}
          {snapshot && (
            <>
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
                onCheck={startCheck}
                onCancelCheck={cancelChecks}
              />

              {stale && (
                <div role="status" className="mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                  <RefreshCwIcon className="size-3.5 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1">{t('web.links.pageChanged')}</span>
                  <Button size="xs" variant="outline" className="h-6" onClick={rescan} disabled={refreshing}>
                    {t('web.links.rescan')}
                  </Button>
                </div>
              )}

              {snapshot.links.length > 0 && (
                <div className="sticky top-0 z-10 -mx-3 mt-1 flex flex-wrap items-center gap-2 border-b bg-background px-3 pt-2 pb-2">
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
              )}

              {snapshot.links.length === 0 ? (
                <EmptyState icon={LinkIcon} title={t('web.links.empty')} hint={t('web.links.emptyHint')} />
              ) : model.visible.length === 0 ? (
                <EmptyState
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
                <div className="mt-2.5">
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
                            onToggle={toggleRow}
                            onLocate={locate}
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
                      onToggleRow={toggleRow}
                      onLocate={locate}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div role="status" aria-live="polite" className="sr-only">
          {notice?.text ?? ''}
        </div>
        <AnimatePresence>
          {notice && (
            <motion.div
              key={notice.id}
              aria-hidden
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex justify-center"
            >
              <span className="max-w-full rounded-full bg-foreground px-3.5 py-1.5 text-center text-xs font-medium text-background shadow-lg">
                {notice.text}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToolPage>
  )
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

function LoadingState() {
  const { t } = useTranslation()
  return (
    <div className="space-y-3" aria-busy="true">
      <p className="sr-only" role="status">
        {t('web.links.loading')}
      </p>
      <div className="space-y-3 rounded-xl border p-3">
        <div className="flex items-center gap-2.5">
          <div className="size-9 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </div>
        </div>
        <div className="h-12 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
        <div className="h-2 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-center gap-2.5 rounded-lg border p-2.5">
          <div className="size-7 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-2.5 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorState({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={ShieldAlertIcon}
      title={t('web.links.loadError')}
      hint={t('web.links.loadErrorHint')}
      action={
        <Button size="sm" onClick={onRetry} disabled={retrying}>
          <RefreshCwIcon className={cn(retrying && 'animate-spin motion-reduce:animate-none')} />
          {t('web.links.retry')}
        </Button>
      }
    />
  )
}

function EmptyState({
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
