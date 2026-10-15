import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CircleCheckIcon,
  DownloadIcon,
  FolderOpenIcon,
  RefreshCwIcon,
  SaveIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react'

import type { HtmlLinkCandidate } from '@/core/engines/htmlArchive'
import {
  basenameOf,
  DEFAULT_MAX_PAGES,
  MAX_PAGES_CEILING,
  zipFileName,
} from '@/core/engines/htmlArchive'
import {
  clearHtmlBundleJob,
  isJobRunning,
  isJobStalled,
  type BundleProgressEvent,
  type HtmlBundleJob,
} from '@/core/htmlBundleJob'
import { useHtmlBundleJob } from '@/features/html-bundle-job/useHtmlBundleJob'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'
import { useWebTool } from '../_shared'
import { BundleProgress } from './BundleProgress'
import {
  buildBundleFromFolderIndex,
  getCachedReportFolder,
  pickReportFolder,
  scanHtmlBundleFromFolderIndex,
} from './folderReader'
import {
  TabMessagingError,
  cancelHtmlBundleJob,
  downloadZip,
  getActivePageMeta,
  isActiveTabContentScriptReady,
  loadPageLimit,
  savePageLimit,
  scanHtmlBundle,
  shouldUseFolderBuild,
  startHtmlBundleJob,
} from './service'
import { isFileUrlTab } from '@/chrome/contentScriptClient'

type Translate = (key: string, options?: Record<string, unknown>) => string

interface FolderBuild {
  pageCount: number
  startedAt: number
  progress: BundleProgressEvent | null
}

function formatTabToolError(error: unknown, t: Translate): string {
  if (error instanceof TabMessagingError) {
    switch (error.code) {
      case 'NO_TAB':
        return t('htmlBundle.noActiveTab')
      case 'RESTRICTED_PAGE':
        return t('htmlBundle.restrictedPage')
      case 'FILE_URL_ACCESS':
        return t('htmlBundle.enableFileUrls')
      case 'CONTENT_SCRIPT_UNAVAILABLE':
      case 'INJECT_FAILED':
        return t('htmlBundle.noContentScript')
      default:
        break
    }
  }
  if (error instanceof Error) {
    const msg = error.message
    if (
      msg.includes('Receiving end does not exist') ||
      msg.includes('Could not establish connection')
    ) {
      return t('htmlBundle.noContentScript')
    }
    return msg
  }
  return t('htmlBundle.scanFailed')
}

function statsMessage(stats: { pages: number; assets: number; missing: number }, t: Translate) {
  return stats.missing > 0
    ? t('htmlBundle.doneWithMissing', stats)
    : t('htmlBundle.done', { pages: stats.pages, assets: stats.assets })
}

function jobOutcome(job: HtmlBundleJob | null, t: Translate) {
  if (!job) return null
  if (isJobStalled(job)) return { tone: 'error' as const, text: t('htmlBundle.jobStalled') }
  switch (job.status) {
    case 'done':
      return {
        tone: 'success' as const,
        text: job.stats ? statsMessage(job.stats, t) : t('htmlBundle.bannerDone'),
      }
    case 'error':
      return { tone: 'error' as const, text: job.error || t('htmlBundle.buildFailed') }
    case 'cancelled':
      return { tone: 'muted' as const, text: t('htmlBundle.jobCancelled') }
    default:
      return null
  }
}

export default function HtmlBundleTool() {
  const { t } = useTranslation()
  const tool = useWebTool('web.html-bundle')
  const job = useHtmlBundleJob()
  const [entries, setEntries] = useState<HtmlLinkCandidate[]>([])
  const [pageUrl, setPageUrl] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [htmlOnly, setHtmlOnly] = useState(true)
  const [sameFolderOnly, setSameFolderOnly] = useState(true)
  const [includeAssets] = useState(true)
  const [loading, setLoading] = useState(false)
  const [folderBuild, setFolderBuild] = useState<FolderBuild | null>(null)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [pageTabId, setPageTabId] = useState<number>()
  const [pageLimit, setPageLimit] = useState(DEFAULT_MAX_PAGES)
  const [limitText, setLimitText] = useState(String(DEFAULT_MAX_PAGES))

  const isFilePage = pageUrl.startsWith('file:')
  const jobActive = isJobRunning(job)
  const busy = loading || jobActive || folderBuild !== null
  const tooManySelected = selected.size > pageLimit
  const outcome = jobOutcome(job, t)

  useEffect(() => {
    void loadPageLimit().then((limit) => {
      setPageLimit(limit)
      setLimitText(String(limit))
    })
  }, [])

  const applyPageLimit = useCallback((limit: number) => {
    setPageLimit(limit)
    setLimitText(String(limit))
    void savePageLimit(limit)
  }, [])

  const onLimitTextChange = (value: string) => {
    setLimitText(value)
    const parsed = parseNumberInRange(value, 1, MAX_PAGES_CEILING)
    if (parsed !== null) {
      setPageLimit(parsed)
      void savePageLimit(parsed)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (entry) =>
        entry.label.toLowerCase().includes(q) || entry.filename.toLowerCase().includes(q),
    )
  }, [entries, query])

  const filteredSelectedCount = useMemo(
    () => filtered.reduce((count, entry) => count + (selected.has(entry.resolvedUrl) ? 1 : 0), 0),
    [filtered, selected],
  )
  const selectAllState: boolean | 'indeterminate' =
    filtered.length > 0 && filteredSelectedCount === filtered.length
      ? true
      : filteredSelectedCount > 0
        ? 'indeterminate'
        : false

  const scanFromFolder = useCallback(
    async (url: string, forcePick = true) => {
      const index = await pickReportFolder({ forcePick })
      if (!index) throw new Error(t('htmlBundle.folderCancelled'))
      const result = scanHtmlBundleFromFolderIndex(index, url, { htmlOnly, sameFolderOnly })
      setPageUrl(result.pageUrl)
      setPageTitle(result.pageTitle)
      setEntries(result.entries)
      setSelected(new Set(result.entries.map((entry) => entry.resolvedUrl)))
    },
    [htmlOnly, sameFolderOnly, t],
  )

  const scan = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const meta = await getActivePageMeta()
      if (meta.tabId != null) setPageTabId(meta.tabId)
      if (meta.url) {
        setPageUrl(meta.url)
        setPageTitle(meta.title)
      }

      if (isFileUrlTab(meta.url)) {
        const ready = await isActiveTabContentScriptReady(meta.tabId)
        if (!ready) {
          setError(t('htmlBundle.fileUrlScanHint'))
          return
        }
      }

      const result = await scanHtmlBundle({ htmlOnly, sameFolderOnly }, meta.tabId ?? pageTabId)
      setPageUrl(result.pageUrl)
      setPageTitle(result.pageTitle)
      setEntries(result.entries)
      setSelected(new Set(result.entries.map((entry) => entry.resolvedUrl)))
    } catch (scanError) {
      const meta = await getActivePageMeta().catch(() => ({ url: '', title: '' }))
      if (
        isFileUrlTab(meta.url) &&
        (scanError instanceof TabMessagingError
          ? scanError.code === 'FILE_URL_ACCESS' || scanError.code === 'INJECT_FAILED'
          : true)
      ) {
        setError(t('htmlBundle.fileUrlScanHint'))
        if (meta.url) setPageUrl(meta.url)
      } else {
        setError(formatTabToolError(scanError, t))
      }
    } finally {
      setLoading(false)
    }
  }, [htmlOnly, pageTabId, sameFolderOnly, t])

  useEffect(() => {
    void scan()
  }, [scan])

  useEffect(() => {
    if (!chrome.tabs?.onActivated) return undefined

    let debounceId: ReturnType<typeof setTimeout> | undefined
    const scheduleScan = () => {
      if (debounceId) clearTimeout(debounceId)
      debounceId = setTimeout(() => {
        setProgress('')
        void scan()
      }, 250)
    }

    const onActivated = () => scheduleScan()
    const onUpdated = (
      _tabId: number,
      changeInfo: { status?: string },
      tab: chrome.tabs.Tab,
    ) => {
      if (changeInfo.status === 'complete' && tab.active) scheduleScan()
    }

    chrome.tabs.onActivated.addListener(onActivated)
    chrome.tabs.onUpdated.addListener(onUpdated)
    return () => {
      if (debounceId) clearTimeout(debounceId)
      chrome.tabs.onActivated.removeListener(onActivated)
      chrome.tabs.onUpdated.removeListener(onUpdated)
    }
  }, [scan])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const entry of filtered) {
        if (selectAllState === true) next.delete(entry.resolvedUrl)
        else next.add(entry.resolvedUrl)
      }
      return next
    })
  }

  const runFolderDownload = useCallback(
    async (target: { url: string; selectedUrls: string[]; fileName: string; pageCount: number }, forcePick: boolean) => {
      const { url, selectedUrls, fileName, pageCount } = target
      if (!getCachedReportFolder() || forcePick) setProgress(t('htmlBundle.pickFolderForCurrent'))
      const index = await pickReportFolder({ forcePick })
      if (!index) throw new Error(t('htmlBundle.folderCancelled'))
      setProgress('')
      setFolderBuild({ pageCount, startedAt: Date.now(), progress: null })
      try {
        const result = await buildBundleFromFolderIndex(index, {
          currentPageFileName: basenameOf(url),
          selectedFileNames: selectedUrls.map((u) => basenameOf(u)),
          includeAssets,
          onProgress: (next) =>
            setFolderBuild((current) => (current ? { ...current, progress: next } : current)),
        })
        downloadZip(result.zipBytes, fileName)
        setProgress(statsMessage(result.stats, t))
      } finally {
        setFolderBuild(null)
      }
    },
    [includeAssets, t],
  )

  const runDownload = useCallback(
    async (selectedUrls: string[], forceFolderPick = false) => {
      setLoading(true)
      setError('')
      setProgress('')
      try {
        const meta = await getActivePageMeta()
        const url = pageUrl || meta.url
        const pageCount = new Set([url.split('#')[0], ...selectedUrls]).size
        const fileName = zipFileName(
          pageTitle || meta.title,
          url,
          pageCount > 1 ? ` (${pageCount} pages)` : '',
        )

        if (pageCount > pageLimit) {
          throw new Error(t('htmlBundle.tooManySelected', { max: pageLimit, count: pageCount }))
        }

        if (shouldUseFolderBuild(url) || forceFolderPick) {
          await runFolderDownload({ url, selectedUrls, fileName, pageCount }, forceFolderPick)
          return
        }

        await clearHtmlBundleJob()
        await startHtmlBundleJob({
          tabId: pageTabId ?? meta.tabId,
          pageUrl: url,
          pageTitle: pageTitle || meta.title,
          fileName,
          pageCount,
          request: {
            includeCurrent: true,
            selectedResolvedUrls: selectedUrls,
            includeAssets,
            maxPages: pageLimit,
          },
        })
      } catch (buildError) {
        setProgress('')
        setError(formatTabToolError(buildError, t) || t('htmlBundle.buildFailed'))
      } finally {
        setLoading(false)
      }
    },
    [includeAssets, pageLimit, pageTabId, pageTitle, pageUrl, runFolderDownload, t],
  )

  const downloadSelectedZip = useCallback(
    (forceFolderPick = false) => runDownload([...selected], forceFolderPick),
    [runDownload, selected],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (!busy && selected.size > 0 && !tooManySelected) void downloadSelectedZip()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, downloadSelectedZip, selected.size, tooManySelected])

  const downloadCurrentOnly = () => void runDownload([])

  const cancelJob = () => {
    if (job) void cancelHtmlBundleJob(job.id).catch(() => {})
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <p className="text-[11px] text-muted-foreground">{t('htmlBundle.privacy')}</p>
        {pageTitle && (
          <div className="rounded-md border bg-muted/30 px-2 py-1.5 text-[11px]">
            <div className="font-medium">{pageTitle}</div>
            <div className="truncate text-muted-foreground">{pageUrl}</div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => void scan()} disabled={loading}>
            <RefreshCwIcon className="size-3.5" />
            {t('htmlBundle.scan')}
          </Button>
          <Button size="sm" variant="outline" onClick={downloadCurrentOnly} disabled={busy}>
            <SaveIcon className="size-3.5" />
            {t('htmlBundle.downloadCurrent')}
          </Button>
          <Button
            size="sm"
            onClick={() => void downloadSelectedZip(false)}
            disabled={busy || selected.size === 0 || tooManySelected}
          >
            <DownloadIcon className="size-3.5" />
            {t('htmlBundle.downloadZip')}
          </Button>
          {isFilePage && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void (async () => {
                    setLoading(true)
                    setError('')
                    try {
                      const url = pageUrl || (await getActivePageMeta()).url
                      await scanFromFolder(url)
                    } catch (folderScanError) {
                      setError(
                        folderScanError instanceof Error
                          ? folderScanError.message
                          : t('htmlBundle.scanFailed'),
                      )
                    } finally {
                      setLoading(false)
                    }
                  })()
                }}
                disabled={busy}
              >
                <FolderOpenIcon className="size-3.5" />
                {t('htmlBundle.scanFromFolder')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void downloadSelectedZip(true)}
                disabled={busy}
              >
                <FolderOpenIcon className="size-3.5" />
                {t('htmlBundle.pickFolder')}
              </Button>
            </>
          )}
        </div>

        <BundleProgress
          active={jobActive}
          pageCount={job?.pageCount ?? 0}
          progress={job?.progress ?? null}
          startedAt={job?.startedAt}
          runsInBackground
          onCancel={cancelJob}
        />
        <BundleProgress
          active={folderBuild !== null}
          pageCount={folderBuild?.pageCount ?? 0}
          progress={folderBuild?.progress ?? null}
          startedAt={folderBuild?.startedAt}
        />
        {outcome && !jobActive && (
          <div
            role={outcome.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'flex items-start gap-2 rounded-md border px-2 py-1.5 text-[11px]',
              outcome.tone === 'error' && 'border-destructive/30 bg-destructive/5 text-destructive',
              outcome.tone === 'success' && 'border-primary/20 bg-primary/5',
              outcome.tone === 'muted' && 'text-muted-foreground',
            )}
          >
            {outcome.tone === 'success' && (
              <CircleCheckIcon className="mt-px size-3.5 shrink-0 text-primary" aria-hidden />
            )}
            <span className="min-w-0 flex-1">
              {outcome.tone === 'success' && job?.fileName && (
                <span className="block truncate font-medium text-foreground">{job.fileName}</span>
              )}
              {outcome.text}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => void clearHtmlBundleJob()}
              className="-m-1 size-6 shrink-0 text-muted-foreground"
              aria-label={t('htmlBundle.dismiss')}
            >
              <XIcon className="size-3.5" />
            </Button>
          </div>
        )}
        {progress && !folderBuild && (
          <p className="text-[11px] text-muted-foreground">{progress}</p>
        )}
        {error && (
          <p role="alert" className="text-[11px] text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 rounded-md border p-2 text-[11px]">
          <label className="flex items-center justify-between gap-2">
            {t('htmlBundle.htmlOnly')}
            <Switch checked={htmlOnly} onCheckedChange={setHtmlOnly} />
          </label>
          <label className="flex items-center justify-between gap-2">
            {t('htmlBundle.sameFolderOnly')}
            <Switch checked={sameFolderOnly} onCheckedChange={setSameFolderOnly} />
          </label>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div>{t('htmlBundle.pageLimit')}</div>
              <div className="text-[10px] text-muted-foreground">
                {t('htmlBundle.pageLimitHint', { default: DEFAULT_MAX_PAGES, max: MAX_PAGES_CEILING })}
              </div>
            </div>
            <NumberField
              value={limitText}
              onChange={onLimitTextChange}
              ariaLabel={t('htmlBundle.pageLimit')}
              min={1}
              max={MAX_PAGES_CEILING}
              disabled={busy}
              className="h-8 w-20 shrink-0 text-right text-xs"
            />
          </div>
          <span className="text-muted-foreground">{t('htmlBundle.includeAssetsHint')}</span>
        </div>

        <div className="relative">
          <SearchIcon className="absolute top-2 left-2 size-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('htmlBundle.search')}
            className="pl-8"
            aria-label={t('htmlBundle.search')}
          />
        </div>

        {tooManySelected && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-[11px] text-destructive"
          >
            <span className="min-w-0 flex-1">
              {t('htmlBundle.tooManySelected', { max: pageLimit, count: selected.size })}
            </span>
            {selected.size <= MAX_PAGES_CEILING && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={() => applyPageLimit(selected.size)}
                disabled={busy}
              >
                {t('htmlBundle.raiseLimit', { count: selected.size })}
              </Button>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
          {filtered.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">{t('htmlBundle.noLinks')}</p>
          ) : (
            <>
              <label className="sticky top-0 z-10 flex min-h-10 cursor-pointer items-center gap-2 border-b bg-muted/80 px-2 py-2 text-[11px] backdrop-blur-sm transition-colors hover:bg-muted">
                <Checkbox
                  checked={selectAllState}
                  onCheckedChange={toggleAllFiltered}
                  aria-label={t('htmlBundle.selectAll')}
                />
                <span className="font-medium">
                  {query.trim()
                    ? t('htmlBundle.selectAllMatches', { count: filtered.length })
                    : t('htmlBundle.selectAll')}
                </span>
                <span
                  className={cn(
                    'ml-auto tabular-nums',
                    tooManySelected ? 'font-medium text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {t('htmlBundle.selectedCount', { count: selected.size, total: entries.length })}
                </span>
              </label>
              <ul className="divide-y">
                {filtered.map((entry) => (
                  <li key={entry.id}>
                    <label className="flex cursor-pointer items-start gap-2 px-2 py-1.5 text-[11px] hover:bg-accent/50">
                      <Checkbox
                        className="mt-0.5"
                        checked={selected.has(entry.resolvedUrl)}
                        onCheckedChange={() => toggle(entry.resolvedUrl)}
                        aria-label={entry.label}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{entry.label}</div>
                        <div className="truncate text-muted-foreground">{entry.filename}</div>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground">{t('htmlBundle.shortcutHint')}</p>
      </div>
    </ToolPage>
  )
}
