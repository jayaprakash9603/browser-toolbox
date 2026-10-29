import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArchiveIcon,
  DownloadIcon,
  FileDownIcon,
  FilesIcon,
  MonitorUpIcon,
  PlusIcon,
  UploadIcon,
} from 'lucide-react'

import { downloadBlob } from '@/features/netmon/download'
import { ChipRail } from '@/shared/components/ChipRail'
import { SearchInput } from '@/shared/components/SearchInput'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion'
import { ToolPage } from '@/shared/components/ToolPage'
import { ToolSearchLayout } from '@/shared/components/ToolSearchLayout'
import { useToast } from '@/shared/components/toast/useToast'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'

import { toTabInfo, type TabInfo } from '../tab-manager/tabModel'
import { useProductivityTool } from '../_shared'
import { ProductivityStatusBar } from '../_shared/ProductivityStatusBar'
import './i18n'
import {
  dedupeTabs,
  filterWorkspaces,
  loadWorkspaces,
  mergeImportedWorkspaces,
  newWorkspace,
  saveWorkspaces,
  sortWorkspaces,
  workspacesToMarkdown,
  workspaceTags,
  workspaceToMarkdown,
  type TabWorkspace,
  type WorkspaceSort,
  type WorkspaceTab,
} from './model'
import { WorkspaceCard } from './WorkspaceCard'
import {
  WorkspaceSaveDialog,
  type CaptureScope,
  type SaveRequest,
  type SaveResult,
} from './WorkspaceSaveDialog'

const SKIPPED_PROTOCOL = /^(chrome|edge|about|devtools):/i

async function captureTabs(scope: CaptureScope): Promise<WorkspaceTab[]> {
  const raw = await chrome.tabs.query(scope === 'window' ? { currentWindow: true } : {})
  return raw
    .map(toTabInfo)
    .filter(
      (tab): tab is TabInfo => tab !== null && Boolean(tab.url) && !SKIPPED_PROTOCOL.test(tab.url),
    )
    .map((tab) => ({ url: tab.url, title: tab.title }))
}

function safeFileName(name: string): string {
  return name.replace(/[^\w-]+/g, '-').slice(0, 40) || 'session'
}

export default function WorkspacesTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.workspaces')
  const { show: showToast } = useToast()
  const [workspaces, setWorkspaces] = useState<TabWorkspace[]>([])
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | 'all'>('all')
  const [sort, setSort] = useState<WorkspaceSort>('recent')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [scope, setScope] = useState<CaptureScope>('window')
  const [request, setRequest] = useState<SaveRequest | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void loadWorkspaces().then((list) => {
      setWorkspaces(list)
      setLoaded(true)
    })
  }, [])

  const persist = useCallback(async (next: TabWorkspace[]) => {
    setWorkspaces(next)
    await saveWorkspaces(next)
  }, [])

  const patch = (id: string, change: (workspace: TabWorkspace) => TabWorkspace) =>
    persist(workspaces.map((w) => (w.id === id ? { ...change(w), updatedAt: Date.now() } : w)))

  const tags = useMemo(() => workspaceTags(workspaces), [workspaces])
  const visible = useMemo(
    () => sortWorkspaces(filterWorkspaces(workspaces, query, tag), sort),
    [workspaces, query, tag, sort],
  )
  const totalTabs = useMemo(
    () => workspaces.reduce((sum, w) => sum + w.tabs.length, 0),
    [workspaces],
  )
  const filtersActive = query.trim().length > 0 || tag !== 'all'

  const resetFilters = () => {
    setQuery('')
    setTag('all')
  }

  const openCapture = useCallback(
    async (nextScope: CaptureScope, keep?: SaveRequest) => {
      setBusy(true)
      try {
        const tabs = await captureTabs(nextScope)
        setScope(nextScope)
        setRequest({
          key: keep?.key ?? crypto.randomUUID(),
          mode: 'create',
          name:
            keep?.name ?? t('workspaces.defaultName', { date: new Date().toLocaleDateString() }),
          note: keep?.note ?? '',
          tags: keep?.tags ?? [],
          tabs,
        })
      } catch {
        showToast(t('workspaces.captureError'), { variant: 'error' })
      } finally {
        setBusy(false)
      }
    },
    [showToast, t],
  )

  const quickSaveWindow = async () => {
    try {
      const tabs = dedupeTabs(await captureTabs('window'))
      if (!tabs.length) return
      const name = t('workspaces.defaultName', { date: new Date().toLocaleDateString() })
      await persist([newWorkspace(name, tabs), ...workspaces])
      showToast(t('workspaces.saved', { count: tabs.length }))
    } catch {
      showToast(t('workspaces.captureError'), { variant: 'error' })
    }
  }

  const confirmSave = (result: SaveResult, source: SaveRequest) => {
    if (source.mode === 'edit' && source.workspaceId) {
      void patch(source.workspaceId, (w) => ({
        ...w,
        name: result.name.trim() || w.name,
        note: result.note.trim() || undefined,
        tags: result.tags.length ? result.tags : undefined,
      }))
      showToast(t('workspaces.updated'))
    } else {
      void persist([
        newWorkspace(result.name, result.tabs, result.note, result.tags),
        ...workspaces,
      ])
      showToast(t('workspaces.saved', { count: result.tabs.length }))
    }
    setRequest(null)
  }

  const edit = (workspace: TabWorkspace) =>
    setRequest({
      key: workspace.id,
      mode: 'edit',
      workspaceId: workspace.id,
      name: workspace.name,
      note: workspace.note ?? '',
      tags: workspace.tags ?? [],
      tabs: workspace.tabs,
    })

  const restore = async (workspace: TabWorkspace, mode: 'window' | 'current') => {
    const urls = workspace.tabs.map((tab) => tab.url).filter(Boolean)
    if (!urls.length) return
    try {
      if (mode === 'window') {
        await chrome.windows.create({ url: urls, focused: true })
        showToast(t('workspaces.restored', { count: urls.length }))
      } else {
        for (const url of urls) await chrome.tabs.create({ url, active: false })
        showToast(t('workspaces.openedCurrent', { count: urls.length }))
      }
    } catch {
      showToast(t('workspaces.captureError'), { variant: 'error' })
    }
  }

  const addActiveTab = async (workspace: TabWorkspace) => {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!active?.url || SKIPPED_PROTOCOL.test(active.url)) {
      showToast(t('workspaces.captureError'), { variant: 'error' })
      return
    }
    if (workspace.tabs.some((tab) => tab.url === active.url)) {
      showToast(t('workspaces.tabAlreadyInSession', { name: workspace.name }))
      return
    }
    const entry = { url: active.url, title: active.title }
    void patch(workspace.id, (w) => ({ ...w, tabs: [...w.tabs, entry] }))
    showToast(t('workspaces.tabAdded', { name: workspace.name }))
  }

  const dedupeWorkspace = (workspace: TabWorkspace) => {
    const unique = dedupeTabs(workspace.tabs)
    const removed = workspace.tabs.length - unique.length
    void patch(workspace.id, (w) => ({ ...w, tabs: unique }))
    showToast(t('workspaces.deduped', { count: removed }), { undo: () => void persist(workspaces) })
  }

  const removeTab = (workspace: TabWorkspace, index: number) => {
    const before = workspaces
    if (workspace.tabs.length === 1) return remove(workspace)
    void patch(workspace.id, (w) => ({ ...w, tabs: w.tabs.filter((_, i) => i !== index) }))
    showToast(t('workspaces.tabRemoved'), { undo: () => void persist(before) })
  }

  const remove = (workspace: TabWorkspace) => {
    const before = workspaces
    void persist(workspaces.filter((w) => w.id !== workspace.id))
    showToast(t('workspaces.deleted'), { undo: () => void persist(before) })
  }

  const duplicate = (workspace: TabWorkspace) => {
    const copy = newWorkspace(
      `${workspace.name} (${t('workspaces.copySuffix')})`,
      workspace.tabs,
      workspace.note,
      workspace.tags,
    )
    void persist([copy, ...workspaces])
    showToast(t('workspaces.duplicated'))
  }

  const copyText = (text: string, messageKey: string) =>
    void navigator.clipboard.writeText(text).then(
      () => showToast(t(messageKey)),
      () => showToast(t('workspaces.captureError'), { variant: 'error' }),
    )

  const exportOne = (workspace: TabWorkspace) =>
    downloadBlob(
      new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' }),
      `${safeFileName(workspace.name)}.json`,
    )

  const stamp = () => new Date().toISOString().slice(0, 10)

  const exportAllJson = () =>
    downloadBlob(
      new Blob([JSON.stringify(workspaces, null, 2)], { type: 'application/json' }),
      `tab-sessions-${stamp()}.json`,
    )

  const exportAllMarkdown = () =>
    downloadBlob(
      new Blob([workspacesToMarkdown(workspaces)], { type: 'text/markdown' }),
      `tab-sessions-${stamp()}.md`,
    )

  const importJson = async (file: File) => {
    try {
      const merged = mergeImportedWorkspaces(workspaces, JSON.parse(await file.text()))
      await persist(merged)
      showToast(t('workspaces.imported', { count: merged.length - workspaces.length }))
    } catch {
      showToast(t('workspaces.importFailed'), { variant: 'error' })
    }
  }

  return (
    <ToolPage tool={tool} contentClassName="overflow-hidden p-0">
      <ToolSearchLayout
        header={
          <>
            <div className="flex items-center gap-1.5">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder={t('workspaces.search')}
                ariaLabel={t('workspaces.search')}
                shortcut="/"
                className="min-w-0 flex-1"
              />
              <Button
                size="sm"
                className="shrink-0"
                onClick={() => void openCapture(scope)}
                disabled={busy}
              >
                <PlusIcon />
                <span className="hidden @[380px]:inline">{t('workspaces.saveCurrent')}</span>
                <span className="sr-only @[380px]:hidden">{t('workspaces.saveCurrent')}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    className="shrink-0"
                    aria-label={t('workspaces.exportAll')}
                    title={t('workspaces.exportAll')}
                  >
                    <FilesIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => void quickSaveWindow()}>
                    <MonitorUpIcon className="size-4" />
                    {t('workspaces.quickSaveWindow')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => importRef.current?.click()}>
                    <UploadIcon className="size-4" />
                    {t('workspaces.importJson')}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!workspaces.length} onSelect={exportAllJson}>
                    <DownloadIcon className="size-4" />
                    {t('workspaces.exportAll')}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!workspaces.length} onSelect={exportAllMarkdown}>
                    <FileDownIcon className="size-4" />
                    {t('workspaces.exportMd')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) void importJson(file)
                }}
              />
            </div>

            {workspaces.length > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                <Segmented
                  size="sm"
                  ariaLabel={t('workspaces.sortBy')}
                  value={sort}
                  onValueChange={(v) => setSort(v as WorkspaceSort)}
                  options={[
                    { value: 'recent', label: t('workspaces.sort.recent') },
                    { value: 'name', label: t('workspaces.sort.name') },
                    { value: 'tabs', label: t('workspaces.sort.tabs') },
                  ]}
                />
                {filtersActive && (
                  <Button
                    size="xs"
                    variant="ghost"
                    className="shrink-0 text-primary"
                    onClick={resetFilters}
                  >
                    {t('workspaces.clearSearch')}
                  </Button>
                )}
              </div>
            )}

            {tags.length > 0 && (
              <ChipRail role="tablist" label={t('workspaces.fieldTags')} edgeFade={false}>
                <TagChip
                  active={tag === 'all'}
                  label={t('workspaces.allTags')}
                  count={workspaces.length}
                  onClick={() => setTag('all')}
                />
                {tags.map(({ tag: name, count }) => (
                  <TagChip
                    key={name}
                    active={tag === name}
                    label={`#${name}`}
                    count={count}
                    onClick={() => setTag(tag === name ? 'all' : name)}
                  />
                ))}
              </ChipRail>
            )}
          </>
        }
        footer={
          loaded ? (
            <ProductivityStatusBar>
              {t('workspaces.summary', { count: workspaces.length, tabs: totalTabs })}
            </ProductivityStatusBar>
          ) : null
        }
        bodyClassName="pb-3 pt-2.5"
      >
        {!loaded ? (
          <ul className="space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-36 animate-pulse rounded-xl border bg-muted/40" />
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <ArchiveIcon className="size-6 text-primary" aria-hidden />
            </span>
            <p className="text-sm font-semibold">
              {filtersActive ? t('workspaces.noMatch') : t('workspaces.emptyTitle')}
            </p>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              {filtersActive ? t('workspaces.noMatchHint') : t('workspaces.emptyHint')}
            </p>
            {filtersActive ? (
              <Button size="sm" variant="outline" className="mt-1" onClick={resetFilters}>
                {t('workspaces.clearSearch')}
              </Button>
            ) : (
              <Button
                size="sm"
                className="mt-1"
                onClick={() => void openCapture(scope)}
                disabled={busy}
              >
                <PlusIcon />
                {t('workspaces.saveCurrent')}
              </Button>
            )}
          </div>
        ) : (
          <StaggerChildren className="grid grid-cols-1 gap-2 @[760px]:grid-cols-2" stagger={0.05}>
            {visible.map((workspace) => (
              <StaggerItem key={workspace.id} className="flex [&>*]:w-full">
                <WorkspaceCard
                  workspace={workspace}
                  onRestore={(w, mode) => void restore(w, mode)}
                  onAddActiveTab={(w) => void addActiveTab(w)}
                  onDedupe={dedupeWorkspace}
                  onTogglePin={(w) =>
                    void patch(w.id, (item) => ({ ...item, pinned: !item.pinned }))
                  }
                  onEdit={edit}
                  onDuplicate={duplicate}
                  onCopyMarkdown={(w) =>
                    copyText(workspaceToMarkdown(w), 'workspaces.markdownCopied')
                  }
                  onExport={exportOne}
                  onDelete={remove}
                  onOpenTab={(url) => void chrome.tabs.create({ url, active: true })}
                  onCopyTabUrl={(url) => copyText(url, 'workspaces.urlCopied')}
                  onRemoveTab={removeTab}
                  onTagClick={setTag}
                />
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </ToolSearchLayout>

      <WorkspaceSaveDialog
        request={request}
        scope={scope}
        scopeLoading={busy}
        onScopeChange={(next) => request && void openCapture(next, request)}
        onClose={() => setRequest(null)}
        onConfirm={confirmSave}
      />
    </ToolPage>
  )
}

function TagChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium',
        'transition-[color,background-color,border-color] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground',
      )}
    >
      <span className="max-w-[9rem] truncate">{label}</span>
      <span
        className={cn(
          'rounded-full px-1.5 text-[9.5px] leading-4 tabular-nums',
          active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  )
}
