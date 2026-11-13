import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { CrawlProgress } from '@/core/engines/htmlArchive/crawl'
import {
  applyLinkHealth,
  buildLinkGraph,
  graphPagesFromSnapshot,
  type GraphPageInput,
  type LinkGraph,
} from '@/core/engines/links/graph'
import type { PageLinksSnapshot } from '@/core/engines/links/pageLinks'
import { requestAllSitesAccess } from '@/core/permissions/siteAccess'

import { crawlSiteLinks, pauseActiveSiteLinkCrawl, stopActiveSiteLinkCrawl } from '../link-checker/crawlService'
import { sendToActiveTab } from '../tabMessaging'
import {
  DEFAULT_INTELLIGENCE_SETTINGS,
  loadIntelligenceSettings,
  saveIntelligenceSettings,
  toDiscoverOptions,
  type IntelligenceSettings,
} from './intelligenceSettings'
import { MAX_CHECKED_URLS, useLinkChecks } from './useLinkChecks'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; snapshot: PageLinksSnapshot }

export function useLinkIntelligence() {
  const checks = useLinkChecks()
  const resetChecks = checks.reset
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [pages, setPages] = useState<GraphPageInput[]>([])
  const [incomplete, setIncomplete] = useState(false)
  const [settings, setSettings] = useState(DEFAULT_INTELLIGENCE_SETTINGS)
  const [crawl, setCrawl] = useState<{ progress: CrawlProgress | null; paused: boolean; startedAt: number } | null>(null)
  const [failedUrls, setFailedUrls] = useState<string[]>([])
  const [crawlError, setCrawlError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    void loadIntelligenceSettings().then(setSettings)
  }, [])

  const applySnapshot = useCallback((data: PageLinksSnapshot | null) => {
    if (!data) {
      setLoad({ status: 'error' })
      return
    }
    if (urlRef.current !== data.url) {
      resetChecks()
      setSelectedId(null)
      setPages(graphPagesFromSnapshot(data))
      setIncomplete(false)
      setFailedUrls([])
    }
    urlRef.current = data.url
    setLoad({ status: 'ready', snapshot: data })
    setStale(false)
  }, [resetChecks])

  const rescan = useCallback(() => {
    void sendToActiveTab<PageLinksSnapshot>({ type: 'GET_PAGE_LINKS' }).then(applySnapshot)
  }, [applySnapshot])

  useEffect(() => {
    void sendToActiveTab<PageLinksSnapshot>({ type: 'GET_PAGE_LINKS' }).then(applySnapshot)
  }, [applySnapshot])

  useEffect(() => {
    const tabs = typeof chrome === 'undefined' ? undefined : chrome.tabs
    if (!tabs?.onActivated || !tabs.onUpdated) return
    const pageChanged = () => {
      if (checks.checking || crawl) setStale(true)
      else rescan()
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
  }, [checks.checking, crawl, rescan])

  const snapshot = load.status === 'ready' ? load.snapshot : null

  const graph: LinkGraph | null = useMemo(() => {
    if (!snapshot) return null
    const built = buildLinkGraph(pages.length > 0 ? pages : graphPagesFromSnapshot(snapshot), {
      startUrl: snapshot.url,
      keepQuery: settings.keepQuery,
      incomplete,
    })
    return applyLinkHealth(built, (url) => checks.results.get(url) ?? checks.results.get(stripQuery(url)))
  }, [snapshot, pages, settings.keepQuery, incomplete, checks.results])

  const patchSettings = useCallback((patch: Partial<IntelligenceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      void saveIntelligenceSettings(next)
      return next
    })
  }, [])

  const startCrawl = useCallback(
    async (seedUrls?: string[]) => {
      if (settings.scope === 'page' || !snapshot) return
      setCrawl({ progress: null, paused: false, startedAt: Date.now() })
      setFailedUrls([])
      setCrawlError(null)
      try {
        await requestAllSitesAccess()
        const result = await crawlSiteLinks(
          toDiscoverOptions(settings),
          (progress) => setCrawl((current) => (current ? { ...current, progress } : current)),
          { ...toDiscoverOptions(settings), seedUrls },
          (page) =>
            setPages((current) => {
              const next = current.filter((item) => item.url !== page.url)
              next.push(page)
              return next
            }),
        )
        setPages(result.pages?.length ? result.pages : graphPagesFromSnapshot(result.snapshot))
        setIncomplete(result.summary.reason === 'limit' || result.summary.reason === 'stopped')
        setFailedUrls(result.failedUrls ?? [])
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === 'AbortError'
        if (!aborted) setCrawlError(error instanceof Error ? error.message : 'crawl')
      } finally {
        setCrawl(null)
      }
    },
    [settings, snapshot],
  )

  const pauseCrawl = useCallback(async (paused: boolean) => {
    setCrawl((current) => (current ? { ...current, paused } : current))
    await pauseActiveSiteLinkCrawl(paused)
  }, [])

  const stopCrawl = useCallback(async () => {
    await stopActiveSiteLinkCrawl()
  }, [])

  const startCheck = useCallback(
    (hrefs?: string[]) => {
      if (!graph) return
      const targets = hrefs ?? checkTargets(graph, settings.checkExternals)
      void checks.run(targets, !hrefs, settings.timeoutMs)
    },
    [checks, graph, settings.checkExternals, settings.timeoutMs],
  )

  return {
    load,
    snapshot,
    graph,
    pages,
    settings,
    patchSettings,
    crawl,
    failedUrls,
    crawlError,
    selectedId,
    setSelectedId,
    stale,
    setStale,
    rescan,
    startCrawl,
    pauseCrawl,
    stopCrawl,
    startCheck,
    checks,
  }
}

function checkTargets(graph: LinkGraph, includeExternal: boolean): string[] {
  const urls = graph.edges
    .filter((edge) => edge.linkType === 'internal' || (includeExternal && edge.linkType === 'external'))
    .map((edge) => edge.destinationUrl)
  return [...new Set(urls)].slice(0, MAX_CHECKED_URLS)
}

function stripQuery(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.search = ''
    parsed.hash = ''
    return parsed.href
  } catch {
    return url
  }
}
