import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangleIcon, CircleCheckIcon, DownloadIcon, SaveIcon, XIcon } from 'lucide-react'

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
import { parseNumberInRange } from '@/shared/components/NumberField'
import { ToolPage } from '@/shared/components/ToolPage'
import { useToast } from '@/shared/components/toast/useToast'
import { Button } from '@/shared/components/ui/button'
import { useFocusTarget } from '@/shared/hooks/useFocusTarget'
import { cn } from '@/shared/utils/cn'
import { useWebTool } from '../_shared'
import { FilterBar, PageCard } from './BundleHeader'
import { BundleProgress } from './BundleProgress'
import { LinkList } from './LinkList'
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
  getDocumentTitleFromTab,
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

const SAVE_SHORTCUT =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘S' : 'Ctrl S'

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
  const toast = useToast()
  useFocusTarget()
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
    const timer = setTimeout(() => void scan(), 0)
    return () => clearTimeout(timer)
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

  const invertFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const entry of filtered) {
        if (next.has(entry.resolvedUrl)) next.delete(entry.resolvedUrl)
        else next.add(entry.resolvedUrl)
      }
      return next
    })
  }

  const copySelectedLinks = async () => {
    const urls = entries.map((entry) => entry.resolvedUrl).filter((url) => selected.has(url))
    try {
      await navigator.clipboard.writeText(urls.join('\n'))
      toast.show(t('htmlBundle.ui.copied', { count: urls.length }), { variant: 'success' })
    } catch {
      toast.show(t('htmlBundle.ui.copyFailed'), { variant: 'error' })
    }
  }

  const scanFolderPage = async () => {
    setLoading(true)
    setError('')
    try {
      const url = pageUrl || (await getActivePageMeta()).url
      await scanFromFolder(url)
    } catch (folderScanError) {
      setError(folderScanError instanceof Error ? folderScanError.message : t('htmlBundle.scanFailed'))
    } finally {
      setLoading(false)
    }
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
        const resolvedTitle =
          pageTitle.trim() ||
          (await getDocumentTitleFromTab(pageTabId ?? meta.tabId).catch(() => '')) ||
          meta.title
        const fileName = zipFileName(
          resolvedTitle,
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
          pageTitle: resolvedTitle,
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

  const zipPageCount = pageUrl ? new Set([pageUrl.split('#')[0], ...selected]).size : selected.size + 1
  const canDownloadZip = !busy && selected.size > 0 && !tooManySelected

  return (
    <ToolPage tool={tool}>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5">
        <PageCard
          pageTitle={pageTitle}
          pageUrl={pageUrl}
          linkCount={entries.length}
          loading={loading}
          onRescan={() => {
            setProgress('')
            void scan()
          }}
        />

        <FilterBar
          htmlOnly={htmlOnly}
          sameFolderOnly={sameFolderOnly}
          onHtmlOnly={setHtmlOnly}
          onSameFolderOnly={setSameFolderOnly}
          pageLimit={pageLimit}
          limitText={limitText}
          onLimitText={onLimitTextChange}
          onLimitPreset={applyPageLimit}
          busy={busy}
          isFilePage={isFilePage}
          onScanFolder={() => void scanFolderPage()}
          onPickFolder={() => void downloadSelectedZip(true)}
        />

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
              'flex items-start gap-2 rounded-xl border px-2.5 py-2 text-[11px]',
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
          <p role="status" className="text-[11px] text-muted-foreground">
            {progress}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-[11px] text-destructive"
          >
            <AlertTriangleIcon className="mt-px size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">{error}</span>
          </p>
        )}
        {tooManySelected && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-[11px] text-destructive"
          >
            <AlertTriangleIcon className="size-3.5 shrink-0" aria-hidden />
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

        <LinkList
          total={entries.length}
          filtered={filtered}
          selected={selected}
          selectAllState={selectAllState}
          query={query}
          onQuery={setQuery}
          loading={loading}
          busy={busy}
          overLimit={tooManySelected}
          filtersOn={{ htmlOnly, sameFolderOnly }}
          onToggle={toggle}
          onToggleAll={toggleAllFiltered}
          onInvert={invertFiltered}
          onCopy={() => void copySelectedLinks()}
          onAllTypes={() => setHtmlOnly(false)}
          onAnyFolder={() => setSameFolderOnly(false)}
          onSaveThisPage={downloadCurrentOnly}
        />

        <div className="sticky bottom-0 z-10 -mx-[var(--density-page-pad)] -mb-[var(--density-page-pad)] flex items-center gap-2 border-t bg-background px-[var(--density-page-pad)] py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs leading-4 font-semibold tabular-nums">
              {t('htmlBundle.ui.summary', { count: zipPageCount })}
            </p>
            <p className="truncate text-[11px] leading-4 text-muted-foreground">{t('htmlBundle.ui.summaryHint')}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={downloadCurrentOnly}
            disabled={busy}
            title={t('htmlBundle.downloadCurrent')}
            aria-label={t('htmlBundle.downloadCurrent')}
            className="shrink-0"
          >
            <SaveIcon className="size-3.5" />
            <span className="hidden @[400px]:inline">{t('htmlBundle.ui.thisPage')}</span>
          </Button>
          <Button
            size="sm"
            onClick={() => void downloadSelectedZip(false)}
            disabled={!canDownloadZip}
            aria-keyshortcuts="Control+S Meta+S"
            title={t('htmlBundle.shortcutHint')}
            className="shrink-0"
          >
            <DownloadIcon className="size-3.5" />
            {t('htmlBundle.downloadZip')}
            <kbd className="hidden rounded bg-primary-foreground/20 px-1 font-sans text-[10px] leading-4 font-medium @[340px]:inline">
              {SAVE_SHORTCUT}
            </kbd>
          </Button>
        </div>
      </div>
    </ToolPage>
  )
}
