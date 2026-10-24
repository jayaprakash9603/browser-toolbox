import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppWindowIcon,
  ArrowDownUpIcon,
  ChevronDownIcon,
  CopyIcon,
  CopyXIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  GlobeIcon,
  LayersIcon,
  ListIcon,
  ListChecksIcon,
  MergeIcon,
  MoonIcon,
  PinIcon,
  PlusIcon,
  RefreshCwIcon,
  SortAscIcon,
  VolumeXIcon,
  XIcon,
} from 'lucide-react'

import { get, set } from '@/core/storage'
import { downloadBlob } from '@/features/netmon/download'
import { ToolPage } from '@/shared/components/ToolPage'
import { SearchInput } from '@/shared/components/SearchInput'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Segmented } from '@/shared/components/ui/segmented'
import { Textarea } from '@/shared/components/ui/textarea'
import { JsonErrorView } from '@/tools/developer/_shared'
import { cn } from '@/shared/utils/cn'

import { useProductivityTool } from '../_shared'
import {
  closeTabs,
  currentWindowId,
  duplicateTab,
  focusTab,
  mergeWindowsInto,
  moveToNewWindow,
  openUrls,
  readTabs,
  reloadTab,
  restoreTabs,
  setMuted,
  setPinned,
  sleepTabs,
  sortWindowByDomain,
  watchTabs,
  type ClosedTab,
} from './tabActions'
import {
  duplicateIds,
  exportTabs,
  filterCounts,
  formatTabs,
  groupTabs,
  matchesFilter,
  matchesQuery,
  parseUrlList,
  sortTabs,
  TAB_FILTERS,
  toTabInfo,
  type CopyFormat,
  type ExportFormat,
  type TabFilter,
  type TabGrouping,
  type TabInfo,
  type TabSort,
} from './tabModel'
import { TabRow, type RowAction } from './TabRow'

const PREFS_KEY = 'toolbox.tabManager.prefs'
const SORTS: TabSort[] = ['position', 'recent', 'title', 'domain']
const COPY_FORMATS: CopyFormat[] = ['urls', 'markdown', 'titled', 'csv']
const EXPORT_FORMATS: ExportFormat[] = ['txt', 'csv', 'json', 'html']

interface Prefs {
  grouping: TabGrouping
  sort: TabSort
}

interface Notice {
  text: string
  undo?: ClosedTab[]
}

export default function TabManagerTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.tab-manager')
  const [tabs, setTabs] = useState<TabInfo[]>([])
  const [windowId, setWindowId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<TabFilter>('all')
  const [prefs, setPrefs] = useState<Prefs>({ grouping: 'window', sort: 'position' })
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [urlText, setUrlText] = useState('')
  const lastClicked = useRef<number | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const load = useCallback(
    () =>
      Promise.all([readTabs(), currentWindowId()])
        .then(([all, win]) => {
          setTabs(all.map(toTabInfo).filter((tab): tab is TabInfo => tab !== null))
          setWindowId(win)
          setError(null)
        })
        .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : t('tabs.loadError')))
        .finally(() => setLoaded(true)),
    [t],
  )

  useEffect(() => {
    const unwatch = watchTabs(() => void load())
    void Promise.resolve().then(load)
    return unwatch
  }, [load])

  useEffect(() => {
    void get<Partial<Prefs>>(PREFS_KEY).then((stored) => {
      if (stored) setPrefs((p) => ({ ...p, ...stored }))
    })
    return () => clearTimeout(noticeTimer.current)
  }, [])

  const updatePrefs = (patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch }
      void set(PREFS_KEY, next)
      return next
    })
  }

  const notify = (text: string, undo?: ClosedTab[]) => {
    clearTimeout(noticeTimer.current)
    setNotice({ text, undo })
    noticeTimer.current = setTimeout(() => setNotice(null), undo ? 8000 : 3500)
  }

  const dupes = useMemo(() => duplicateIds(tabs), [tabs])
  const ctx = useMemo(() => ({ windowId, dupes }), [windowId, dupes])
  const counts = useMemo(() => filterCounts(tabs, ctx), [tabs, ctx])
  const windowOrder = useMemo(() => {
    const ids = [...new Set(sortTabs(tabs, 'position').map((tab) => tab.windowId))]
    return windowId != null && ids.includes(windowId) ? [windowId, ...ids.filter((id) => id !== windowId)] : ids
  }, [tabs, windowId])

  const visible = useMemo(
    () => sortTabs(tabs.filter((tab) => matchesFilter(tab, filter, ctx) && matchesQuery(tab, query)), prefs.sort),
    [tabs, filter, ctx, query, prefs.sort],
  )
  const groups = useMemo(() => groupTabs(visible, prefs.grouping, windowOrder), [visible, prefs.grouping, windowOrder])
  const byId = useMemo(() => new Map(tabs.map((tab) => [tab.id, tab])), [tabs])
  const selectedTabs = useMemo(
    () => [...selected].map((id) => byId.get(id)).filter((tab): tab is TabInfo => tab !== undefined),
    [selected, byId],
  )
  const visibleSelected = visible.filter((tab) => selected.has(tab.id)).length
  const allVisibleSelected = visible.length > 0 && visibleSelected === visible.length

  const run = (task: () => Promise<unknown>, success?: string) => {
    void task()
      .then(() => {
        if (success) notify(success)
      })
      .catch((cause: unknown) => notify(cause instanceof Error ? cause.message : t('tabs.actionFailed')))
      .finally(() => void load())
  }

  const close = (targets: TabInfo[]) => {
    if (!targets.length) return
    const ids = new Set(targets.map((tab) => tab.id))
    setTabs((prev) => prev.filter((tab) => !ids.has(tab.id)))
    setSelected((prev) => new Set([...prev].filter((id) => !ids.has(id))))
    void closeTabs(targets)
      .then((snapshot) => notify(t('tabs.closedCount', { count: snapshot.length }), snapshot))
      .catch(() => notify(t('tabs.actionFailed')))
      .finally(() => void load())
  }

  const undoClose = (snapshot: ClosedTab[]) => {
    clearTimeout(noticeTimer.current)
    setNotice(null)
    run(() => restoreTabs(snapshot), t('tabs.restoredCount', { count: snapshot.length }))
  }

  const copy = (targets: TabInfo[], format: CopyFormat) => {
    run(() => navigator.clipboard.writeText(formatTabs(targets, format)), t('tabs.copiedCount', { count: targets.length }))
  }

  const exportVisible = (format: ExportFormat) => {
    const { text, mime } = exportTabs(visible, format)
    const ext = format === 'html' ? 'html' : format
    downloadBlob(new Blob([text], { type: mime }), `tabs-${new Date().toISOString().slice(0, 10)}.${ext}`)
    notify(t('tabs.exportedCount', { count: visible.length }))
  }

  const onRowAction = (action: RowAction, tab: TabInfo) => {
    switch (action) {
      case 'focus':
        return run(() => focusTab(tab))
      case 'reload':
        return run(() => reloadTab(tab))
      case 'duplicate':
        return run(() => duplicateTab(tab), t('tabs.duplicated'))
      case 'pin':
        return run(() => setPinned([tab], !tab.pinned))
      case 'mute':
        return run(() => setMuted([tab], !tab.muted))
      case 'sleep':
        return run(() => sleepTabs([tab]), t('tabs.sleptCount', { count: 1 }))
      case 'newWindow':
        return run(() => moveToNewWindow([tab]))
      case 'copyUrl':
        return copy([tab], 'urls')
      case 'copyMarkdown':
        return copy([tab], 'markdown')
      case 'closeOthers':
        return close(tabs.filter((other) => other.windowId === tab.windowId && other.id !== tab.id && !other.pinned))
      case 'close':
        return close([tab])
    }
  }

  const toggleSelect = (tab: TabInfo, range: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      const anchor = lastClicked.current
      if (range && anchor != null && anchor !== tab.id) {
        const order = visible.map((v) => v.id)
        const [a, b] = [order.indexOf(anchor), order.indexOf(tab.id)].sort((x, y) => x - y)
        if (a >= 0) order.slice(a, b + 1).forEach((id) => next.add(id))
      } else if (next.has(tab.id)) next.delete(tab.id)
      else next.add(tab.id)
      return next
    })
    lastClicked.current = tab.id
  }

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) visible.forEach((tab) => next.delete(tab.id))
      else visible.forEach((tab) => next.add(tab.id))
      return next
    })
  }

  const clearSelection = () => {
    setSelected(new Set())
    setSelectMode(false)
  }

  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const windowLabel = (id: number | undefined) => {
    const n = windowOrder.indexOf(id ?? -1) + 1
    return id === windowId ? t('tabs.currentWindow') : t('tabs.windowN', { n })
  }

  const currentWindowTabs = tabs.filter((tab) => tab.windowId === windowId)
  const parsedUrls = useMemo(() => parseUrlList(urlText), [urlText])
  const bulkActive = selectedTabs.length > 0

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col gap-2.5 overflow-hidden">
      <div className="flex items-center gap-1.5">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t('tabs.search')}
          ariaLabel={t('tabs.search')}
          className="flex-1"
        />
        <Button
          size="icon-sm"
          variant={selectMode ? 'secondary' : 'ghost'}
          aria-pressed={selectMode}
          onClick={() => (selectMode ? clearSelection() : setSelectMode(true))}
          aria-label={t('tabs.selectMode')}
          title={t('tabs.selectMode')}
        >
          <ListChecksIcon />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label={t('tabs.moreActions')} title={t('tabs.moreActions')}>
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[min(28rem,var(--radix-dropdown-menu-content-available-height))] min-w-[13rem]">
            <DropdownMenuItem onSelect={() => setOpenDialog(true)}>
              <PlusIcon className="size-4" />
              {t('tabs.openUrls')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => run(load, t('tabs.refreshed'))}>
              <RefreshCwIcon className="size-4" />
              {t('tabs.refresh')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('tabs.tidyUp')}</DropdownMenuLabel>
            <DropdownMenuItem disabled={!dupes.size} onSelect={() => close(tabs.filter((tab) => dupes.has(tab.id)))}>
              <CopyXIcon className="size-4" />
              {t('tabs.closeDupes', { count: dupes.size })}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                run(async () => {
                  const n = await sleepTabs(tabs)
                  notify(t('tabs.sleptCount', { count: n }))
                })
              }
            >
              <MoonIcon className="size-4" />
              {t('tabs.sleepInactive')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={currentWindowTabs.length < 2}
              onSelect={() => run(() => sortWindowByDomain(currentWindowTabs), t('tabs.sortedWindow'))}
            >
              <SortAscIcon className="size-4" />
              {t('tabs.sortWindowByDomain')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={windowOrder.length < 2 || windowId == null}
              onSelect={() =>
                run(async () => {
                  const n = await mergeWindowsInto(windowId!, tabs)
                  notify(t('tabs.mergedCount', { count: n }))
                })
              }
            >
              <MergeIcon className="size-4" />
              {t('tabs.mergeWindows')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2" disabled={!visible.length}>
                <CopyIcon className="size-4" />
                {t('tabs.copyVisible')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {COPY_FORMATS.map((format) => (
                  <DropdownMenuItem key={format} onSelect={() => copy(visible, format)}>
                    {t(`tabs.copyFormat.${format}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2" disabled={!visible.length}>
                <DownloadIcon className="size-4" />
                {t('tabs.exportVisible')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {EXPORT_FORMATS.map((format) => (
                  <DropdownMenuItem key={format} onSelect={() => exportVisible(format)}>
                    {t(`tabs.exportFormat.${format}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div role="tablist" aria-label={t('tabs.filters')} className="flex flex-wrap gap-1.5">
        {TAB_FILTERS.filter((f) => f === 'all' || f === filter || counts[f] > 0).map((f) => {
          const active = f === filter
          return (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f)}
              className={cn(
                'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                f === 'duplicates' && !active && 'text-amber-700 dark:text-amber-300',
              )}
            >
              {t(`tabs.filter.${f}`)}
              <span
                className={cn(
                  'min-w-4 rounded-full px-1 text-center text-[10px] tabular-nums',
                  active ? 'bg-primary/15' : 'bg-muted',
                )}
              >
                {counts[f]}
              </span>
            </button>
          )
        })}
      </div>

      {bulkActive || selectMode ? (
        <div
          className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 py-1 pr-1 pl-2"
          role="toolbar"
          aria-label={t('tabs.bulkActions')}
        >
          <Checkbox
            checked={allVisibleSelected ? true : visibleSelected > 0 ? 'indeterminate' : false}
            onCheckedChange={toggleSelectAll}
            aria-label={t('tabs.selectAllVisible')}
          />
          <span className="mr-auto pl-1 text-xs font-medium tabular-nums">
            {t('tabs.selectedCount', { count: selectedTabs.length })}
          </span>
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={!bulkActive}
            onClick={() => run(() => setPinned(selectedTabs, !selectedTabs.every((tab) => tab.pinned)))}
            aria-label={t('tabs.pinSelected')}
            title={t('tabs.pinSelected')}
          >
            <PinIcon />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={!bulkActive}
            onClick={() => run(() => setMuted(selectedTabs, !selectedTabs.every((tab) => tab.muted)))}
            aria-label={t('tabs.muteSelected')}
            title={t('tabs.muteSelected')}
          >
            <VolumeXIcon />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={!bulkActive}
            onClick={() =>
              run(async () => {
                const n = await sleepTabs(selectedTabs)
                notify(t('tabs.sleptCount', { count: n }))
              })
            }
            aria-label={t('tabs.sleepSelected')}
            title={t('tabs.sleepSelected')}
          >
            <MoonIcon />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={!bulkActive}
            onClick={() => run(() => moveToNewWindow(selectedTabs).then(clearSelection))}
            aria-label={t('tabs.moveSelected')}
            title={t('tabs.moveSelected')}
          >
            <AppWindowIcon />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={!bulkActive}
            onClick={() => copy(selectedTabs, 'urls')}
            aria-label={t('tabs.copySelected')}
            title={t('tabs.copySelected')}
          >
            <CopyIcon />
          </Button>
          <Button
            size="xs"
            variant="destructive"
            disabled={!bulkActive}
            onClick={() => close(selectedTabs)}
            className="ml-0.5"
          >
            <XIcon />
            {t('tabs.closeSelected')}
          </Button>
          <Button size="icon-xs" variant="ghost" onClick={clearSelection} aria-label={t('tabs.clearSelection')} title={t('tabs.clearSelection')}>
            <XIcon />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <Segmented
            size="sm"
            ariaLabel={t('tabs.groupBy')}
            value={prefs.grouping}
            onValueChange={(grouping) => updatePrefs({ grouping })}
            options={[
              { value: 'window', label: <><LayersIcon />{t('tabs.group.window')}</>, title: t('tabs.groupByWindow') },
              { value: 'domain', label: <><GlobeIcon />{t('tabs.group.domain')}</>, title: t('tabs.groupByDomain') },
              { value: 'none', label: <><ListIcon />{t('tabs.group.none')}</>, title: t('tabs.noGrouping') },
            ]}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="xs" variant="ghost" className="text-muted-foreground" aria-label={t('tabs.sortBy')}>
                <ArrowDownUpIcon />
                {t(`tabs.sort.${prefs.sort}`)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('tabs.sortBy')}</DropdownMenuLabel>
              {SORTS.map((sort) => (
                <DropdownMenuCheckboxItem key={sort} checked={prefs.sort === sort} onCheckedChange={() => updatePrefs({ sort })}>
                  {t(`tabs.sort.${sort}`)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {error && <JsonErrorView message={error} />}

      <div className="scrollbar-styled -mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
        {!loaded ? (
          <ul className="space-y-1.5" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="h-[46px] animate-pulse rounded-lg border bg-muted/40" />
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-10 text-center">
            <p className="text-xs font-medium">{t('tabs.emptyTitle')}</p>
            <p className="text-[11px] text-muted-foreground">{t('tabs.emptyHint')}</p>
            {(query || filter !== 'all') && (
              <Button
                size="xs"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  setQuery('')
                  setFilter('all')
                }}
              >
                {t('tabs.clearFilters')}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => {
              const isCollapsed = collapsed.has(group.key)
              const label = prefs.grouping === 'window' ? windowLabel(group.windowId) : group.label
              const groupSelected = group.tabs.every((tab) => selected.has(tab.id))
              return (
                <section key={group.key} aria-label={label || t('tabs.allTabs')}>
                  {prefs.grouping !== 'none' && (
                    <div className="sticky top-0 z-[1] -mx-0.5 mb-1 flex items-center gap-1 bg-background/95 px-0.5 py-0.5 backdrop-blur-sm">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.key)}
                        aria-expanded={!isCollapsed}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronDownIcon
                          className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', isCollapsed && '-rotate-90')}
                        />
                        {prefs.grouping === 'window' ? (
                          <AppWindowIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <GlobeIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate text-[11px] font-semibold tracking-wide text-foreground/80 uppercase">
                          {label}
                        </span>
                        <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground tabular-nums">
                          {group.tabs.length}
                        </span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon-xs" variant="ghost" aria-label={t('tabs.groupActions', { name: label })} title={t('tabs.groupActions', { name: label })}>
                            <EllipsisVerticalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              setSelectMode(true)
                              setSelected((prev) => {
                                const next = new Set(prev)
                                group.tabs.forEach((tab) => (groupSelected ? next.delete(tab.id) : next.add(tab.id)))
                                return next
                              })
                            }}
                          >
                            <ListChecksIcon className="size-4" />
                            {groupSelected ? t('tabs.deselectGroup') : t('tabs.selectGroup')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => copy(group.tabs, 'urls')}>
                            <CopyIcon className="size-4" />
                            {t('tabs.copyGroup')}
                          </DropdownMenuItem>
                          {prefs.grouping === 'domain' && (
                            <DropdownMenuItem onSelect={() => run(() => moveToNewWindow(group.tabs))}>
                              <AppWindowIcon className="size-4" />
                              {t('tabs.moveGroup')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => close(group.tabs)}
                            className="text-destructive focus:text-destructive"
                          >
                            <XIcon className="size-4" />
                            {t('tabs.closeGroup', { count: group.tabs.length })}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  {!isCollapsed && (
                    <ul className="space-y-1.5">
                      {group.tabs.map((tab) => (
                        <TabRow
                          key={tab.id}
                          tab={tab}
                          selected={selected.has(tab.id)}
                          selectMode={selectMode || bulkActive}
                          duplicate={dupes.has(tab.id)}
                          onToggleSelect={toggleSelect}
                          onAction={onRowAction}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>

      {notice ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border bg-foreground px-3 py-1.5 text-xs text-background shadow-md"
        >
          <span className="min-w-0 flex-1 truncate">{notice.text}</span>
          {notice.undo && notice.undo.length > 0 && (
            <button
              type="button"
              onClick={() => undoClose(notice.undo!)}
              className="cursor-pointer rounded px-1.5 py-0.5 font-semibold text-background underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {t('tabs.undo')}
            </button>
          )}
        </div>
      ) : (
        loaded && (
          <p className="text-[10.5px] text-muted-foreground tabular-nums">
            {t('tabs.summary', { count: tabs.length, windows: windowOrder.length })}
            {dupes.size > 0 && ` · ${t('tabs.summaryDupes', { count: dupes.size })}`}
          </p>
        )
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tabs.openUrlsTitle')}</DialogTitle>
            <DialogDescription>{t('tabs.openUrlsHint')}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder={'https://example.com\nexample.org'}
            aria-label={t('tabs.openUrlsTitle')}
            className="h-36 font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              disabled={!parsedUrls.length}
              onClick={() => {
                const urls = parsedUrls
                setOpenDialog(false)
                setUrlText('')
                run(() => openUrls(urls, windowId), t('tabs.openedCount', { count: urls.length }))
              }}
            >
              {t('tabs.openCount', { count: parsedUrls.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ToolPage>
  )
}
