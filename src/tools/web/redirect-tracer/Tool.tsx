import './i18n'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Link2Icon,
  PauseIcon,
  PlayIcon,
  RouteIcon,
  ScanSearchIcon,
  SquareIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { PageLinksSnapshot } from '@/core/engines/links/pageLinks'
import {
  filterCounts,
  formatRedirectList,
  matchesFilter,
  matchesQuery,
  sortEntries,
  summarizeEntries,
  type RedirectEntry,
  type RedirectFilter,
  type RedirectTarget,
  REDIRECT_FILTERS,
} from '@/core/engines/redirects/chain'
import {
  collectRedirectTargets,
  manualRedirectTarget,
  MAX_REDIRECT_TARGETS,
  pageRedirectTarget,
} from '@/core/engines/redirects/targets'
import { sendMessage } from '@/core/messaging'
import { requestSiteAccess } from '@/core/permissions/siteAccess'
import type { RedirectHop as TabHop } from '@/core/web/redirectTrace'
import { CopyButton } from '@/shared/components/CopyButton'
import { EmptyState } from '@/shared/components/EmptyState'
import { SearchInput } from '@/shared/components/SearchInput'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/utils/cn'

import { getActiveTab, useWebTool } from '../_shared'
import { getActiveTabId, sendToActiveTab } from '../tabMessaging'
import { ChainCard } from './ChainCard'
import {
  RT_CHIP,
  RT_CHIP_IDLE,
  RT_CHIP_ON,
  RT_SCROLL,
  RT_STACK,
  RT_TOOLBAR,
} from './layout'
import { SummaryStrip } from './SummaryStrip'
import { traceTarget, useRedirectScan } from './useRedirectScan'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; snapshot: PageLinksSnapshot }

export default function RedirectTracerTool() {
  const { t } = useTranslation()
  const tool = useWebTool('web.redirect-tracer')
  const scan = useRedirectScan()
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [urlInput, setUrlInput] = useState('')
  const [pageEntry, setPageEntry] = useState<RedirectEntry | null>(null)
  const [tracingUrl, setTracingUrl] = useState(false)
  const [filter, setFilter] = useState<RedirectFilter>('redirects')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tabHops, setTabHops] = useState<TabHop[]>([])

  const loadPage = useCallback(async () => {
    setLoad({ status: 'loading' })
    const [snapshot, tab] = await Promise.all([sendToActiveTab<PageLinksSnapshot>({ type: 'GET_PAGE_LINKS' }), getActiveTab()])
    if (!snapshot) {
      setLoad({ status: 'error' })
      if (tab?.url) setUrlInput(tab.url)
      return
    }
    setLoad({ status: 'ready', snapshot })
    setUrlInput(snapshot.url)
    setPageEntry(null)
    scan.reset()
  }, [scan])

  useEffect(() => {
    void loadPage()
    // Load once when the tool mounts; rescans are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset identity is stable enough for mount
  }, [])

  const refreshTabHops = useCallback(async () => {
    const tabId = await getActiveTabId()
    const hops = await sendMessage<TabHop[]>({ type: 'REDIRECT_TRACE_GET', tabId: tabId ?? undefined })
    setTabHops(hops ?? [])
  }, [])

  useEffect(() => {
    void refreshTabHops()
    const timer = window.setInterval(() => void refreshTabHops(), 2000)
    return () => window.clearInterval(timer)
  }, [refreshTabHops])

  const targets = useMemo(
    () => (load.status === 'ready' ? collectRedirectTargets(load.snapshot) : []),
    [load],
  )

  const runTrace = useCallback(async (target: RedirectTarget) => {
    setTracingUrl(true)
    setPageEntry({ target, phase: 'checking' })
    setExpanded(target.url)
    await requestSiteAccess(target.url)
    const entry = await traceTarget(target)
    setPageEntry(entry)
    setTracingUrl(false)
  }, [])

  const traceTypedUrl = useCallback(() => {
    const target =
      (load.status === 'ready' && urlInput.trim() === load.snapshot.url
        ? pageRedirectTarget(load.snapshot)
        : null) ?? manualRedirectTarget(urlInput)
    if (!target) return
    void runTrace(target)
  }, [load, runTrace, urlInput])

  const toggle = useCallback((url: string) => {
    setExpanded((current) => (current === url ? null : url))
  }, [])

  const locate = useCallback((index: number, href: string) => {
    void sendToActiveTab({ type: 'LOCATE_PAGE_LINK', index, href })
  }, [])

  const retrace = useCallback(
    (url: string) => {
      if (pageEntry?.target.url === url) {
        void runTrace(pageEntry.target)
        return
      }
      const existing = scan.entries.get(url)
      if (existing) {
        void scan.upsert(existing.target)
        return
      }
      const target = targets.find((item) => item.url === url)
      if (target) void runTrace(target)
    },
    [pageEntry, runTrace, scan, targets],
  )

  const scanned = useMemo(() => [...scan.entries.values()], [scan.entries])
  const combined = scanned

  const summary = useMemo(() => {
    const rows: RedirectEntry[] = []
    if (pageEntry) rows.push(pageEntry)
    rows.push(...scanned)
    return summarizeEntries(rows)
  }, [pageEntry, scanned])

  const counts = useMemo(() => {
    const rows: RedirectEntry[] = []
    if (pageEntry) rows.push(pageEntry)
    rows.push(...scanned)
    return filterCounts(rows)
  }, [pageEntry, scanned])

  const visible = useMemo(() => {
    return sortEntries(combined.filter((entry) => matchesFilter(entry, filter) && matchesQuery(entry, query)))
  }, [combined, filter, query])

  const copyList = useMemo(() => {
    const rows: RedirectEntry[] = []
    if (pageEntry) rows.push(pageEntry)
    rows.push(...scanned)
    return formatRedirectList(rows)
  }, [pageEntry, scanned])

  const uniqueTabHops = useMemo(() => {
    const hops: TabHop[] = []
    for (const hop of tabHops) {
      if (hops.at(-1)?.url === hop.url) continue
      hops.push(hop)
    }
    return hops
  }, [tabHops])

  const showTabHops = uniqueTabHops.length > 1
  const hasResults = Boolean(pageEntry?.phase === 'done' || scanned.length > 0)
  const ready = load.status === 'ready'

  return (
    <ToolPage tool={tool} contentClassName="overflow-hidden p-0">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className={RT_TOOLBAR}>
          <div className="space-y-1.5">
            <label htmlFor="redirect-url" className="text-[11px] font-medium text-muted-foreground">
              {t('redirectTracer.urlLabel')}
            </label>
            <div className="flex gap-2">
              <Input
                id="redirect-url"
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
                placeholder={t('redirectTracer.urlPlaceholder')}
                className="h-9 min-w-0 flex-1 font-mono text-[12px]"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    traceTypedUrl()
                  }
                }}
              />
              <Button size="sm" className="h-9 shrink-0" onClick={traceTypedUrl} disabled={!urlInput.trim() || tracingUrl}>
                <RouteIcon />
                {tracingUrl ? t('redirectTracer.tracing') : t('redirectTracer.trace')}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {scan.running ? (
              <>
                {scan.phase === 'paused' ? (
                  <Button size="sm" className="h-9" onClick={scan.resume}>
                    <PlayIcon />
                    {t('redirectTracer.resume')}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-9" onClick={scan.pause}>
                    <PauseIcon />
                    {t('redirectTracer.pause')}
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-9" onClick={scan.stop}>
                  <SquareIcon />
                  {t('redirectTracer.stop')}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="h-9"
                onClick={() => void scan.start(targets)}
                disabled={!ready || targets.length === 0}
              >
                <ScanSearchIcon />
                {ready
                  ? t('redirectTracer.scanCount', { count: targets.length })
                  : t('redirectTracer.scan')}
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-9" onClick={() => void loadPage()}>
              {t('redirectTracer.retry')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9"
              onClick={() => {
                scan.reset()
                setPageEntry(null)
                setQuery('')
              }}
            >
              {t('redirectTracer.clear')}
            </Button>
            {copyList && <CopyButton text={copyList} size="xs" label={t('redirectTracer.copyRedirects')} />}
          </div>
          {scan.progress && (
            <div className="space-y-1.5" aria-live="polite">
              <div
                role="progressbar"
                aria-label={t('redirectTracer.progressLabel')}
                aria-valuemin={0}
                aria-valuemax={scan.progress.total}
                aria-valuenow={scan.progress.done}
                className="h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
                  style={{ width: `${scan.progress.total ? (scan.progress.done / scan.progress.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {t('redirectTracer.progress', { done: scan.progress.done, total: scan.progress.total })}
              </p>
            </div>
          )}
          {ready && targets.length >= MAX_REDIRECT_TARGETS && (
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              {t('redirectTracer.capped', { count: MAX_REDIRECT_TARGETS })}
            </p>
          )}
        </div>

        <div className={RT_SCROLL}>
          <div className={RT_STACK}>
            {load.status === 'loading' && <LoadingSkeleton />}
            {load.status === 'error' && (
              <EmptyState
                icon={Link2Icon}
                title={t('redirectTracer.loadError')}
                description={t('redirectTracer.loadErrorHint')}
              />
            )}

            {pageEntry && (
              <ChainCard
                entry={pageEntry}
                featured
                expanded={expanded === pageEntry.target.url || pageEntry.phase === 'checking'}
                index={0}
                onToggle={toggle}
                onRetrace={retrace}
              />
            )}

            {hasResults && <SummaryStrip summary={summary} />}

            {hasResults && (
              <div className="space-y-2.5">
                <div
                  role="group"
                  aria-label={t('redirectTracer.filters')}
                  className="flex flex-wrap gap-1.5"
                >
                  {REDIRECT_FILTERS.filter((item) => item === 'all' || item === filter || counts[item] > 0).map((item) => {
                    const on = item === filter
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setFilter(item)}
                        className={cn(RT_CHIP, on ? RT_CHIP_ON : RT_CHIP_IDLE)}
                      >
                        {t(`redirectTracer.filter.${item}`)}
                        <span className="tabular-nums opacity-70">{counts[item].toLocaleString()}</span>
                      </button>
                    )
                  })}
                </div>
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder={t('redirectTracer.search')}
                  ariaLabel={t('redirectTracer.search')}
                />
              </div>
            )}

            {ready && !hasResults && !scan.running && (
              <div className="flex flex-col items-center">
                <EmptyState
                  icon={RouteIcon}
                  title={t('redirectTracer.empty.title')}
                  description={t('redirectTracer.empty.body')}
                />
                <Button
                  className="h-11 min-w-44"
                  onClick={() => void scan.start(targets)}
                  disabled={targets.length === 0}
                >
                  <ScanSearchIcon />
                  {t('redirectTracer.empty.action')}
                </Button>
              </div>
            )}

            {visible.length > 0 && (
              <ul className="flex flex-col gap-2.5" aria-busy={scan.running}>
                {visible.map((entry, index) => (
                  <li key={entry.target.url}>
                    <ChainCard
                      entry={entry}
                      expanded={expanded === entry.target.url}
                      index={index + 1}
                      onToggle={toggle}
                      onLocate={locate}
                      onRetrace={retrace}
                    />
                  </li>
                ))}
              </ul>
            )}

            {hasResults && visible.length === 0 && scanned.length > 0 && (
              <EmptyState
                icon={RouteIcon}
                title={query ? t('redirectTracer.noMatches') : t('redirectTracer.noRedirects')}
                description={query ? undefined : t('redirectTracer.noRedirectsHint')}
              />
            )}

            {showTabHops && (
              <section className="rounded-xl border border-border/70 bg-card/80 p-3.5 shadow-xs">
                <h2 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('redirectTracer.tabHops')}
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t('redirectTracer.tabHopsHint')}</p>
                <ol className="mt-2.5 space-y-2">
                  {uniqueTabHops.map((hop, index) => (
                    <li key={`${hop.at}-${index}`} className="flex gap-2.5">
                      <span className="relative flex w-4 shrink-0 justify-center">
                        <span className="relative z-10 mt-1.5 size-2 rounded-full bg-primary/70" aria-hidden />
                        {index < uniqueTabHops.length - 1 && (
                          <span className="absolute top-3.5 bottom-[-6px] w-px bg-border" aria-hidden />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-muted-foreground">#{index + 1}</p>
                        <p className="break-all font-mono text-[11px] leading-4">{hop.url}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </div>
      </div>
    </ToolPage>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2.5" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="rounded-xl border border-border/70 p-3">
          <div className="flex gap-2.5">
            <Skeleton className="size-8 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
