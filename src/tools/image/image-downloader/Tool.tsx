import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FilterIcon,
  ImagesIcon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react'

import {
  applyFilenameTemplate,
  countActiveFilters,
  filterPageImages,
  type ImageFileExt,
  type ImageSource,
  type PageImage,
} from '@/core/engines/imageDownloader'
import { useImageDownloadJob } from '@/features/image-download-job/useImageDownloadJob'
import { useImageDownloaderSettings } from '@/features/image/useImageDownloaderSettings'
import { CopyButton } from '@/shared/components/CopyButton'
import { ToolPage } from '@/shared/components/ToolPage'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import { Slider } from '@/shared/components/ui/slider'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'
import { toolRegistry } from '@/core/registry'

import {
  cancelImageDownloadJob,
  scanPageImagesFromTab,
  startImageDownloadJob,
  TabMessagingError,
} from './service'

const TYPE_OPTIONS: ImageFileExt[] = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif']
const SOURCE_OPTIONS: ImageSource[] = ['img', 'picture', 'css', 'svg', 'link', 'meta', 'video']

const GRID_CLASS = {
  s: 'grid-cols-4 gap-1',
  m: 'grid-cols-3 gap-1.5',
  l: 'grid-cols-2 gap-2',
} as const

function formatTabError(error: unknown, t: (k: string) => string): string {
  if (error instanceof TabMessagingError) {
    if (error.code === 'RESTRICTED_PAGE') return t('imageDownloader.restrictedPage')
    if (error.code === 'NO_TAB') return t('imageDownloader.noActiveTab')
    return t('imageDownloader.scanFailed')
  }
  return error instanceof Error ? error.message : t('imageDownloader.scanFailed')
}

export default function ImageDownloaderTool() {
  const { t } = useTranslation()
  const tool = toolRegistry.get('image.image-downloader')
  if (!tool) throw new Error('image.image-downloader')

  const { state: settings, patch: patchSettings } = useImageDownloaderSettings()
  const job = useImageDownloadJob()

  const [images, setImages] = useState<PageImage[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [scanning, setScanning] = useState(true)
  const [scanError, setScanError] = useState<string | null>(null)
  const [pageMeta, setPageMeta] = useState<{ url: string; title: string; tabId: number } | null>(
    null,
  )
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [urlSearch, setUrlSearch] = useState('')
  const lastClickedIndex = useRef<number | null>(null)

  const filters = useMemo(
    () => ({
      ...(settings?.filters ?? {
        minWidth: 0,
        minHeight: 0,
        maxWidth: 99_999,
        maxHeight: 99_999,
        types: [],
        sources: [],
        urlQuery: '',
        hideDuplicates: true,
      }),
      urlQuery: urlSearch,
    }),
    [settings?.filters, urlSearch],
  )

  const visible = useMemo(() => filterPageImages(images, filters), [images, filters])
  const activeFilterCount = countActiveFilters(filters)

  const rescan = useCallback(async () => {
    setScanning(true)
    setScanError(null)
    try {
      const { images: found, tab } = await scanPageImagesFromTab()
      setImages(found)
      setSelected(new Set(found.map((img) => img.url)))
      if (tab.id != null && tab.url) {
        setPageMeta({ url: tab.url, title: tab.title ?? tab.url, tabId: tab.id })
      }
    } catch (error) {
      setScanError(formatTabError(error, t))
      setImages([])
      setSelected(new Set())
    } finally {
      setScanning(false)
    }
  }, [t])

  useEffect(() => {
    let live = true
    void scanPageImagesFromTab()
      .then(({ images: found, tab }) => {
        if (!live) return
        setImages(found)
        setSelected(new Set(found.map((img) => img.url)))
        if (tab.id != null && tab.url) {
          setPageMeta({ url: tab.url, title: tab.title ?? tab.url, tabId: tab.id })
        }
      })
      .catch((error) => {
        if (!live) return
        setScanError(formatTabError(error, t))
        setImages([])
        setSelected(new Set())
      })
      .finally(() => {
        if (live) setScanning(false)
      })
    return () => {
      live = false
    }
  }, [t])

  const toggleSelected = (url: string, index: number, shiftKey: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (shiftKey && lastClickedIndex.current != null) {
        const start = Math.min(lastClickedIndex.current, index)
        const end = Math.max(lastClickedIndex.current, index)
        for (let i = start; i <= end; i += 1) {
          const item = visible[i]
          if (item) next.add(item.url)
        }
        return next
      }
      if (next.has(url)) next.delete(url)
      else next.add(url)
      lastClickedIndex.current = index
      return next
    })
  }

  const selectAll = () => setSelected(new Set(visible.map((img) => img.url)))
  const selectNone = () => setSelected(new Set())
  const invertSelection = () => {
    setSelected((prev) => {
      const next = new Set<string>()
      for (const img of visible) {
        if (!prev.has(img.url)) next.add(img.url)
      }
      return next
    })
  }

  const selectedList = visible.filter((img) => selected.has(img.url))

  const filenamePreview =
    pageMeta && selectedList[0]
      ? applyFilenameTemplate(settings?.filenameTemplate ?? '{name}-{index}', {
          index: 1,
          url: selectedList[0].url,
          pageUrl: pageMeta.url,
          pageTitle: pageMeta.title,
          ext: selectedList[0].ext,
        })
      : ''

  const startDownload = async (mode: 'files' | 'zip') => {
    if (!pageMeta || !selectedList.length) return
    await startImageDownloadJob({
      tabId: pageMeta.tabId,
      pageUrl: pageMeta.url,
      pageTitle: pageMeta.title,
      mode,
      subfolder: settings?.subfolderTemplate ?? 'Images/{host}',
      filenameTemplate: settings?.filenameTemplate ?? '{name}-{index}',
      zipFileName: `images-${new Date().toISOString().slice(0, 10)}.zip`,
      items: selectedList.map((img) => ({ url: img.url })),
    })
    void patchSettings({ mode })
  }

  const density = settings?.gridDensity ?? 'm'
  const jobRunning = job?.status === 'running'
  const progress = job?.progress

  return (
    <ToolPage tool={tool}>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {!settings?.dismissDownloadFolderTip && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-900 dark:text-amber-100">
            <div className="flex items-start justify-between gap-2">
              <p>{t('imageDownloader.downloadFolderTip')}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t('common.clear')}
                onClick={() => void patchSettings({ dismissDownloadFolderTip: true })}
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        )}

        <div className="sticky top-0 z-10 flex flex-col gap-2 border-b bg-background/95 pb-2 backdrop-blur">
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 pl-7 text-xs"
                placeholder={t('imageDownloader.searchUrl')}
                value={urlSearch}
                onChange={(e) => setUrlSearch(e.target.value)}
              />
            </div>
            <Button type="button" variant="outline" size="sm" disabled={scanning} onClick={() => void rescan()}>
              <RefreshCwIcon className={cn('size-3.5', scanning && 'animate-spin')} />
              {t('imageDownloader.rescan')}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{visible.length}</Badge>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <FilterIcon className="size-3.5" />
                  {t('imageDownloader.filters')}
                  {activeFilterCount > 0 && (
                    <Badge className="ml-1 h-4 px-1 text-[10px]">{activeFilterCount}</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(100vw-2rem,20rem)] space-y-3 p-2" align="start">
                <div className="space-y-1">
                  <span className="text-[11px] font-medium">{t('imageDownloader.minWidth')}</span>
                  <Slider
                    min={0}
                    max={2000}
                    step={10}
                    value={[settings?.filters.minWidth ?? 0]}
                    onValueChange={([v]) =>
                      settings &&
                      void patchSettings({ filters: { ...settings.filters, minWidth: v } })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-medium">{t('imageDownloader.minHeight')}</span>
                  <Slider
                    min={0}
                    max={2000}
                    step={10}
                    value={[settings?.filters.minHeight ?? 0]}
                    onValueChange={([v]) =>
                      settings &&
                      void patchSettings({ filters: { ...settings.filters, minHeight: v } })
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {TYPE_OPTIONS.map((type) => {
                    const on = settings?.filters.types.includes(type) ?? false
                    return (
                      <Button
                        key={type}
                        type="button"
                        size="xs"
                        variant={on ? 'default' : 'outline'}
                        onClick={() => {
                          if (!settings) return
                          const types = new Set(settings.filters.types)
                          if (on) types.delete(type)
                          else types.add(type)
                          void patchSettings({ filters: { ...settings.filters, types: [...types] } })
                        }}
                      >
                        {type}
                      </Button>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-1">
                  {SOURCE_OPTIONS.map((source) => {
                    const on = settings?.filters.sources.includes(source) ?? false
                    return (
                      <Button
                        key={source}
                        type="button"
                        size="xs"
                        variant={on ? 'default' : 'outline'}
                        onClick={() => {
                          if (!settings) return
                          const sources = new Set(settings.filters.sources)
                          if (on) sources.delete(source)
                          else sources.add(source)
                          void patchSettings({
                            filters: { ...settings.filters, sources: [...sources] },
                          })
                        }}
                      >
                        {source}
                      </Button>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium">{t('imageDownloader.hideDuplicates')}</span>
                  <Switch
                    checked={settings?.filters.hideDuplicates ?? true}
                    onCheckedChange={(checked) =>
                      settings &&
                      void patchSettings({ filters: { ...settings.filters, hideDuplicates: checked } })
                    }
                  />
                </div>
                <div className="flex gap-1">
                  {(['s', 'm', 'l'] as const).map((size) => (
                    <Button
                      key={size}
                      type="button"
                      size="xs"
                      variant={density === size ? 'default' : 'outline'}
                      onClick={() => void patchSettings({ gridDensity: size })}
                    >
                      {size.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
              {t('imageDownloader.selectAll')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={selectNone}>
              {t('imageDownloader.selectNone')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={invertSelection}>
              {t('imageDownloader.invert')}
            </Button>
          </div>
        </div>

        {jobRunning && progress && (
          <div className="rounded-md border p-2 text-xs">
            <div className="mb-1 flex items-center justify-between">
              <span>{t('imageDownloader.downloading')}</span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => job && void cancelImageDownloadJob(job.id)}
              >
                {t('common.cancel')}
              </Button>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width] motion-reduce:transition-none"
                style={{
                  width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                }}
              />
            </div>
            <p className="mt-1 text-muted-foreground">
              {t('imageDownloader.progress', {
                done: progress.done,
                failed: progress.failed,
                total: progress.total,
              })}
            </p>
          </div>
        )}

        {job?.status === 'done' && job.failedUrls.length > 0 && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            {t('imageDownloader.someFailed', { count: job.failedUrls.length })}
          </p>
        )}

        <div className="scrollbar-styled min-h-0 flex-1 overflow-y-auto">
          {scanning ? (
            <div className={cn('grid', GRID_CLASS.m)}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : scanError ? (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-8 text-center text-muted-foreground">
              <ImagesIcon className="size-7" />
              <p className="text-xs">{scanError}</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-8 text-center text-muted-foreground">
              <ImagesIcon className="size-7" />
              <p className="text-xs">{t('imageDownloader.noImages')}</p>
            </div>
          ) : (
            <div className={cn('grid', GRID_CLASS[density])}>
              {visible.map((img, index) => {
                const checked = selected.has(img.url)
                return (
                  <div
                    key={`${img.url}-${index}`}
                    role="checkbox"
                    aria-checked={checked}
                    tabIndex={0}
                    className={cn(
                      'group relative aspect-square cursor-pointer overflow-hidden rounded-md border',
                      checked && 'ring-2 ring-primary',
                    )}
                    onClick={(e) => toggleSelected(img.url, index, e.shiftKey)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleSelected(img.url, index, e.shiftKey)
                      }
                    }}
                  >
                    <div
                      className="absolute inset-0 bg-[length:12px_12px] bg-[position:0_0,6px_6px] bg-[image:linear-gradient(45deg,#ccc_25%,transparent_25%),linear-gradient(-45deg,#ccc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ccc_75%),linear-gradient(-45deg,transparent_75%,#ccc_75%)] dark:bg-[image:linear-gradient(45deg,#444_25%,transparent_25%),linear-gradient(-45deg,#444_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#444_75%),linear-gradient(-45deg,transparent_75%,#444_75%)]"
                    />
                    <img
                      src={img.url}
                      alt={img.alt ?? ''}
                      loading="lazy"
                      className="relative z-[1] size-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.opacity = '0.35'
                      }}
                    />
                    <div className="absolute top-1 left-1 z-[2]">
                      <Checkbox checked={checked} aria-hidden tabIndex={-1} />
                    </div>
                    <div className="absolute right-1 bottom-1 z-[2] rounded bg-background/80 px-1 text-[9px]">
                      {img.width || '?'}×{img.height || '?'}
                    </div>
                    <div className="absolute inset-x-0 top-0 z-[2] flex justify-end gap-0.5 p-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(img.url, '_blank', 'noopener,noreferrer')
                        }}
                      >
                        <ExternalLinkIcon className="size-3" />
                      </Button>
                      <CopyButton text={img.url} size="xs" />
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          setLightboxIndex(index)
                        }}
                      >
                        <SearchIcon className="size-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 space-y-2 border-t bg-background/95 pt-2 backdrop-blur">
          <div className="grid gap-1.5">
            <Input
              className="h-8 text-xs"
              value={settings?.subfolderTemplate ?? ''}
              onChange={(e) => void patchSettings({ subfolderTemplate: e.target.value })}
              placeholder={t('imageDownloader.subfolder')}
            />
            <Input
              className="h-8 text-xs"
              value={settings?.filenameTemplate ?? ''}
              onChange={(e) => void patchSettings({ filenameTemplate: e.target.value })}
              placeholder={t('imageDownloader.filenameTemplate')}
            />
            {filenamePreview && (
              <p className="truncate text-[10px] text-muted-foreground">
                {t('imageDownloader.filenamePreview', { name: filenamePreview })}
              </p>
            )}
          </div>
          <div className="flex gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!selectedList.length || jobRunning}
                >
                  <DownloadIcon className="size-3.5" />
                  {t('imageDownloader.downloadSelected', { count: selectedList.length })}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void startDownload('files')}>
                  {t('imageDownloader.modeFiles')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void startDownload('zip')}>
                  {t('imageDownloader.modeZip')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Dialog
        open={lightboxIndex != null}
        onOpenChange={(open) => !open && setLightboxIndex(null)}
      >
        <DialogContent className="max-w-[min(100%,28rem)]">
          {lightboxIndex != null && visible[lightboxIndex] && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{t('imageDownloader.preview')}</DialogTitle>
              </DialogHeader>
              <img
                src={visible[lightboxIndex].url}
                alt={visible[lightboxIndex].alt ?? ''}
                className="max-h-64 w-full object-contain"
              />
              <p className="truncate font-mono text-[10px]">{visible[lightboxIndex].url}</p>
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={lightboxIndex <= 0}
                  onClick={() => setLightboxIndex((i) => (i != null && i > 0 ? i - 1 : i))}
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={lightboxIndex >= visible.length - 1}
                  onClick={() =>
                    setLightboxIndex((i) =>
                      i != null && i < visible.length - 1 ? i + 1 : i,
                    )
                  }
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ToolPage>
  )
}
