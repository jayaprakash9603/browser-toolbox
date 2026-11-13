import {
  BarChart3Icon,
  Clock3Icon,
  Globe2Icon,
  HistoryIcon,
  LayoutDashboardIcon,
  RefreshCwIcon,
  RotateCcwIcon,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import {
  defaultHistoryFilters,
  distinctDomains,
  HISTORY_OPEN_BATCH_LIMIT,
  RANGE_PRESETS,
  historyExportFilename,
  historyToCsv,
  historyToHtml,
  historyToJson,
  type HistoryManagerTab,
  type HistoryPage,
  type HistoryRangePreset,
} from '@/core/history-manager'
import { downloadBlob } from '@/features/netmon/download'
import { PermissionNotice } from '@/features/site-access/PermissionNotice'
import { usePermissionGranted } from '@/features/site-access/usePermissionGranted'
import { parseSearchParam, useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { SearchInput } from '@/shared/components/SearchInput'
import { ToolPage } from '@/shared/components/ToolPage'
import { useToast } from '@/shared/components/toast/useToast'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { ErrorState } from '@/shared/components/ErrorState'
import { EmptyState } from '@/shared/components/EmptyState'
import { Segmented } from '@/shared/components/ui/segmented'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useRouter } from '@/app/router'

import { useBrowserTool } from '../_shared'
import { CleanupDialog, DeleteConfirmDialog, deleteRangeFromPreset } from './CleanupDialog'
import { ClosedTab } from './ClosedTab'
import { HistoryFiltersPanel } from './HistoryFiltersPanel'
import { HM_FOOTER, HM_LIST_SCROLL, HM_TAB_PANEL, HM_TOOLBAR } from './layout'
import { OverviewTab } from './OverviewTab'
import { SitesTab } from './SitesTab'
import { TimelineTab } from './TimelineTab'
import { HISTORY_MANAGER_TABS } from './routes'
import {
  deleteAllHistory,
  deleteHistoryRange,
  deleteHistoryUrl,
  historyApiAvailable,
  openUrl,
} from './service'
import { useHistoryManager } from './hooks'
import './i18n'

const InsightsTab = lazy(() => import('./InsightsTab'))

const TAB_ICONS: Record<HistoryManagerTab, typeof HistoryIcon> = {
  overview: LayoutDashboardIcon,
  timeline: Clock3Icon,
  sites: Globe2Icon,
  insights: BarChart3Icon,
  closed: RotateCcwIcon,
}

export default function HistoryManagerTool() {
  const { t } = useTranslation()
  const tool = useBrowserTool('browser.history-manager')
  const { show } = useToast()
  const { search } = useRouter()
  const reduce = useReducedMotion()
  const historyGranted = usePermissionGranted({ permissions: ['history'] })
  const enabled = historyGranted === true && historyApiAvailable()
  const [tab, setTab] = useDeepLinkTab<HistoryManagerTab>('tab', HISTORY_MANAGER_TABS, 'overview')
  const manager = useHistoryManager(enabled)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cleanupOpen, setCleanupOpen] = useState(false)
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [domainDelete, setDomainDelete] = useState<{ domain: string; pages: HistoryPage[] } | null>(null)
  const [topLimit, setTopLimit] = useState(20)

  useEffect(() => {
    const q = parseSearchParam(search, 'q')
    const domain = parseSearchParam(search, 'domain')
    const urlTab = parseSearchParam(search, 'tab')
    if (q) manager.setQuery(q)
    if (domain) manager.patchFilters({ domains: [domain] })
    if (urlTab && (HISTORY_MANAGER_TABS as readonly string[]).includes(urlTab)) {
      setTab(urlTab as HistoryManagerTab)
    }
  }, [search, manager, setTab])

  const domainOptions = useMemo(() => distinctDomains(manager.rawPages), [manager.rawPages])

  const rowActions = useMemo(
    () => ({
      onOpen: (url: string, mode: 'current' | 'tab' | 'window') => void openUrl(url, mode),
      onCopy: async (text: string) => {
        await navigator.clipboard.writeText(text)
        show(t('historyManager.copied'))
      },
      onDelete: async (page: HistoryPage) => {
        await deleteHistoryUrl(page.url)
        show(t('historyManager.deleted'))
        manager.refresh()
      },
      onSelect: (page: HistoryPage, on: boolean) => {
        setSelected((prev) => {
          const next = new Set(prev)
          if (on) next.add(page.id)
          else next.delete(page.id)
          return next
        })
      },
    }),
    [manager, show, t],
  )

  const selectedPages = useMemo(
    () => manager.filteredPages.filter((p) => selected.has(p.id)),
    [manager.filteredPages, selected],
  )

  const exportPages = (pages: HistoryPage[], ext: 'csv' | 'json' | 'html') => {
    if (ext === 'csv') downloadBlob(new Blob([historyToCsv(pages)], { type: 'text/csv' }), historyExportFilename('csv'))
    else if (ext === 'json')
      downloadBlob(new Blob([historyToJson(pages)], { type: 'application/json' }), historyExportFilename('json'))
    else downloadBlob(new Blob([historyToHtml(pages, t('tools.browser.history-manager.name'))], { type: 'text/html' }), historyExportFilename('html'))
    show(t('historyManager.export.done'))
  }

  const onDeleteRange = async (preset: HistoryRangePreset) => {
    const { startTime, endTime } = deleteRangeFromPreset(preset)
    await deleteHistoryRange(startTime, endTime)
    show(t('historyManager.deleted'))
    manager.refresh()
  }

  const clearFilters = () => manager.patchFilters(defaultHistoryFilters(manager.filters.query))

  const onDayPick = (start: number) => {
    manager.patchFilters({
      customStart: start,
      customEnd: start + 86_400_000,
      range: 'all',
    })
    setTab('timeline')
  }

  const headerActions = (
    <Button type="button" size="icon-xs" variant="ghost" onClick={() => manager.refresh()} aria-label={t('historyManager.refresh')}>
      <RefreshCwIcon className="size-4" />
    </Button>
  )

  return (
    <ToolPage tool={tool} actions={headerActions} contentClassName="flex h-full min-h-0 flex-col overflow-hidden p-0 @container">
      <div className="px-[var(--density-page-pad)] pt-2.5">
        <PermissionNotice active permissions={['history']} origins={[]} message={t('historyManager.permission')} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-[var(--density-page-pad)]">
        <div className={HM_TOOLBAR}>
        <div className="flex items-center gap-2">
          <SearchInput
            value={manager.filters.query}
            onChange={manager.setQuery}
            placeholder={t('historyManager.search')}
            className="min-w-0 flex-1"
            shortcut="/"
          />
          <Button type="button" size="sm" variant={filtersOpen ? 'secondary' : 'outline'} onClick={() => setFiltersOpen((v) => !v)}>
            {t('historyManager.filters')}
          </Button>
        </div>
        <HistoryFiltersPanel
          open={filtersOpen}
          filters={manager.filters}
          domainOptions={domainOptions}
          onPatch={manager.patchFilters}
          onClear={clearFilters}
        />
        {manager.recentSearches.length > 0 && !manager.filters.query && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('historyManager.recentSearches')}
            </span>
            {manager.recentSearches.map((item) => (
              <Button
                key={item}
                type="button"
                size="xs"
                variant="outline"
                className="border-border/70 bg-background/80"
                onClick={() => manager.setQuery(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        )}
        <Segmented
          fullWidth
          ariaLabel="Range"
          value={manager.filters.range}
          onValueChange={(v) => manager.setRange(v as HistoryRangePreset)}
          options={RANGE_PRESETS.map((value: HistoryRangePreset) => ({
            value,
            label: t(`historyManager.range.${value}`),
          }))}
        />
        {manager.truncated && (
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-2 py-1 text-xs text-amber-900 dark:text-amber-200">
            {t('historyManager.truncated')}
          </p>
        )}
        </div>
        {selectedPages.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-2.5 py-2">
            <span className="text-xs font-medium">{t('historyManager.bulk.selected', { count: selectedPages.length })}</span>
            <Button type="button" size="xs" variant="destructive" onClick={() => setConfirmBulk(true)}>
              {t('historyManager.bulk.delete')}
            </Button>
            <Button
              type="button"
              size="xs"
              onClick={() => {
                selectedPages.slice(0, HISTORY_OPEN_BATCH_LIMIT).forEach((p) => void openUrl(p.url, 'tab'))
              }}
            >
              {t('historyManager.bulk.open')}
            </Button>
            <Button type="button" size="xs" onClick={() => exportPages(selectedPages, 'csv')}>
              {t('historyManager.bulk.export')}
            </Button>
          </div>
        )}
        <Tabs value={tab} onValueChange={(v) => setTab(v as HistoryManagerTab)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <TabsList variant="attached" className="w-full shrink-0 bg-muted/30">
            {HISTORY_MANAGER_TABS.map((key) => {
              const Icon = TAB_ICONS[key]
              return (
                <TabsTrigger key={key} value={key} className="gap-1 px-2 text-xs">
                  <Icon className="size-3.5" />
                  <span className="hidden @[400px]:inline">{t(`historyManager.tab.${key}`)}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
          <div className={HM_LIST_SCROLL}>
            {historyGranted === false && (
              <EmptyState icon={HistoryIcon} title={t('historyManager.permission')} />
            )}
            {!historyApiAvailable() && historyGranted && <ErrorState message={t('historyManager.unavailable')} />}
            {manager.error && <ErrorState message={manager.error} />}
            {manager.loading && enabled && (
              <p className="py-6 text-center text-sm text-muted-foreground">{t('historyManager.loading')}</p>
            )}
            {enabled && !manager.loading && manager.filteredPages.length === 0 && (
              <EmptyState icon={HistoryIcon} title={t(manager.filters.query ? 'historyManager.emptySearch' : 'historyManager.empty')} />
            )}
            <AnimatePresence mode="wait">
              {enabled && !manager.loading && manager.filteredPages.length > 0 && (
                <motion.div
                  key={tab}
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <TabsContent value="overview" className={HM_TAB_PANEL}>
                    <OverviewTab pages={manager.filteredPages} compact={manager.density === 'compact'} selected={selected} rowActions={rowActions} />
                  </TabsContent>
                  <TabsContent value="timeline" className={HM_TAB_PANEL}>
                    <TimelineTab pages={manager.filteredPages} compact={manager.density === 'compact'} selected={selected} rowActions={rowActions} />
                  </TabsContent>
                  <TabsContent value="sites" className={HM_TAB_PANEL}>
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t('historyManager.top.limit')}
                      </span>
                      {[10, 20, 50].map((n) => (
                        <Button
                          key={n}
                          size="xs"
                          variant={topLimit === n ? 'secondary' : 'outline'}
                          className={topLimit === n ? 'border-primary/30' : 'border-border/70'}
                          onClick={() => setTopLimit(n)}
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                    <SitesTab
                      pages={manager.filteredPages}
                      compact={manager.density === 'compact'}
                      selected={selected}
                      rowActions={rowActions}
                      topLimit={topLimit}
                      onDeleteDomain={(domain, pages) => setDomainDelete({ domain, pages })}
                    />
                  </TabsContent>
                  <TabsContent value="insights" className={HM_TAB_PANEL}>
                    <Suspense fallback={<p className="text-sm text-muted-foreground">{t('historyManager.loading')}</p>}>
                      <InsightsTab pages={manager.filteredPages} onDayPick={onDayPick} />
                    </Suspense>
                  </TabsContent>
                  <TabsContent value="closed" className={HM_TAB_PANEL}>
                    <ClosedTab />
                  </TabsContent>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Tabs>
      </div>
        <div className={HM_FOOTER}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="outline" className="border-border/80">
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => exportPages(manager.filteredPages, 'csv')}>{t('historyManager.export.csv')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPages(manager.filteredPages, 'json')}>{t('historyManager.export.json')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPages(manager.filteredPages, 'html')}>{t('historyManager.export.html')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="outline" onClick={() => setCleanupOpen(true)}>
              {t('historyManager.cleanup')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="ghost">
                  ···
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => manager.setDensityMode('compact')}>{t('historyManager.density.compact')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => manager.setDensityMode('detailed')}>{t('historyManager.density.detailed')}</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelected(new Set(manager.filteredPages.map((p) => p.id)))}
                >
                  {t('historyManager.selectAll')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelected(new Set())}>{t('historyManager.selectNone')}</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const all = new Set(manager.filteredPages.map((p) => p.id))
                    const next = new Set<string>()
                    manager.filteredPages.forEach((p) => {
                      if (!selected.has(p.id)) next.add(p.id)
                    })
                    setSelected(next.size ? next : all)
                  }}
                >
                  {t('historyManager.invertSelection')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      <CleanupDialog
        open={cleanupOpen}
        onOpenChange={setCleanupOpen}
        onDeleteRange={(preset) => void onDeleteRange(preset)}
        onDeleteAll={async () => {
          await deleteAllHistory()
          show(t('historyManager.deleted'))
          manager.refresh()
        }}
      />
      <DeleteConfirmDialog
        open={confirmBulk}
        onOpenChange={setConfirmBulk}
        title={t('historyManager.confirm.deleteTitle')}
        description={t('historyManager.confirm.deleteBulk', { count: selectedPages.length })}
        onConfirm={async () => {
          for (const page of selectedPages) await deleteHistoryUrl(page.url)
          setSelected(new Set())
          show(t('historyManager.deleted'))
          manager.refresh()
        }}
      />
      <DeleteConfirmDialog
        open={domainDelete !== null}
        onOpenChange={(open) => !open && setDomainDelete(null)}
        title={t('historyManager.confirm.deleteTitle')}
        description={t('historyManager.confirm.deleteDomain', { domain: domainDelete?.domain ?? '' })}
        onConfirm={async () => {
          if (!domainDelete) return
          for (const page of domainDelete.pages) await deleteHistoryUrl(page.url)
          setDomainDelete(null)
          show(t('historyManager.deleted'))
          manager.refresh()
        }}
      />
    </ToolPage>
  )
}
