import './i18n'
import {
  ArchiveIcon,
  ClockIcon,
  DownloadIcon,
  HistoryIcon,
  ImageIcon,
  LayersIcon,
  ListOrderedIcon,
  ScanSearchIcon,
  SettingsIcon,
  VideoIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  defaultFilters,
  filterDownloads,
  type DownloadManagerSettings,
  type DownloadManagerTab,
  type DownloadableResource,
  type FileCategory,
} from '@/core/download-manager'
import { filterPageImages, type PageImage } from '@/core/engines/imageDownloader'
import { useDownloadLiveSnapshot, useDownloadManagerState } from '@/features/download-manager/hooks'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { SearchInput } from '@/shared/components/SearchInput'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'
import { Switch } from '@/shared/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { sendMessage } from '@/core/messaging'

import { useBrowserTool } from '../_shared'
import { DownloadRow } from './DownloadRow'
import { ResourcePicker } from './ResourcePicker'
import { DM_LIST_SCROLL, DM_TAB_PANEL, DM_TOOLBAR_ROW } from './layout'
import { DOWNLOAD_MANAGER_TABS } from './routes'
import {
  controlDownloads,
  scanDownloadableFromActiveTab,
  startUrlDownload,
} from './service'
import { scanPageImagesFromTab } from '@/tools/image/image-downloader/service'

const TAB_ICONS: Record<DownloadManagerTab, typeof DownloadIcon> = {
  downloads: DownloadIcon,
  queue: ListOrderedIcon,
  bulk: LayersIcon,
  sniffer: ScanSearchIcon,
  images: ImageIcon,
  media: VideoIcon,
  history: HistoryIcon,
  settings: SettingsIcon,
}

const STATUS_FILTERS = [
  'all',
  'in_progress',
  'paused',
  'completed',
  'failed',
  'interrupted',
  'cancelled',
] as const

export default function DownloadManagerTool() {
  const { t } = useTranslation()
  const tool = useBrowserTool('browser.download-manager')
  const { state, patchSettings } = useDownloadManagerState()
  const [tab, setTab] = useDeepLinkTab<DownloadManagerTab>('tab', DOWNLOAD_MANAGER_TABS, 'downloads')
  const pollLive = tab !== 'settings'
  const { snapshot, refresh } = useDownloadLiveSnapshot(pollLive)
  const [query, setQuery] = useState('')
  const [quickUrl, setQuickUrl] = useState('')
  const [density, setDensity] = useState<'list' | 'compact'>('list')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all')
  const [category] = useState<FileCategory | 'all'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [confirmErase, setConfirmErase] = useState(false)
  const [confirmDeleteFiles, setConfirmDeleteFiles] = useState(false)

  const [scanResources, setScanResources] = useState<DownloadableResource[]>([])
  const [scanMeta, setScanMeta] = useState<{ url: string; title: string } | null>(null)
  const [scanBusy, setScanBusy] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const [images, setImages] = useState<PageImage[]>([])
  const [imagesBusy, setImagesBusy] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const pageScanOnce = useRef(false)
  const imageScanOnce = useRef(false)

  const filters = useMemo(
    () => ({
      ...defaultFilters(),
      query,
      status: statusFilter,
      category,
      sort: 'latest' as const,
    }),
    [query, statusFilter, category],
  )

  const items = useMemo(() => {
    const raw = snapshot?.items ?? []
    const list = tab === 'history' ? raw.filter((i) => i.state === 'complete' || i.state === 'interrupted') : raw
    return filterDownloads(list, filters)
  }, [snapshot?.items, filters, tab])

  const rescanPage = useCallback(async () => {
    setScanBusy(true)
    setScanError(null)
    try {
      const data = await scanDownloadableFromActiveTab({ includeImages: true, includeMedia: true })
      setScanResources(data.resources)
      setScanMeta({ url: data.url, title: data.title })
    } catch (error) {
      setScanError(error instanceof Error ? error.message : t('downloadManager.scanFailed'))
    } finally {
      setScanBusy(false)
    }
  }, [t])

  const rescanImages = useCallback(async () => {
    setImagesBusy(true)
    setImageError(null)
    try {
      const { images: found, tab: activeTab } = await scanPageImagesFromTab()
      setScanMeta((prev) => prev ?? { url: activeTab.url ?? '', title: activeTab.title ?? '' })
      const settings = state?.settings
      const filtered = filterPageImages(found, {
        minWidth: settings?.snifferMinImageWidth ?? 64,
        minHeight: settings?.snifferMinImageHeight ?? 64,
        maxWidth: 99_999,
        maxHeight: 99_999,
        types: [],
        sources: settings?.snifferIncludeBackgroundImages ? [] : ['img', 'picture'],
        urlQuery: '',
        hideDuplicates: true,
      })
      setImages(filtered)
    } catch (error) {
      setImageError(error instanceof Error ? error.message : t('downloadManager.scanFailed'))
    } finally {
      setImagesBusy(false)
    }
  }, [state?.settings, t])

  useEffect(() => {
    if (tab === 'bulk' || tab === 'sniffer' || tab === 'media') {
      if (!pageScanOnce.current && !scanBusy) {
        pageScanOnce.current = true
        void rescanPage()
      }
    }
    if (tab === 'images') {
      if (!imageScanOnce.current && !imagesBusy) {
        imageScanOnce.current = true
        void rescanImages()
      }
    }
  }, [tab, rescanPage, rescanImages, scanBusy, imagesBusy])

  const imageResources = useMemo(
    () =>
      images.map((img) => ({
        url: img.url,
        label: img.alt || img.url,
        ext: img.ext,
        mime: null,
        category: 'images' as const,
        domain: '',
        width: img.width,
        height: img.height,
        downloadable: true,
        source: 'image' as const,
      })),
    [images],
  )

  useEffect(() => {
    setQuery('')
  }, [tab])

  const searchPlaceholder =
    tab === 'queue'
      ? t('downloadManager.searchQueue')
      : tab === 'history'
        ? t('downloadManager.searchHistory')
        : tab === 'settings'
          ? t('downloadManager.searchSettings')
          : tab === 'downloads'
            ? t('downloadManager.searchDownloads')
            : t('downloadManager.searchResources')

  const showQuickAdd = tab === 'downloads'

  const toggleSelect = (id: number, on: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const bulkIds = [...selectedIds]

  const settings = state?.settings

  return (
    <ToolPage tool={tool} contentClassName="flex h-full min-h-0 flex-col overflow-hidden p-0 @container">
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-[var(--density-page-pad)]">
        <div className="flex flex-col gap-2.5 @md:flex-row @md:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            className="min-w-0 flex-1"
            placeholder={searchPlaceholder}
            ariaLabel={searchPlaceholder}
            shortcut="/"
          />
          {showQuickAdd ? (
            <div className="flex min-w-0 gap-2 @md:max-w-[18rem] @md:flex-1">
              <Input
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                placeholder={t('downloadManager.quickAddUrl')}
                className="h-10 min-w-0 flex-1"
                aria-label={t('downloadManager.quickAddUrl')}
              />
              <Button
                size="sm"
                className="h-10 shrink-0 px-3"
                aria-label={t('downloadManager.quickAddUrl')}
                onClick={() => {
                  const url = quickUrl.trim()
                  if (!url) return
                  void startUrlDownload(url).then(() => {
                    setQuickUrl('')
                    void refresh()
                  })
                }}
              >
                <DownloadIcon className="size-3.5" />
              </Button>
            </div>
          ) : null}
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as DownloadManagerTab)} className="flex min-h-0 flex-1 flex-col gap-3">
          <TabsList variant="attached" className="w-full shrink-0">
            {DOWNLOAD_MANAGER_TABS.map((key) => {
              const Icon = TAB_ICONS[key]
              return (
                <TabsTrigger key={key} value={key} className="gap-1">
                  <Icon />
                  <span className="hidden @[400px]:inline">{t(`downloadManager.tab.${key}`)}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value="downloads" className={DM_TAB_PANEL}>
              <div className={DM_TOOLBAR_ROW}>
                <Segmented
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as (typeof STATUS_FILTERS)[number])}
                  ariaLabel={t('downloadManager.statusFilterLabel')}
                  options={STATUS_FILTERS.map((s) => ({ value: s, label: t(`downloadManager.statusFilter.${s}`) }))}
                />
                <Segmented
                  value={density}
                  onValueChange={(v) => setDensity(v as 'list' | 'compact')}
                  ariaLabel={t('downloadManager.densityLabel')}
                  options={[
                    { value: 'list', label: t('downloadManager.density.list') },
                    { value: 'compact', label: t('downloadManager.density.compact') },
                  ]}
                />
                {bulkIds.length > 0 ? (
                  <div className="flex w-full items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2">
                    <span className="px-1 text-xs font-medium">{t('downloadManager.selectedCount', { count: bulkIds.length })}</span>
                    <Button size="xs" variant="secondary" onClick={() => void controlDownloads('pause', bulkIds).then(refresh)}>
                      {t('downloadManager.action.pause')}
                    </Button>
                    <Button size="xs" variant="secondary" onClick={() => setConfirmErase(true)}>
                      {t('downloadManager.action.erase')}
                    </Button>
                    <Button size="xs" variant="destructive" onClick={() => setConfirmDeleteFiles(true)}>
                      {t('downloadManager.action.deleteFiles')}
                    </Button>
                  </div>
                ) : null}
              </div>
              <ul className={DM_LIST_SCROLL}>
                {items.map((item) => (
                  <DownloadRow
                    key={item.id}
                    item={item}
                    snapshot={snapshot}
                    compact={density === 'compact'}
                    selected={selectedIds.has(item.id)}
                    onSelect={toggleSelect}
                  />
                ))}
              </ul>
          </TabsContent>

          <TabsContent value="queue" className={DM_TAB_PANEL}>
            <QueuePanel queue={state?.queue ?? []} query={query} onRefresh={refresh} />
          </TabsContent>

          <TabsContent value="bulk" className={DM_TAB_PANEL}>
              <ResourcePicker
                title={t('downloadManager.tab.bulk')}
                resources={scanResources.filter((r) => r.downloadable)}
                loading={scanBusy}
                error={scanError}
                query={query}
                onRescan={() => {
                  pageScanOnce.current = true
                  void rescanPage()
                }}
                pageUrl={scanMeta?.url}
              />
          </TabsContent>

          <TabsContent value="sniffer" className={DM_TAB_PANEL}>
              <ResourcePicker
                title={t('downloadManager.tab.sniffer')}
                resources={scanResources}
                loading={scanBusy}
                error={scanError}
                query={query}
                onRescan={() => {
                  pageScanOnce.current = true
                  void rescanPage()
                }}
                pageUrl={scanMeta?.url}
              />
          </TabsContent>

          <TabsContent value="images" className={DM_TAB_PANEL}>
            <ResourcePicker
              title={t('downloadManager.tab.images')}
              resources={imageResources}
              loading={imagesBusy}
              error={imageError}
              query={query}
              onRescan={() => {
                imageScanOnce.current = true
                void rescanImages()
              }}
              pageUrl={scanMeta?.url}
            />
          </TabsContent>

          <TabsContent value="media" className={DM_TAB_PANEL}>
              <ResourcePicker
                title={t('downloadManager.tab.media')}
                resources={scanResources}
                loading={scanBusy}
                error={scanError}
                query={query}
                onRescan={() => {
                  pageScanOnce.current = true
                  void rescanPage()
                }}
                filter={(r) => r.category === 'videos' || r.category === 'audio' || r.source === 'media'}
              />
          </TabsContent>

          <TabsContent value="history" className={DM_TAB_PANEL}>
              <div className="flex gap-2.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    void sendMessage<string>({ type: 'DOWNLOAD_MANAGER_EXPORT_HISTORY', format: 'csv' }).then((csv) => {
                      const blob = new Blob([csv ?? ''], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'download-history.csv'
                      a.click()
                      URL.revokeObjectURL(url)
                    })
                  }
                >
                  <ArchiveIcon className="size-3.5" />
                  {t('downloadManager.exportCsv')}
                </Button>
              </div>
              <ul className={DM_LIST_SCROLL}>
                {items.map((item) => (
                  <DownloadRow
                    key={item.id}
                    item={item}
                    snapshot={snapshot}
                    compact
                    selected={selectedIds.has(item.id)}
                    onSelect={toggleSelect}
                  />
                ))}
              </ul>
          </TabsContent>

          <TabsContent value="settings" className={DM_TAB_PANEL}>
              {settings ? (
                <SettingsPanel settings={settings} query={query} onPatch={patchSettings} />
              ) : null}
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={confirmErase}
        onOpenChange={setConfirmErase}
        title={t('downloadManager.confirm.eraseTitle')}
        description={t('downloadManager.confirm.eraseBody')}
        confirmLabel={t('downloadManager.action.erase')}
        onConfirm={() => void controlDownloads('erase', bulkIds).then(() => { setSelectedIds(new Set()); void refresh() })}
      />
      <ConfirmDialog
        open={confirmDeleteFiles}
        onOpenChange={setConfirmDeleteFiles}
        title={t('downloadManager.confirm.deleteTitle')}
        description={t('downloadManager.confirm.deleteBody')}
        confirmLabel={t('downloadManager.action.deleteFiles')}
        destructive
        onConfirm={() => void controlDownloads('removeFile', bulkIds).then(() => { setSelectedIds(new Set()); void refresh() })}
      />
    </ToolPage>
  )
}

function SettingsRow({ label, control }: { label: string; control: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      {control}
    </div>
  )
}

function SettingsPanel({
  settings,
  query,
  onPatch,
}: {
  settings: DownloadManagerSettings
  query: string
  onPatch: (patch: Partial<DownloadManagerSettings>) => Promise<unknown>
}) {
  const { t } = useTranslation()
  const q = query.trim().toLowerCase()
  const rows = [
    {
      id: 'enabled',
      label: t('downloadManager.settings.enabled'),
      control: <Switch checked={settings.enabled} onCheckedChange={(on) => void onPatch({ enabled: on })} />,
    },
    {
      id: 'autoOrganize',
      label: t('downloadManager.settings.autoOrganize'),
      control: <Switch checked={settings.autoOrganize} onCheckedChange={(on) => void onPatch({ autoOrganize: on })} />,
    },
    {
      id: 'notifyCompleted',
      label: t('downloadManager.settings.notifyCompleted'),
      control: (
        <Switch checked={settings.notifyCompleted} onCheckedChange={(on) => void onPatch({ notifyCompleted: on })} />
      ),
    },
    {
      id: 'maxConcurrent',
      label: t('downloadManager.settings.maxConcurrent'),
      control: (
        <Input
          type="number"
          min={1}
          max={6}
          className="w-20"
          value={settings.maxConcurrent}
          onChange={(e) => void onPatch({ maxConcurrent: Number(e.target.value) || 1 })}
        />
      ),
    },
  ].filter((row) => !q || row.label.toLowerCase().includes(q) || row.id.toLowerCase().includes(q))

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-xs">
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('downloadManager.emptySettings')}</p>
      ) : (
        rows.map((row) => <SettingsRow key={row.id} label={row.label} control={row.control} />)
      )}
      {!q ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">{t('downloadManager.settings.schedulerNote')}</p>
      ) : null}
    </div>
  )
}

function QueuePanel({
  queue,
  query,
  onRefresh,
}: {
  queue: import('@/core/download-manager').QueueItem[]
  query: string
  onRefresh: () => void
}) {
  const { t } = useTranslation()
  const q = query.trim().toLowerCase()
  const visible = q
    ? queue.filter((item) => {
        const haystack = [item.url, item.filename ?? '', item.status, item.pageTitle ?? '', item.pageUrl ?? '']
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    : queue
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <ClockIcon className="size-4 text-muted-foreground" />
        <p className="text-sm font-medium">{t('downloadManager.queueTitle')}</p>
        <Button
          size="xs"
          variant="ghost"
          className="ml-auto"
          onClick={() => void sendMessage({ type: 'DOWNLOAD_MANAGER_QUEUE_UPDATE', op: 'clear', doneOnly: true }).then(onRefresh)}
        >
          {t('downloadManager.clearDone')}
        </Button>
      </div>
      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t('downloadManager.emptyQueue')}</p>
      ) : (
        <ul className={DM_LIST_SCROLL}>
          {visible.map((item) => (
            <li key={item.id} className="list-none rounded-xl border bg-card px-3 py-2.5 text-sm shadow-xs">
              <p className="truncate font-medium">{item.filename || item.url}</p>
              <p className="truncate text-[11px] text-muted-foreground">{item.url}</p>
              <p className="text-[11px] text-muted-foreground">{item.status}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
