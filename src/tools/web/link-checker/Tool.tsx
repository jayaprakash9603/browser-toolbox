import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  AlertTriangleIcon,
  ListFilterIcon,
  RefreshCwIcon,
  SearchXIcon,
  WifiOffIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  GROUP_KEYS,
  HEALTH_ORDER,
  SORT_KEYS,
  emptyCounts,
  isProblem,
  marksFor,
  matchesFilter,
  matchesQuery,
  planTargets,
  sortEntries,
  summarize,
  type CheckEntry,
  type CheckTarget,
  type GroupKey,
  type HealthFilter,
  type ReportMeta,
  type SortKey,
} from '@/core/engines/linkChecker/report'
import type { PageLink, PageLinksSnapshot } from '@/core/engines/links/pageLinks'
import { SearchInput } from '@/shared/components/SearchInput'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { EmptyState } from '@/shared/components/EmptyState'
import { PanelSection } from '@/shared/components/toolkit'
import { useDeepLinkParam } from '@/shared/hooks/useDeepLinkTab'
import { cn } from '@/shared/utils/cn'

import { useWebTool } from '../_shared'
import { sendToActiveTab } from '../tabMessaging'
import { ExportMenu } from './ExportMenu'
import { FilterChips } from './FilterChips'
import { ResultList } from './ResultList'
import { ScanHero } from './ScanHero'
import { ScanProgress } from './ScanProgress'
import { SettingsPanel } from './SettingsPanel'
import { SummaryPanel } from './SummaryPanel'
import { DiscoverProgress } from './DiscoverProgress'
import {
  DEFAULT_LINK_CRAWL_SETTINGS,
  loadLinkCrawlSettings,
  saveLinkCrawlSettings,
  toLinkCrawlOptions,
  type LinkCrawlSettings,
} from './crawlSettings'
import { crawlSiteLinks, stopActiveSiteLinkCrawl } from './crawlService'
import { useCheckSettings } from './settings'
import { scanElapsedMs, useLinkScan } from './useLinkScan'
import { requestAllSitesAccess } from '@/core/permissions/siteAccess'
import type { CrawlProgress } from '@/core/engines/htmlArchive/crawl'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; snapshot: PageLinksSnapshot }

function fetchLinks() {
  return sendToActiveTab<PageLinksSnapshot>({ type: 'GET_PAGE_LINKS' })
}

function filterCounts(entries: Iterable<CheckEntry>, redirectsAsIssues: boolean): Record<HealthFilter, number> {
  const counts = emptyCounts()
  let done = 0
  for (const entry of entries) {
    if (entry.state.phase !== 'done') continue
    done += 1
    counts[entry.state.health] += 1
  }
  const problems = HEALTH_ORDER.reduce(
    (sum, health) => sum + (isProblem(health, redirectsAsIssues) ? counts[health] : 0),
    0,
  )
  return { all: done, problems, ...counts }
}

export default function LinkCheckerTool() {
  const { t } = useTranslation()
  const tool = useWebTool('web.link-checker')
  const reduceMotion = useReducedMotion()
  const { settings, update: patchSettings, reset: resetSettings } = useCheckSettings()
  const scan = useLinkScan()

  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [refreshing, setRefreshing] = useState(false)
  const [stale, setStale] = useState(false)
  const [freshTargets, setFreshTargets] = useState<CheckTarget[]>([])
  const [filter, setFilter] = useDeepLinkParam<HealthFilter>('filter', null, 'all')
  const [sort, setSort] = useDeepLinkParam<SortKey>('sort', SORT_KEYS, 'severity')
  const [group, setGroup] = useDeepLinkParam<GroupKey>('group', GROUP_KEYS, 'none')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [marking, setMarking] = useState(false)
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null)
  const [crawlSettings, setCrawlSettings] = useState<LinkCrawlSettings>(DEFAULT_LINK_CRAWL_SETTINGS)
  const [discover, setDiscover] = useState<{
    progress: CrawlProgress | null
    startedAt: number
    stopRequested: boolean
  } | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    void loadLinkCrawlSettings().then(setCrawlSettings)
  }, [])

  const patchCrawlSettings = useCallback((patch: Partial<LinkCrawlSettings>) => {
    setCrawlSettings((current) => {
      const next = { ...current, ...patch }
      void saveLinkCrawlSettings(next)
      return next
    })
  }, [])

  const showNotice = useCallback((text: string) => setNotice({ id: Date.now(), text }), [])

  const resetScan = scan.reset

  const apply = useCallback(
    (data: PageLinksSnapshot | null) => {
      setRefreshing(false)
      setStale(false)
      if (!data) {
        setLoad({ status: 'error' })
        return
      }
      if (urlRef.current !== data.url) {
        resetScan()
        setFreshTargets([])
        setExpanded(null)
        setMarking(false)
      }
      urlRef.current = data.url
      setLoad({ status: 'ready', snapshot: data })
    },
    [resetScan],
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

  const latest = useRef({ running: scan.running, rescan })
  useEffect(() => {
    latest.current = { running: scan.running, rescan }
  })

  useEffect(() => {
    const tabs = typeof chrome === 'undefined' ? undefined : chrome.tabs
    if (!tabs?.onActivated || !tabs.onUpdated) return
    const pageChanged = () => {
      if (latest.current.running) setStale(true)
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

  useEffect(() => {
    return () => {
      void sendToActiveTab({ type: 'CLEAR_PAGE_LINK_MARKS' })
    }
  }, [])

  const snapshot = load.status === 'ready' ? load.snapshot : null
  const plan = useMemo(
    () => (snapshot ? planTargets(snapshot.links, settings) : null),
    [snapshot, settings],
  )

  const entryList = useMemo(() => [...scan.entries.values()], [scan.entries])
  const summary = useMemo(
    () => summarize(entryList, settings.redirectsAsIssues),
    [entryList, settings.redirectsAsIssues],
  )
  const counts = useMemo(
    () => filterCounts(entryList, settings.redirectsAsIssues),
    [entryList, settings.redirectsAsIssues],
  )
  const progressCounts = useMemo(() => {
    const tallies = emptyCounts()
    for (const entry of entryList) {
      if (entry.state.phase !== 'done') continue
      tallies[entry.state.health] += 1
    }
    return tallies
  }, [entryList])

  const query = search.trim().toLowerCase()
  const visible = useMemo(() => {
    let list = entryList.filter((entry) => matchesFilter(entry, filter, settings.redirectsAsIssues))
    if (query) list = list.filter((entry) => matchesQuery(entry, query))
    return sortEntries(list, sort)
  }, [entryList, filter, query, sort, settings.redirectsAsIssues])

  const resetKey = `${snapshot?.url ?? ''}|${filter}|${sort}|${group}|${query}`
  const filtersActive = filter !== 'all' || query.length > 0
  const hasResults = entryList.length > 0
  const showHero = !scan.running && scan.phase === 'idle' && !hasResults && !discover
  const showSummary = !scan.running && hasResults && (scan.phase === 'done' || scan.phase === 'stopped') && !discover
  const remaining = useMemo(() => {
    if (freshTargets.length === 0) return 0
    return freshTargets.filter((target) => scan.entries.get(target.url)?.state.phase !== 'done').length
  }, [freshTargets, scan.entries])

  const reportMeta: ReportMeta | null = snapshot
    ? {
        pageUrl: snapshot.url,
        pageTitle: snapshot.title,
        checkedAt: new Date(scan.timing?.startedAt ?? Date.now()),
        redirectsAsIssues: settings.redirectsAsIssues,
      }
    : null

  useEffect(() => {
    if (!marking || !snapshot) {
      void sendToActiveTab({ type: 'CLEAR_PAGE_LINK_MARKS' })
      return
    }
    const marks = marksFor(entryList, settings.redirectsAsIssues)
    void sendToActiveTab({ type: 'MARK_PAGE_LINKS', marks })
  }, [marking, snapshot, entryList, settings.redirectsAsIssues])

  const startScan = () => {
    if (!plan) return
    if (crawlSettings.mode === 'site') {
      void (async () => {
        setDiscover({ progress: null, startedAt: Date.now(), stopRequested: false })
        setExpanded(null)
        resetScan()
        try {
          await requestAllSitesAccess()
          const result = await crawlSiteLinks(toLinkCrawlOptions(crawlSettings), (progress) =>
            setDiscover((current) => (current ? { ...current, progress } : current)),
          )
          apply(result.snapshot)
          const sitePlan = planTargets(result.snapshot.links, settings)
          if (sitePlan.targets.length === 0) {
            setDiscover(null)
            showNotice(t('linkChecker.emptyHint'))
            return
          }
          setFreshTargets(sitePlan.targets)
          setDiscover(null)
          showNotice(
            t('linkChecker.crawl.pagesDone', { pages: result.pageCount, links: sitePlan.targets.length }),
          )
          void scan.start(sitePlan.targets, settings)
        } catch {
          setDiscover(null)
          showNotice(t('linkChecker.crawl.failed'))
        }
      })()
      return
    }
    if (plan.targets.length === 0) return
    setFreshTargets(plan.targets)
    setExpanded(null)
    void scan.start(plan.targets, settings)
  }

  const requestDiscoverStop = () => {
    setDiscover((current) => (current ? { ...current, stopRequested: true } : current))
    void stopActiveSiteLinkCrawl()
  }

  const checkAgain = () => {
    if (!plan) return
    setFreshTargets(plan.targets)
    setExpanded(null)
    void scan.start(plan.targets, settings)
  }

  const checkRemaining = () => {
    const targets = freshTargets.filter((target) => scan.entries.get(target.url)?.state.phase !== 'done')
    if (targets.length === 0) return
    void scan.recheck(targets, settings)
  }

  const recheckProblems = () => {
    const targets = entryList
      .filter(
        (entry) =>
          entry.state.phase === 'done' && isProblem(entry.state.health, settings.redirectsAsIssues),
      )
      .map((entry) => entry.target)
    if (targets.length === 0) return
    void scan.recheck(targets, settings)
  }

  const recheckOne = (target: CheckTarget) => {
    void scan.recheck([target], settings)
  }

  const skipHost = (host: string) => {
    const line = host.trim()
    if (!line) return
    const current = settings.skipText.trim()
    patchSettings({ skipText: current ? `${current}\n${line}` : line })
    showNotice(t('linkChecker.skipSiteDone', { host: line }))
  }

  const locate = useCallback(
    async (link: PageLink) => {
      const result = await sendToActiveTab<{ found: boolean; visible: boolean }>({
        type: 'LOCATE_PAGE_LINK',
        index: link.index,
        href: link.href,
      })
      if (!result) showNotice(t('linkChecker.locateFailed'))
      else if (!result.found) {
        showNotice(t('linkChecker.locateMissing'))
        setStale(true)
      } else if (!result.visible) showNotice(t('linkChecker.locateHidden'))
    },
    [showNotice, t],
  )

  const toggleRow = useCallback((url: string) => {
    setExpanded((prev) => (prev === url ? null : url))
  }, [])

  const headerActions =
    snapshot && (
      <>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('linkChecker.rescan')}
          title={t('linkChecker.rescan')}
          onClick={rescan}
          disabled={refreshing || scan.running || discover != null}
        >
          <RefreshCwIcon
            className={cn('size-4', refreshing && 'motion-safe:animate-spin motion-reduce:animate-none')}
          />
        </Button>
        {reportMeta && (
          <ExportMenu
            entries={visible}
            meta={reportMeta}
            host={snapshot.host}
            onDone={showNotice}
          />
        )}
        <SettingsPanel
          settings={settings}
          onChange={patchSettings}
          onReset={resetSettings}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          disabled={scan.running}
        />
      </>
    )

  return (
    <ToolPage tool={tool} actions={headerActions}>
      <div className="@container flex flex-col gap-3 pb-2">
        {load.status === 'loading' && (
          <p className="animate-pulse text-xs text-muted-foreground">{t('linkChecker.loading')}</p>
        )}

        {load.status === 'error' && (
          <EmptyState
            icon={WifiOffIcon}
            title={t('linkChecker.loadError')}
            description={t('linkChecker.loadErrorHint')}
            className="py-8"
          />
        )}

        {snapshot && (
          <>
            {showHero && (
              <ScanHero
                snapshot={snapshot}
                plan={plan!}
                settings={settings}
                crawlSettings={crawlSettings}
                onScopeChange={(scope) => patchSettings({ scope })}
                onCrawlChange={patchCrawlSettings}
                onScanModeChange={(mode) => patchCrawlSettings({ mode })}
                onStart={startScan}
                onOpenSettings={() => setSettingsOpen(true)}
                busy={discover != null}
              />
            )}

            {discover && (
              <DiscoverProgress
                active
                crawl={discover.progress}
                startedAt={discover.startedAt}
                stopRequested={discover.stopRequested}
                onStop={requestDiscoverStop}
              />
            )}

            {scan.running && scan.progress && scan.timing && (
              <ScanProgress
                progress={scan.progress}
                phase={scan.phase}
                timing={scan.timing}
                pausedSince={scan.pausedSince}
                counts={progressCounts}
                onPause={scan.pause}
                onResume={scan.resume}
                onStop={scan.stop}
              />
            )}

            {stale && !scan.running && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs"
              >
                <RefreshCwIcon className="size-3.5 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 flex-1">{t('linkChecker.pageChanged')}</span>
                <Button size="xs" variant="outline" className="h-6" onClick={rescan} disabled={refreshing}>
                  {t('linkChecker.rescan')}
                </Button>
              </div>
            )}

            {showSummary && (
              <SummaryPanel
                summary={summary}
                stopped={scan.phase === 'stopped'}
                total={freshTargets.length || plan?.targets.length || summary.checked}
                remaining={remaining}
                elapsedMs={scanElapsedMs(scan.timing, Date.now(), scan.pausedSince)}
                filter={filter}
                busy={scan.running}
                marking={marking}
                onToggleMark={setMarking}
                onRecheckProblems={recheckProblems}
                onCheckAgain={checkAgain}
                onCheckRemaining={checkRemaining}
              />
            )}

            {hasResults && !scan.running && (
              <PanelSection
                title={t('linkChecker.summary.label')}
                icon={<ListFilterIcon />}
                actions={
                  filtersActive && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-6 text-[11px]"
                      onClick={() => {
                        setFilter('all')
                        setSearch('')
                      }}
                    >
                      {t('linkChecker.clearFilters')}
                    </Button>
                  )
                }
              >
                <FilterChips value={filter} onChange={setFilter} counts={counts} />
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder={t('linkChecker.searchPlaceholder')}
                  ariaLabel={t('linkChecker.searchPlaceholder')}
                  shortcut="/"
                  className="h-8"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Segmented
                    size="sm"
                    value={sort}
                    onValueChange={setSort}
                    ariaLabel={t('linkChecker.sort')}
                    options={SORT_KEYS.map((key) => ({
                      value: key,
                      label: t(`linkChecker.sort.${key}`),
                    }))}
                  />
                  <Segmented
                    size="sm"
                    value={group}
                    onValueChange={setGroup}
                    ariaLabel={t('linkChecker.group')}
                    options={GROUP_KEYS.map((key) => ({
                      value: key,
                      label: t(`linkChecker.group.${key}`),
                    }))}
                  />
                  <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                    {t('linkChecker.resultCount', { count: visible.length })}
                  </span>
                </div>

                {visible.length === 0 ? (
                  <EmptyState
                    icon={SearchXIcon}
                    title={t('linkChecker.noMatches')}
                    description={t('linkChecker.noMatchesHint')}
                    className="py-6"
                  />
                ) : (
                  <ResultList
                    entries={visible}
                    group={group}
                    redirectsAsIssues={settings.redirectsAsIssues}
                    expanded={expanded}
                    busy={scan.running}
                    resetKey={resetKey}
                    onToggle={toggleRow}
                    onLocate={locate}
                    onRecheck={recheckOne}
                    onSkipHost={skipHost}
                  />
                )}
              </PanelSection>
            )}

            {plan && plan.targets.length === 0 && scan.phase === 'idle' && !hasResults && (
              <p className="flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                <AlertTriangleIcon className="size-3.5 shrink-0" aria-hidden />
                {t('linkChecker.emptyHint')}
              </p>
            )}
          </>
        )}

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
              className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex justify-center"
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
