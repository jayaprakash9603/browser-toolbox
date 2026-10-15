import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DownloadIcon,
  FolderOpenIcon,
  RefreshCwIcon,
  SaveIcon,
  SearchIcon,
} from 'lucide-react'

import type { HtmlLinkCandidate } from '@/core/engines/htmlArchive'
import { basenameOf, zipFileName } from '@/core/engines/htmlArchive'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
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
  buildHtmlBundle,
  downloadZip,
  getActivePageMeta,
  isActiveTabContentScriptReady,
  scanHtmlBundle,
  shouldUseFolderBuild,
} from './service'
import { isFileUrlTab } from '@/chrome/contentScriptClient'

function formatTabToolError(error: unknown, t: (key: string) => string): string {
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

export default function HtmlBundleTool() {
  const { t } = useTranslation()
  const tool = useWebTool('web.html-bundle')
  const [entries, setEntries] = useState<HtmlLinkCandidate[]>([])
  const [pageUrl, setPageUrl] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [htmlOnly, setHtmlOnly] = useState(true)
  const [sameFolderOnly, setSameFolderOnly] = useState(true)
  const [includeAssets] = useState(true)
  const [loading, setLoading] = useState(false)
  const [buildingPages, setBuildingPages] = useState(0)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [pageTabId, setPageTabId] = useState<number>()
  const isFilePage = pageUrl.startsWith('file:')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (entry) =>
        entry.label.toLowerCase().includes(q) || entry.filename.toLowerCase().includes(q),
    )
  }, [entries, query])

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
      const meta = await getActivePageMeta()
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

  const selectAll = () => setSelected(new Set(filtered.map((entry) => entry.resolvedUrl)))
  const selectNone = () => setSelected(new Set())
  const invertSelection = () => {
    setSelected((prev) => {
      const next = new Set<string>()
      for (const entry of filtered) {
        if (!prev.has(entry.resolvedUrl)) next.add(entry.resolvedUrl)
      }
      return next
    })
  }

  const reportDone = useCallback(
    (stats: { pages: number; assets: number; missing: number }) => {
      setProgress(
        stats.missing > 0
          ? t('htmlBundle.doneWithMissing', stats)
          : t('htmlBundle.done', { pages: stats.pages, assets: stats.assets }),
      )
    },
    [t],
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

        if (shouldUseFolderBuild(url) || forceFolderPick) {
          if (!getCachedReportFolder() || forceFolderPick) {
            setProgress(t('htmlBundle.pickFolderForCurrent'))
          }
          const index = await pickReportFolder({ forcePick: forceFolderPick })
          if (!index) throw new Error(t('htmlBundle.folderCancelled'))
          setProgress('')
          setBuildingPages(pageCount)
          const result = await buildBundleFromFolderIndex(index, {
            currentPageFileName: basenameOf(url),
            selectedFileNames: selectedUrls.map((u) => basenameOf(u)),
            includeAssets,
          })
          downloadZip(result.zipBytes, fileName)
          reportDone(result.stats)
          return
        }

        setBuildingPages(pageCount)
        const result = await buildHtmlBundle(
          { includeCurrent: true, selectedResolvedUrls: selectedUrls, includeAssets },
          { tabId: pageTabId ?? meta.tabId },
        )
        downloadZip(result.zipBytes, fileName)
        reportDone(result.stats)
      } catch (buildError) {
        setProgress('')
        setError(formatTabToolError(buildError, t) || t('htmlBundle.buildFailed'))
      } finally {
        setBuildingPages(0)
        setLoading(false)
      }
    },
    [includeAssets, pageTabId, pageTitle, pageUrl, reportDone, t],
  )

  const downloadSelectedZip = useCallback(
    (forceFolderPick = false) => runDownload([...selected], forceFolderPick),
    [runDownload, selected],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void downloadSelectedZip()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [downloadSelectedZip])

  const downloadCurrentOnly = () => void runDownload([])

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
          <Button size="sm" variant="outline" onClick={downloadCurrentOnly} disabled={loading}>
            <SaveIcon className="size-3.5" />
            {t('htmlBundle.downloadCurrent')}
          </Button>
          <Button
            size="sm"
            onClick={() => void downloadSelectedZip(false)}
            disabled={loading || selected.size === 0}
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
                disabled={loading}
              >
                <FolderOpenIcon className="size-3.5" />
                {t('htmlBundle.scanFromFolder')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void downloadSelectedZip(true)}
                disabled={loading}
              >
                <FolderOpenIcon className="size-3.5" />
                {t('htmlBundle.pickFolder')}
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-md border p-2 text-[11px]">
          <label className="flex items-center justify-between gap-2">
            {t('htmlBundle.htmlOnly')}
            <Switch checked={htmlOnly} onCheckedChange={setHtmlOnly} />
          </label>
          <label className="flex items-center justify-between gap-2">
            {t('htmlBundle.sameFolderOnly')}
            <Switch checked={sameFolderOnly} onCheckedChange={setSameFolderOnly} />
          </label>
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

        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="ghost" onClick={selectAll}>{t('htmlBundle.selectAll')}</Button>
          <Button size="sm" variant="ghost" onClick={selectNone}>{t('htmlBundle.selectNone')}</Button>
          <Button size="sm" variant="ghost" onClick={invertSelection}>{t('htmlBundle.invert')}</Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
          {filtered.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">{t('htmlBundle.noLinks')}</p>
          ) : (
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
          )}
        </div>

        <BundleProgress active={buildingPages > 0} pageCount={buildingPages} />
        {progress && buildingPages === 0 && (
          <p className="text-[11px] text-muted-foreground">{progress}</p>
        )}
        {error && (
          <p role="alert" className="text-[11px] text-destructive">
            {error}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">{t('htmlBundle.shortcutHint')}</p>
      </div>
    </ToolPage>
  )
}
