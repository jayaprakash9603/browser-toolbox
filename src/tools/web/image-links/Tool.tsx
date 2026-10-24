import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowUpDownIcon,
  EraserIcon,
  EyeOffIcon,
  GlobeIcon,
  HighlighterIcon,
  ImageIcon,
  ImagesIcon,
  LayoutGridIcon,
  ListIcon,
  RefreshCwIcon,
  SearchIcon,
  SearchXIcon,
  ShieldAlertIcon,
  SlidersHorizontalIcon,
  SquareDashedMousePointerIcon,
  TriangleAlertIcon,
  TypeIcon,
  XIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  applyFilenameTemplate,
  buildDownloadPath,
  type ImageSource,
  type PageImage,
} from '@/core/engines/imageDownloader'
import {
  IMAGE_LINK_SOURCES,
  IMAGE_LINK_TYPES,
  countActiveImageLinkFilters,
  exportImageLinks,
  queryImageLinks,
  summarizeImageLinks,
  toImageLinkItems,
  type ImageLinkItem,
  type ImageLinkType,
  type ImageLinksAltFilter,
  type ImageLinksExportFormat,
  type ImageLinksQuery,
  type ImageLinksSort,
} from '@/core/engines/imageLinks'
import {
  DEFAULT_IMAGE_LINKS_SETTINGS,
  getImageLinksSettings,
  saveImageLinksSettings,
  type ImageLinksSettings,
  type ImageLinksView,
} from '@/core/imageLinks/settings'
import { useImageDownloadJob } from '@/features/image-download-job/useImageDownloadJob'
import { downloadBlob } from '@/features/netmon/download'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Segmented } from '@/shared/components/ui/segmented'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Slider } from '@/shared/components/ui/slider'
import { cn } from '@/shared/utils/cn'
import {
  cancelImageDownloadJob,
  scanPageImagesFromTab,
  startImageDownloadJob,
  TabMessagingError,
} from '@/tools/image/image-downloader/service'
import { clearHighlightOnPage, highlightOnPage } from '@/tools/seo/seo-toolkit/highlight'

import { useWebTool } from '../_shared'
import { ActionBar, type ActionNotice } from './ActionBar'
import { EmptyState, FilterChip, GridSkeleton, ImageCard, ImageRow, StatTile } from './components'
import { ImagePreviewDialog } from './ImagePreviewDialog'
import { EASE, dateStamp, pageSlug, type ImageItemActions } from './utils'

const PAGE_SIZE = 120
const MIN_SIDE_MAX = 2000

const SORTS: { value: ImageLinksSort; label: string }[] = [
  { value: 'page', label: 'imageLinks.sortPage' },
  { value: 'largest', label: 'imageLinks.sortLargest' },
  { value: 'smallest', label: 'imageLinks.sortSmallest' },
  { value: 'name', label: 'imageLinks.sortName' },
  { value: 'type', label: 'imageLinks.sortType' },
]

interface PageMeta {
  tabId: number
  url: string
  title: string
  favIconUrl?: string
}

function scanErrorText(error: unknown, t: (key: string) => string): string {
  if (error instanceof TabMessagingError) {
    if (error.code === 'RESTRICTED_PAGE') return t('imageLinks.restricted')
    if (error.code === 'NO_TAB') return t('imageLinks.noTab')
  }
  return t('imageLinks.scanFailed')
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
}

function hostOf(url: string | undefined): string {
  try {
    return new URL(url ?? '').hostname.replace(/^www\./i, '')
  } catch {
    return url ?? ''
  }
}

export default function ImageLinksTool() {
  const { t } = useTranslation()
  const tool = useWebTool('web.image-links')
  const reduce = useReducedMotion()
  const job = useImageDownloadJob()

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [items, setItems] = useState<ImageLinkItem[]>([])
  const [page, setPage] = useState<PageMeta | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [measured, setMeasured] = useState<Record<string, { w: number; h: number }>>({})

  const [settings, setSettings] = useState<ImageLinksSettings>(DEFAULT_IMAGE_LINKS_SETTINGS)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [altFilter, setAltFilter] = useState<ImageLinksAltFilter>('all')
  const [types, setTypes] = useState<ImageLinkType[]>([])
  const [sources, setSources] = useState<ImageSource[]>([])
  const [minSide, setMinSide] = useState(0)

  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const anchorRef = useRef<number | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [paging, setPaging] = useState({ key: '', limit: PAGE_SIZE })

  const [notice, setNotice] = useState<ActionNotice | null>(null)
  const [highlighted, setHighlighted] = useState(false)
  const highlightedRef = useRef(false)
  const [ownJobId, setOwnJobId] = useState<string | null>(null)
  const [dismissedJobId, setDismissedJobId] = useState<string | null>(null)
  const [jobError, setJobError] = useState<string | null>(null)

  const timers = useRef({ notice: 0, measure: 0 })
  const pendingMeasures = useRef(new Map<string, { w: number; h: number }>())
  const searchRef = useRef<HTMLInputElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let live = true
    void getImageLinksSettings().then((stored) => {
      if (live) setSettings(stored)
    })
    return () => {
      live = false
    }
  }, [])

  const updateSettings = (patch: Partial<ImageLinksSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    void saveImageLinksSettings(next)
  }

  const applyScan = useCallback((images: PageImage[], tab: chrome.tabs.Tab) => {
    setItems(toImageLinkItems(images))
    setPage(
      tab.id != null
        ? { tabId: tab.id, url: tab.url ?? '', title: tab.title ?? '', favIconUrl: tab.favIconUrl }
        : null,
    )
    setScanError(null)
    setSelected(new Set())
    anchorRef.current = null
    setStatus('ready')
  }, [])

  const applyScanError = useCallback(
    (error: unknown) => {
      setItems([])
      setPage(null)
      setScanError(scanErrorText(error, t))
      setStatus('error')
    },
    [t],
  )

  useEffect(() => {
    let live = true
    scanPageImagesFromTab()
      .then(({ images, tab }) => {
        if (live) applyScan(images, tab)
      })
      .catch((error: unknown) => {
        if (live) applyScanError(error)
      })
    return () => {
      live = false
    }
  }, [applyScan, applyScanError])

  const rescan = () => {
    setStatus('loading')
    setStale(false)
    setPreviewUrl(null)
    scanPageImagesFromTab()
      .then(({ images, tab }) => applyScan(images, tab))
      .catch(applyScanError)
  }

  const scannedTabId = page?.tabId
  useEffect(() => {
    if (scannedTabId == null || !chrome.tabs?.onUpdated) return undefined
    const onUpdated = (tabId: number, info: { url?: string; status?: string }) => {
      if (tabId === scannedTabId && (info.url || info.status === 'complete')) setStale(true)
    }
    const onActivated = (info: { tabId: number }) => {
      if (info.tabId !== scannedTabId) setStale(true)
    }
    chrome.tabs.onUpdated.addListener(onUpdated)
    chrome.tabs.onActivated.addListener(onActivated)
    return () => {
      chrome.tabs.onUpdated.removeListener(onUpdated)
      chrome.tabs.onActivated.removeListener(onActivated)
    }
  }, [scannedTabId])

  useEffect(() => {
    const pending = timers.current
    return () => {
      window.clearTimeout(pending.notice)
      window.clearTimeout(pending.measure)
      if (highlightedRef.current) void clearHighlightOnPage()
    }
  }, [])

  const needsMeasure = useMemo(
    () => new Set(items.filter((item) => !item.width || !item.height).map((item) => item.url)),
    [items],
  )

  const onMeasure = useCallback(
    (url: string, width: number, height: number) => {
      if (!width || !height || !needsMeasure.has(url)) return
      pendingMeasures.current.set(url, { w: width, h: height })
      if (timers.current.measure) return
      timers.current.measure = window.setTimeout(() => {
        timers.current.measure = 0
        const batch = pendingMeasures.current
        pendingMeasures.current = new Map()
        setMeasured((prev) => {
          let next = prev
          for (const [key, size] of batch) {
            if (prev[key]) continue
            if (next === prev) next = { ...prev }
            next[key] = size
          }
          return next
        })
      }, 180)
    },
    [needsMeasure],
  )

  const sizedItems = useMemo(
    () =>
      items.map((item) => {
        const size = measured[item.url]
        return size && (!item.width || !item.height) ? { ...item, width: size.w, height: size.h } : item
      }),
    [items, measured],
  )

  const summary = useMemo(() => summarizeImageLinks(sizedItems), [sizedItems])

  const query: ImageLinksQuery = useMemo(
    () => ({ search: deferredSearch, alt: altFilter, types, sources, minSide, sort: settings.sort }),
    [deferredSearch, altFilter, types, sources, minSide, settings.sort],
  )
  const visible = useMemo(() => queryImageLinks(sizedItems, query), [sizedItems, query])
  const filterCount = countActiveImageLinkFilters(query)
  const filtersClear = filterCount === 0 && !search.trim()

  const queryKey = `${JSON.stringify(query)}|${settings.view}|${items.length}`
  const limit = paging.key === queryKey ? paging.limit : PAGE_SIZE
  const rendered = visible.slice(0, limit)
  const hasMore = visible.length > rendered.length

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setPaging({ key: queryKey, limit: limit + PAGE_SIZE })
        }
      },
      { rootMargin: '480px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, limit, queryKey])

  const selectedVisible = useMemo(() => visible.filter((item) => selected.has(item.url)), [visible, selected])
  const scopeIsSelection = selectedVisible.length > 0
  const scope = scopeIsSelection ? selectedVisible : visible
  const allShownState: boolean | 'indeterminate' =
    visible.length > 0 && selectedVisible.length === visible.length
      ? true
      : selectedVisible.length > 0
        ? 'indeterminate'
        : false

  const flash = useCallback((text: string, tone: ActionNotice['tone'] = 'ok') => {
    setNotice({ id: Date.now(), text, tone })
    window.clearTimeout(timers.current.notice)
    timers.current.notice = window.setTimeout(() => setNotice(null), 2600)
  }, [])

  const copyText = useCallback(
    async (text: string, message?: string) => {
      try {
        await navigator.clipboard.writeText(text)
        flash(message ?? t('imageLinks.copied'))
      } catch {
        flash(t('imageLinks.copyFailed'), 'warn')
      }
    },
    [flash, t],
  )

  const toggle = useCallback(
    (item: ImageLinkItem, shiftKey: boolean) => {
      const index = visible.findIndex((entry) => entry.url === item.url)
      const anchor = anchorRef.current
      setSelected((prev) => {
        const next = new Set(prev)
        const willSelect = !prev.has(item.url)
        if (shiftKey && anchor != null && index >= 0) {
          const [start, end] = anchor < index ? [anchor, index] : [index, anchor]
          for (let i = start; i <= end; i += 1) {
            const entry = visible[i]
            if (!entry) continue
            if (willSelect) next.add(entry.url)
            else next.delete(entry.url)
          }
        } else if (willSelect) {
          next.add(item.url)
        } else {
          next.delete(item.url)
        }
        return next
      })
      anchorRef.current = index >= 0 ? index : null
    },
    [visible],
  )

  const setAllShown = (on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const item of visible) {
        if (on) next.add(item.url)
        else next.delete(item.url)
      }
      return next
    })
  }

  const invertShown = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const item of visible) {
        if (next.has(item.url)) next.delete(item.url)
        else next.add(item.url)
      }
      return next
    })
  }

  const clearFilters = () => {
    setSearch('')
    setAltFilter('all')
    setTypes([])
    setSources([])
    setMinSide(0)
  }

  const filenameTemplate = settings.filenameTemplate.trim() || DEFAULT_IMAGE_LINKS_SETTINGS.filenameTemplate
  const zipName = `${pageSlug(page?.url)}-images-${dateStamp()}.zip`
  const exportMeta = { pageUrl: page?.url, pageTitle: page?.title }

  const downloadOne = useCallback(
    async (item: ImageLinkItem) => {
      const ctx = {
        index: item.order + 1,
        url: item.url,
        pageUrl: page?.url ?? item.url,
        pageTitle: page?.title ?? '',
        ext: item.type === 'other' ? null : item.type,
      }
      const filename = buildDownloadPath(
        settings.subfolderTemplate,
        applyFilenameTemplate(filenameTemplate, ctx),
        ctx,
      )
      try {
        if (chrome.downloads?.download) {
          await chrome.downloads.download({ url: item.url, filename, conflictAction: 'uniquify', saveAs: false })
        } else {
          const anchor = document.createElement('a')
          anchor.href = item.url
          anchor.download = filename.split('/').pop() ?? ''
          anchor.click()
        }
        flash(t('imageLinks.downloadStarted'))
      } catch (error) {
        flash(errorText(error), 'warn')
      }
    },
    [filenameTemplate, flash, page, settings.subfolderTemplate, t],
  )

  const exportList = (format: ImageLinksExportFormat) => {
    const { text, mime, extension } = exportImageLinks(scope, format, exportMeta)
    const file = `${pageSlug(page?.url)}-images-${dateStamp()}.${extension}`
    downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), file)
    flash(t('imageLinks.exported', { file }))
  }

  const startDownload = async (mode: 'zip' | 'files') => {
    if (!page || scope.length === 0) return
    setJobError(null)
    try {
      const zipExtraFiles =
        mode === 'zip' && settings.includeManifest
          ? [
              { name: 'links.csv', text: exportImageLinks(scope, 'csv', exportMeta).text },
              { name: 'links.json', text: exportImageLinks(scope, 'json', exportMeta).text },
            ]
          : undefined
      const { jobId } = await startImageDownloadJob({
        tabId: page.tabId,
        pageUrl: page.url,
        pageTitle: page.title,
        mode,
        subfolder: settings.subfolderTemplate,
        filenameTemplate,
        zipFileName: zipName,
        zipExtraFiles,
        items: scope.map((item) => ({ url: item.url })),
      })
      setOwnJobId(jobId)
      setDismissedJobId(null)
    } catch (error) {
      setJobError(errorText(error))
    }
  }

  const highlight = async (kind: 'images-all' | 'images-missing-alt') => {
    const count = await highlightOnPage(kind).catch(() => 0)
    highlightedRef.current = count > 0
    setHighlighted(count > 0)
    flash(t('imageLinks.highlighted', { count }), count > 0 ? 'ok' : 'warn')
  }

  const clearHighlight = () => {
    highlightedRef.current = false
    setHighlighted(false)
    void clearHighlightOnPage()
  }

  const actions: ImageItemActions = useMemo(
    () => ({
      onToggle: toggle,
      onPreview: (item) => setPreviewUrl(item.url),
      onCopy: (text) => void copyText(text),
      onDownload: (item) => void downloadOne(item),
      onMeasure,
    }),
    [toggle, copyText, downloadOne, onMeasure],
  )

  const previewIndex = previewUrl ? visible.findIndex((item) => item.url === previewUrl) : -1
  const presentTypes = IMAGE_LINK_TYPES.filter((type) => summary.byType[type])
  const presentSources = IMAGE_LINK_SOURCES.filter((source) => summary.bySource[source])
  const jobIsOurs = job != null && job.id === ownJobId && job.id !== dismissedJobId
  const coverageTone =
    summary.altCoverage >= 90 ? 'bg-emerald-500' : summary.altCoverage >= 60 ? 'bg-amber-500' : 'bg-destructive'
  const ready = status === 'ready' && items.length > 0
  const pad = 'px-[var(--density-page-pad)]'

  return (
    <ToolPage tool={tool} contentClassName="p-0">
      <section className={cn(pad, 'space-y-2.5 pt-[var(--density-page-pad)] pb-3')}>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="relative overflow-hidden rounded-2xl border bg-card p-3 shadow-xs"
        >
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-16 size-48 rounded-full bg-primary/20 blur-3xl"
            animate={reduce ? undefined : { scale: [1, 1.18, 1], opacity: [0.55, 0.9, 0.55] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative flex items-center gap-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background shadow-xs">
              {page?.favIconUrl ? (
                <img
                  src={page.favIconUrl}
                  alt=""
                  className="size-5"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <GlobeIcon className="size-5 text-muted-foreground" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              {status === 'loading' && !page ? (
                <>
                  <Skeleton className="h-3.5 w-40 max-w-full" />
                  <Skeleton className="mt-1.5 h-3 w-24" />
                </>
              ) : (
                <>
                  <p className="truncate text-sm leading-5 font-semibold" title={page?.title}>
                    {page?.title || t('imageLinks.pageFallback')}
                  </p>
                  <p className="truncate text-xs text-muted-foreground" title={page?.url}>
                    {hostOf(page?.url) || '—'}
                  </p>
                </>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className={cn('shrink-0', highlighted && 'bg-primary/10 text-primary hover:bg-primary/15')}
                  disabled={!ready}
                  aria-label={t('imageLinks.highlight')}
                  title={t('imageLinks.highlight')}
                >
                  <HighlighterIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {t('imageLinks.highlight')}
                </DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => void highlight('images-all')}>
                  <SquareDashedMousePointerIcon />
                  {t('imageLinks.highlightAll')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void highlight('images-missing-alt')}>
                  <TriangleAlertIcon />
                  {t('imageLinks.highlightMissing')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={!highlighted} onSelect={clearHighlight}>
                  <EraserIcon />
                  {t('imageLinks.highlightClear')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant={stale ? 'default' : 'outline'}
              size="sm"
              className="relative shrink-0 px-2.5"
              onClick={rescan}
              disabled={status === 'loading'}
              aria-label={t('imageLinks.rescan')}
            >
              <RefreshCwIcon className={cn(status === 'loading' && 'animate-spin motion-reduce:animate-none')} />
              <span className="hidden @[360px]:inline">{t('imageLinks.rescan')}</span>
              {stale && (
                <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-primary ring-2 ring-background motion-safe:animate-pulse" />
              )}
            </Button>
          </div>

          {ready && (
            <div className="relative mt-3 space-y-1.5">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium">{t('imageLinks.altCoverage')}</span>
                <span className="font-semibold tabular-nums">
                  {summary.altApplicable ? `${summary.altCoverage}%` : '—'}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={cn('h-full origin-left rounded-full', coverageTone)}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: summary.altApplicable ? summary.altCoverage / 100 : 0 }}
                  transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {summary.altApplicable
                  ? t('imageLinks.altCoverageDetail', {
                      covered: summary.altApplicable - summary.missingAlt,
                      total: summary.altApplicable,
                    })
                  : t('imageLinks.altCoverageNone')}
              </p>
            </div>
          )}
        </motion.div>

        {ready && (
          <div className="grid grid-cols-2 gap-2 @[560px]:grid-cols-4">
            <StatTile
              icon={ImagesIcon}
              label={t('imageLinks.statTotal')}
              value={summary.total}
              tone="default"
              active={filtersClear}
              onClick={clearFilters}
              hint={t('imageLinks.filtersReset')}
            />
            <StatTile
              icon={TriangleAlertIcon}
              label={t('imageLinks.statMissing')}
              value={summary.missingAlt}
              tone={summary.missingAlt ? 'warn' : 'ok'}
              active={altFilter === 'missing'}
              onClick={() => setAltFilter((value) => (value === 'missing' ? 'all' : 'missing'))}
              hint={t('imageLinks.statFilterHint')}
            />
            <StatTile
              icon={TypeIcon}
              label={t('imageLinks.statWithAlt')}
              value={summary.withAlt}
              tone="ok"
              active={altFilter === 'present'}
              onClick={() => setAltFilter((value) => (value === 'present' ? 'all' : 'present'))}
              hint={t('imageLinks.statFilterHint')}
            />
            <StatTile
              icon={EyeOffIcon}
              label={t('imageLinks.statDecorative')}
              value={summary.decorative}
              tone="muted"
              active={altFilter === 'decorative'}
              onClick={() => setAltFilter((value) => (value === 'decorative' ? 'all' : 'decorative'))}
              hint={t('imageLinks.statFilterHint')}
            />
          </div>
        )}
      </section>

      {ready && (
        <div className={cn(pad, 'sticky top-0 z-20 space-y-2 border-y bg-background/90 py-2 backdrop-blur-md')}>
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('imageLinks.searchPlaceholder')}
                aria-label={t('imageLinks.searchPlaceholder')}
                className="h-8 pr-8 pl-8 text-xs [&::-webkit-search-cancel-button]:hidden"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="absolute top-1/2 right-0.5 size-7 -translate-y-1/2 text-muted-foreground"
                  onClick={() => {
                    setSearch('')
                    searchRef.current?.focus()
                  }}
                  aria-label={t('imageLinks.clearSearch')}
                >
                  <XIcon />
                </Button>
              )}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'relative h-8 shrink-0 px-2.5 data-[state=open]:bg-accent',
                    filterCount > 0 && 'bg-primary/10 text-primary hover:bg-primary/15',
                  )}
                  aria-label={t('imageLinks.filters')}
                >
                  <SlidersHorizontalIcon />
                  <span className="hidden @[480px]:inline">{t('imageLinks.filters')}</span>
                  <AnimatePresence>
                    {filterCount > 0 && (
                      <motion.span
                        initial={reduce ? false : { scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={reduce ? { opacity: 0 } : { scale: 0 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                        className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground tabular-nums"
                      >
                        {filterCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 max-w-[calc(100vw-1.5rem)] space-y-4 p-3">
                <section className="space-y-2">
                  <p className="text-xs font-semibold">{t('imageLinks.altLabel')}</p>
                  <Segmented
                    size="sm"
                    className="flex w-full [&>button]:flex-1"
                    value={altFilter}
                    onValueChange={setAltFilter}
                    ariaLabel={t('imageLinks.altLabel')}
                    options={[
                      { value: 'all', label: t('imageLinks.altFilterAll') },
                      { value: 'missing', label: t('imageLinks.altFilterMissing') },
                      { value: 'present', label: t('imageLinks.altFilterPresent') },
                      { value: 'decorative', label: t('imageLinks.altFilterDecorative') },
                    ]}
                  />
                </section>
                {presentSources.length > 1 && (
                  <section className="space-y-2">
                    <p className="text-xs font-semibold">{t('imageLinks.sourceLabel')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {presentSources.map((source) => (
                        <FilterChip
                          key={source}
                          active={sources.includes(source)}
                          count={summary.bySource[source]}
                          onClick={() => setSources((list) => toggleValue(list, source))}
                        >
                          {t(`imageLinks.source.${source}`)}
                        </FilterChip>
                      ))}
                    </div>
                  </section>
                )}
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">{t('imageLinks.minSize')}</p>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {minSide ? t('imageLinks.minSizeValue', { value: minSide }) : t('imageLinks.minSizeAny')}
                    </span>
                  </div>
                  <Slider
                    value={[minSide]}
                    min={0}
                    max={MIN_SIDE_MAX}
                    step={50}
                    onValueChange={([value]) => setMinSide(value ?? 0)}
                    thumbLabel={t('imageLinks.minSize')}
                    getValueText={(value) =>
                      value ? t('imageLinks.minSizeValue', { value }) : t('imageLinks.minSizeAny')
                    }
                  />
                </section>
                <Button variant="ghost" size="xs" className="w-full" onClick={clearFilters} disabled={filtersClear}>
                  <EraserIcon />
                  {t('imageLinks.filtersReset')}
                </Button>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className={cn(
                    'relative size-8 shrink-0 data-[state=open]:bg-accent',
                    settings.sort !== 'page' && 'bg-primary/10 text-primary hover:bg-primary/15',
                  )}
                  aria-label={t('imageLinks.sort')}
                  title={t('imageLinks.sort')}
                >
                  <ArrowUpDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs text-muted-foreground">{t('imageLinks.sort')}</DropdownMenuLabel>
                {SORTS.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={settings.sort === option.value}
                    onCheckedChange={() => updateSettings({ sort: option.value })}
                  >
                    {t(option.label)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Segmented<ImageLinksView>
              className="shrink-0"
              value={settings.view}
              onValueChange={(view) => updateSettings({ view })}
              ariaLabel={t('imageLinks.viewGrid')}
              options={[
                {
                  value: 'grid',
                  title: t('imageLinks.viewGrid'),
                  label: (
                    <>
                      <LayoutGridIcon aria-hidden />
                      <span className="sr-only">{t('imageLinks.viewGrid')}</span>
                    </>
                  ),
                },
                {
                  value: 'list',
                  title: t('imageLinks.viewList'),
                  label: (
                    <>
                      <ListIcon aria-hidden />
                      <span className="sr-only">{t('imageLinks.viewList')}</span>
                    </>
                  ),
                },
              ]}
            />
          </div>

          {presentTypes.length > 1 && (
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label={t('imageLinks.typeLabel')}
            >
              <FilterChip active={types.length === 0} count={summary.total} onClick={() => setTypes([])}>
                {t('imageLinks.allTypes')}
              </FilterChip>
              {presentTypes.map((type) => (
                <FilterChip
                  key={type}
                  active={types.includes(type)}
                  count={summary.byType[type]}
                  onClick={() => setTypes((list) => toggleValue(list, type))}
                >
                  {type === 'other' ? t('imageLinks.typeOther') : type.toUpperCase()}
                </FilterChip>
              ))}
            </div>
          )}

          <div className="flex min-h-7 items-center gap-1 text-xs">
            <label className="flex cursor-pointer items-center gap-2 rounded-md py-1 pr-1.5 font-medium select-none">
              <Checkbox
                checked={allShownState}
                disabled={visible.length === 0}
                onCheckedChange={() => setAllShown(allShownState !== true)}
                className="size-[18px]"
              />
              {t('imageLinks.selectAllShown')}
            </label>
            <AnimatePresence initial={false}>
              {selected.size > 0 && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: -6 }}
                  transition={{ duration: 0.18, ease: EASE }}
                  className="flex items-center"
                >
                  <Button variant="ghost" size="xs" className="h-7 px-2" onClick={invertShown}>
                    {t('imageLinks.invert')}
                  </Button>
                  <Button variant="ghost" size="xs" className="h-7 px-2" onClick={() => setSelected(new Set())}>
                    {t('imageLinks.clearSelection')}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <span className="ml-auto shrink-0 text-muted-foreground tabular-nums" aria-live="polite">
              {t('imageLinks.showing', { shown: visible.length, total: items.length })}
            </span>
          </div>
        </div>
      )}

      <section className={cn(pad, 'flex-1 py-3')}>
        {status === 'loading' ? (
          <>
            <p className="sr-only" role="status">
              {t('imageLinks.scanning')}
            </p>
            <GridSkeleton view={settings.view} />
          </>
        ) : status === 'error' ? (
          <EmptyState
            icon={ShieldAlertIcon}
            title={scanError ?? t('imageLinks.scanFailed')}
            action={
              <Button variant="outline" size="sm" onClick={rescan}>
                <RefreshCwIcon />
                {t('imageLinks.rescan')}
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title={t('imageLinks.emptyTitle')}
            body={t('imageLinks.emptyBody')}
            action={
              <Button variant="outline" size="sm" onClick={rescan}>
                <RefreshCwIcon />
                {t('imageLinks.rescan')}
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={SearchXIcon}
            title={t('imageLinks.noMatchTitle')}
            body={t('imageLinks.noMatchBody')}
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <EraserIcon />
                {t('imageLinks.filtersReset')}
              </Button>
            }
          />
        ) : settings.view === 'grid' ? (
          <ul className="grid grid-cols-2 gap-2.5 @[440px]:grid-cols-3 @[680px]:grid-cols-4 @[920px]:grid-cols-5">
            {rendered.map((item, index) => (
              <ImageCard
                key={`${item.order}:${item.url}`}
                item={item}
                index={index}
                selected={selected.has(item.url)}
                actions={actions}
              />
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {rendered.map((item, index) => (
              <ImageRow
                key={`${item.order}:${item.url}`}
                item={item}
                index={index}
                selected={selected.has(item.url)}
                actions={actions}
              />
            ))}
          </ul>
        )}
        {ready && hasMore && (
          <div ref={sentinelRef} className="flex justify-center pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaging({ key: queryKey, limit: limit + PAGE_SIZE })}
            >
              {t('imageLinks.loadMore', { count: Math.min(PAGE_SIZE, visible.length - rendered.length) })}
            </Button>
          </div>
        )}
      </section>

      {ready && (
        <ActionBar
          scopeCount={scope.length}
          scopeIsSelection={scopeIsSelection}
          disabled={scope.length === 0}
          notice={notice}
          job={job}
          jobIsOurs={jobIsOurs}
          jobError={jobError}
          onDismissJob={() => {
            setDismissedJobId(job?.id ?? null)
            setJobError(null)
          }}
          onCancelJob={() => {
            if (job) void cancelImageDownloadJob(job.id)
          }}
          onCopyUrls={() =>
            void copyText(
              scope.map((item) => item.url).join('\n'),
              t('imageLinks.copiedUrls', { count: scope.length }),
            )
          }
          onExport={exportList}
          onDownload={(mode) => void startDownload(mode)}
          settings={settings}
          onSettingsChange={updateSettings}
          pageUrl={page?.url ?? ''}
          zipName={zipName}
        />
      )}

      <ImagePreviewDialog
        items={visible}
        index={previewIndex >= 0 ? previewIndex : null}
        onIndexChange={(index) => setPreviewUrl(visible[index]?.url ?? null)}
        onClose={() => setPreviewUrl(null)}
        isSelected={(url) => selected.has(url)}
        actions={actions}
      />
    </ToolPage>
  )
}
