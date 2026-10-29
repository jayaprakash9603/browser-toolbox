import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderOpenIcon, SearchIcon } from 'lucide-react'
import { AnimatePresence } from 'motion/react'

import { PermissionNotice } from '@/features/site-access/PermissionNotice'
import { usePermissionGranted } from '@/features/site-access/usePermissionGranted'
import { downloadBlob } from '@/features/netmon/download'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { SearchInput } from '@/shared/components/SearchInput'
import { ToolPage } from '@/shared/components/ToolPage'
import { ToolSearchLayout } from '@/shared/components/ToolSearchLayout'
import { useToast } from '@/shared/components/toast/useToast'
import { Button } from '@/shared/components/ui/button'

import { useProductivityTool } from '../_shared'
import { ProductivityStatusBar } from '../_shared/ProductivityStatusBar'
import {
  createBookmark,
  createFolder,
  moveBookmark,
  removeBookmark,
  removeFolder,
  renameFolder,
  updateBookmark,
  watchBookmarks,
} from './bookmarkActions'
import { BookmarkBreadcrumb } from './BookmarkBreadcrumb'
import {
  BookmarkFormDialog,
  FolderFormDialog,
  type BookmarkDraft,
  type BookmarkFormValues,
  type FolderDraft,
} from './BookmarkDialogs'
import { BookmarkFilters } from './BookmarkFilters'
import { BookmarkFolderRow } from './BookmarkFolderRow'
import { AddMenu, MoreMenu, OPEN_BATCH_LIMIT } from './BookmarkMenus'
import { BookmarkResultRow } from './BookmarkResultRow'
import { deriveBookmarkList } from './bookmarkList'
import './i18n'
import { ReorderableRows } from './ReorderableRows'
import {
  chromeMoveIndex,
  exportBookmarksMarkdown,
  folderTrail,
  loadBookmarkLibrary,
  topBookmarkDomains,
  type BookmarkFolder,
  type BookmarkLibrary,
  type BookmarkRow,
  type BookmarkSort,
  type BookmarkView,
} from './service'

const HIGHLIGHT_MS = 1400
const RELOAD_DEBOUNCE_MS = 120
const EMPTY_LIBRARY: BookmarkLibrary = { rows: [], folders: [] }

export default function BookmarksTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.bookmarks')
  const { show: showToast } = useToast()
  const granted = usePermissionGranted({ permissions: ['bookmarks'] })
  const [library, setLibrary] = useState<BookmarkLibrary>(EMPTY_LIBRARY)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [folderId, setFolderId] = useState<string | 'all'>('all')
  const [domain, setDomain] = useState<string | 'all'>('all')
  const [view, setView] = useState<BookmarkView>('all')
  const [sort, setSort] = useState<BookmarkSort>('recent')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [bookmarkDraft, setBookmarkDraft] = useState<BookmarkDraft | null>(null)
  const [folderDraft, setFolderDraft] = useState<FolderDraft | null>(null)
  const [folderToDelete, setFolderToDelete] = useState<BookmarkFolder | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const load = useCallback(async () => {
    if (!chrome.bookmarks?.getTree) {
      setError(t('bookmarks.unavailable'))
      return
    }
    setLoading(true)
    try {
      setLibrary(await loadBookmarkLibrary())
      setError(null)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : t('bookmarks.loadError'))
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }, [t])

  const scheduleReload = useCallback(() => {
    clearTimeout(reloadTimer.current)
    reloadTimer.current = setTimeout(() => void load(), RELOAD_DEBOUNCE_MS)
  }, [load])

  useEffect(() => {
    if (granted !== true) return
    void load()
    const unwatch = watchBookmarks(scheduleReload)
    return () => {
      unwatch()
      clearTimeout(reloadTimer.current)
    }
  }, [granted, load, scheduleReload])

  useEffect(() => () => clearTimeout(highlightTimer.current), [])

  useEffect(() => {
    setDomain('all')
  }, [folderId, query])

  useEffect(() => {
    if (loaded && folderId !== 'all' && !library.folders.some((folder) => folder.id === folderId)) {
      setFolderId('all')
      setSort((prev) => (prev === 'manual' ? 'recent' : prev))
    }
  }, [loaded, folderId, library.folders])

  const list = useMemo(
    () => deriveBookmarkList(library, { query, folderId, domain, view, sort }),
    [library, query, folderId, domain, view, sort],
  )
  const domains = useMemo(() => topBookmarkDomains(list.scopeRows), [list.scopeRows])
  const trail = useMemo(
    () => (list.current ? folderTrail(library.folders, list.current.id) : []),
    [library.folders, list.current],
  )
  const defaultFolderId =
    list.current?.id ?? library.folders.find((folder) => !folder.editable)?.id ?? '1'

  const filtersActive =
    query.trim() !== '' || folderId !== 'all' || domain !== 'all' || view !== 'all'
  const nothingToShow = list.rows.length === 0 && list.subfolders.length === 0

  const resetFilters = () => {
    setQuery('')
    setFolderId('all')
    setDomain('all')
    setView('all')
    setSort('recent')
  }

  const selectFolder = (id: string | 'all') => {
    setSort((prev) =>
      id === 'all' ? (prev === 'manual' ? 'recent' : prev) : folderId === 'all' ? 'manual' : prev,
    )
    setFolderId(id)
  }

  const flashRow = (id: string) => {
    clearTimeout(highlightTimer.current)
    setHighlightId(id)
    highlightTimer.current = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS)
  }

  const attempt = async (task: () => Promise<unknown>, successKey?: string, undo?: () => void) => {
    try {
      await task()
      if (successKey) showToast(t(successKey), undo ? { undo } : undefined)
    } catch {
      showToast(t('bookmarks.actionFailed'), { variant: 'error' })
    } finally {
      scheduleReload()
    }
  }

  const copyText = (text: string, successKey: string) =>
    void navigator.clipboard.writeText(text).then(
      () => showToast(t(successKey)),
      () => showToast(t('bookmarks.copyFailed'), { variant: 'error' }),
    )

  const download = (text: string, mime: string, ext: string) => {
    downloadBlob(
      new Blob([text], { type: mime }),
      `bookmarks-${new Date().toISOString().slice(0, 10)}.${ext}`,
    )
    showToast(t('bookmarks.copied'))
  }

  const openBatch = () => {
    const batch = list.rows.slice(0, OPEN_BATCH_LIMIT)
    batch.forEach((row) => void chrome.tabs.create({ url: row.url, active: false }))
    showToast(t('bookmarks.openedBatch', { count: batch.length }))
  }

  const startBookmarkDraft = (seed?: { title: string; url: string }) =>
    setBookmarkDraft({
      key: crypto.randomUUID(),
      mode: 'create',
      title: seed?.title ?? '',
      url: seed?.url ?? 'https://',
      parentId: defaultFolderId,
    })

  const startTabDraft = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.url || !/^https?:/i.test(tab.url)) {
      showToast(t('bookmarks.noActiveTab'), { variant: 'error' })
      return
    }
    startBookmarkDraft({ title: tab.title || tab.url, url: tab.url })
  }

  const editRow = (row: BookmarkRow) =>
    setBookmarkDraft({
      key: row.id,
      mode: 'edit',
      row,
      title: row.title,
      url: row.url,
      parentId: row.parentId ?? defaultFolderId,
    })

  const submitBookmark = (values: BookmarkFormValues, draft: BookmarkDraft) => {
    setBookmarkDraft(null)
    const { row } = draft
    if (draft.mode === 'edit' && row) {
      void attempt(async () => {
        await updateBookmark(row.id, { title: values.title, url: values.url })
        if (values.parentId !== row.parentId)
          await moveBookmark(row.id, { parentId: values.parentId })
        flashRow(row.id)
      }, 'bookmarks.updated')
      return
    }
    void attempt(
      () => createBookmark(values.parentId, values.title, values.url),
      'bookmarks.created',
    )
  }

  const deleteRow = (row: BookmarkRow) =>
    void attempt(
      () => removeBookmark(row.id),
      'bookmarks.deleted',
      () =>
        void attempt(
          () => createBookmark(row.parentId ?? defaultFolderId, row.title, row.url, row.index),
          'bookmarks.restored',
        ),
    )

  const submitFolder = (name: string, parentId: string, draft: FolderDraft) => {
    setFolderDraft(null)
    if (draft.mode === 'rename' && draft.folder) {
      void attempt(() => renameFolder(draft.folder!.id, name), 'bookmarks.folderRenamed')
      return
    }
    void attempt(() => createFolder(parentId, name), 'bookmarks.folderCreated')
  }

  const confirmDeleteFolder = () => {
    const folder = folderToDelete
    if (!folder) return
    if (folderId === folder.id)
      selectFolder(folder.parentId && folder.parentId !== '0' ? folder.parentId : 'all')
    void attempt(() => removeFolder(folder.id), 'bookmarks.folderDeleted')
  }

  const commitReorder = (movedId: string, orderedIds: string[]) => {
    const parent = list.current
    const from = list.rows.findIndex((row) => row.id === movedId)
    const to = orderedIds.indexOf(movedId)
    if (!parent || from < 0 || to < 0 || from === to) return
    const targetIndex = list.rows[to].index ?? to
    const fromIndex = list.rows[from].index ?? from
    void attempt(
      () =>
        moveBookmark(movedId, {
          parentId: parent.id,
          index: chromeMoveIndex(fromIndex, targetIndex, true),
        }),
      'bookmarks.moved',
    )
    flashRow(movedId)
  }

  const moveBy = (row: BookmarkRow, delta: -1 | 1) => {
    const ids = list.rows.map((item) => item.id)
    const from = ids.indexOf(row.id)
    const to = from + delta
    if (to < 0 || to >= ids.length) return
    const next = [...ids]
    next.splice(to, 0, ...next.splice(from, 1))
    commitReorder(row.id, next)
  }

  const rowActions = (row: BookmarkRow, index: number) => ({
    onOpen: () => void chrome.tabs.create({ url: row.url, active: true }),
    onCopyUrl: () => copyText(row.url, 'bookmarks.copied'),
    onCopyMarkdown: () => copyText(exportBookmarksMarkdown([row]), 'bookmarks.markdownCopied'),
    onEdit: () => editRow(row),
    onDelete: () => deleteRow(row),
    onMoveUp: list.reorderable && index > 0 ? () => moveBy(row, -1) : undefined,
    onMoveDown: list.reorderable && index < list.rows.length - 1 ? () => moveBy(row, 1) : undefined,
  })

  const statusLabel =
    list.rows.length === library.rows.length
      ? t('bookmarks.summary', { count: list.rows.length })
      : t('bookmarks.summaryFiltered', { visible: list.rows.length, total: library.rows.length })

  return (
    <ToolPage tool={tool} contentClassName="overflow-hidden p-0">
      <PermissionNotice
        active
        permissions={['bookmarks']}
        origins={[]}
        message={t('bookmarks.permission')}
      />

      <ToolSearchLayout
        header={
          <>
            <div className="flex items-center gap-1.5">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder={t('bookmarks.search')}
                ariaLabel={t('bookmarks.search')}
                shortcut="/"
                className="min-w-0 flex-1"
              />
              <AddMenu
                disabled={granted !== true}
                onNewBookmark={() => startBookmarkDraft()}
                onBookmarkTab={() => void startTabDraft()}
                onNewFolder={() =>
                  setFolderDraft({
                    key: crypto.randomUUID(),
                    mode: 'create',
                    name: '',
                    parentId: defaultFolderId,
                  })
                }
              />
              <MoreMenu
                rows={list.rows}
                loading={loading}
                onRefresh={() => void load()}
                onCopy={copyText}
                onDownload={download}
                onOpenBatch={openBatch}
              />
            </div>

            <BookmarkFilters
              folders={library.folders}
              folderId={folderId}
              onFolderChange={selectFolder}
              domains={domains}
              domain={domain}
              onDomainChange={setDomain}
              view={view}
              onViewChange={setView}
              duplicateCount={list.duplicates.size}
              sort={sort}
              onSortChange={setSort}
              canSortManually={Boolean(list.current)}
            />

            {list.current && (
              <BookmarkBreadcrumb
                trail={trail}
                onNavigate={selectFolder}
                onAddFolder={() =>
                  setFolderDraft({
                    key: crypto.randomUUID(),
                    mode: 'create',
                    name: '',
                    parentId: list.current?.id ?? defaultFolderId,
                  })
                }
              />
            )}

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              >
                {error}
              </p>
            )}
          </>
        }
        footer={
          <ProductivityStatusBar
            trailing={
              list.reorderable ? (
                <span className="hidden text-[10.5px] @[560px]:inline">
                  {t('bookmarks.reorderHint')}
                </span>
              ) : filtersActive ? (
                <Button
                  size="xs"
                  variant="ghost"
                  className="h-6 px-2 text-primary"
                  onClick={resetFilters}
                >
                  {t('bookmarks.clearFilters')}
                </Button>
              ) : undefined
            }
          >
            {statusLabel}
          </ProductivityStatusBar>
        }
        bodyClassName="pb-3 pt-2"
      >
        {!loaded ? (
          <ul className="space-y-1.5" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="h-14 animate-pulse rounded-xl border bg-muted/40" />
            ))}
          </ul>
        ) : nothingToShow ? (
          <EmptyList
            browsing={list.browsing && !filtersActive}
            inFolder={list.browsing}
            onReset={resetFilters}
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            <AnimatePresence initial={false}>
              {list.subfolders.map((folder) => (
                <BookmarkFolderRow
                  key={folder.id}
                  folder={folder}
                  onOpen={(target) => selectFolder(target.id)}
                  onRename={(target) =>
                    setFolderDraft({
                      key: target.id,
                      mode: 'rename',
                      folder: target,
                      name: target.title,
                      parentId: target.parentId ?? defaultFolderId,
                    })
                  }
                  onDelete={setFolderToDelete}
                />
              ))}
            </AnimatePresence>
            {list.reorderable ? (
              <ReorderableRows
                rows={list.rows}
                onCommit={commitReorder}
                renderRow={(row, index, commit) => (
                  <BookmarkResultRow
                    key={row.id}
                    row={row}
                    reorderable
                    onDragEnd={commit}
                    highlighted={highlightId === row.id}
                    duplicate={list.duplicates.has(row.id)}
                    {...rowActions(row, index)}
                  />
                )}
              />
            ) : (
              <AnimatePresence initial={false}>
                {list.rows.map((row, index) => (
                  <BookmarkResultRow
                    key={row.id}
                    row={row}
                    showFolder={!list.browsing}
                    highlighted={highlightId === row.id}
                    duplicate={list.duplicates.has(row.id)}
                    {...rowActions(row, index)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        )}
      </ToolSearchLayout>

      <BookmarkFormDialog
        draft={bookmarkDraft}
        folders={library.folders}
        onClose={() => setBookmarkDraft(null)}
        onSubmit={submitBookmark}
      />
      <FolderFormDialog
        draft={folderDraft}
        folders={library.folders}
        onClose={() => setFolderDraft(null)}
        onSubmit={submitFolder}
      />
      <ConfirmDialog
        open={Boolean(folderToDelete)}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
        title={t('bookmarks.deleteFolderTitle', { name: folderToDelete?.title ?? '' })}
        description={t('bookmarks.deleteFolderBody', { count: folderToDelete?.count ?? 0 })}
        confirmLabel={t('bookmarks.deleteFolderConfirm')}
        destructive
        onConfirm={confirmDeleteFolder}
      />
    </ToolPage>
  )
}

function EmptyList({
  browsing,
  inFolder,
  onReset,
}: {
  browsing: boolean
  inFolder: boolean
  onReset: () => void
}) {
  const { t } = useTranslation()
  const Icon = inFolder ? FolderOpenIcon : SearchIcon
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="size-6 text-primary" aria-hidden />
      </span>
      <p className="text-sm font-semibold">
        {browsing ? t('bookmarks.folderEmpty') : t('bookmarks.emptyTitle')}
      </p>
      <p className="max-w-xs text-xs text-muted-foreground">
        {browsing ? t('bookmarks.folderEmptyHint') : t('bookmarks.emptyHint')}
      </p>
      {!browsing && (
        <Button size="sm" variant="outline" className="mt-1" onClick={onReset}>
          {t('bookmarks.clearFilters')}
        </Button>
      )}
    </div>
  )
}
