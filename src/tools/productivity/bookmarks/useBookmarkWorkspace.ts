import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  BOOKMARKS_TOOL_ID,
  applyItemFields,
  assignCollection,
  assignTag,
  buildImportPreview,
  canonicalizeBookmarkUrl,
  createCollection,
  createProject,
  createTag,
  deleteCollection,
  deleteProject,
  deleteTag as removeTag,
  duplicateReviewGroups,
  emptyFolderIds,
  exportNestedBookmarkHtml,
  exportOverlayJson,
  filterWorkspaceRows,
  itemMeta,
  mergeDuplicateMeta,
  mergeTags as combineTags,
  missingTitleRows,
  organizePreview,
  parseBookmarkCsv,
  parseBookmarkJson,
  parseNetscapeHtml,
  recordAccess,
  renameTag as renameTagRecord,
  setReading,
  sortByAccess,
  togglePin,
  updateCollection,
  updateProject,
  upsertItem,
  workspaceStats,
  type BookmarkDisplayMode,
  type BookmarkFilterChip,
  type BookmarkNavId,
  type BookmarkWorkspace,
  type ImportPreview,
  type OrganizeSuggestion,
  type ReadingStatus,
} from '@/core/bookmarks'
import { consumePayload, subscribePayload } from '@/core/payloads'
import { downloadBlob } from '@/features/netmon/download'

import { deriveBookmarkList } from './bookmarkList'
import {
  createBookmark,
  createFolder,
  moveBookmark,
  removeBookmark,
  removeFolder,
  renameFolder,
  updateBookmark,
} from './bookmarkActions'
import { openBookmarkWithThumb } from './captureThumb'
import { OPEN_BATCH_LIMIT } from './BookmarkMenus'
import { scanBookmarkHealth } from './scanHealth'
import { useDebounced } from './useDebounced'
import { useBookmarkSync } from './useBookmarkSync'
import {
  CHROME_SEARCH_FALLBACK,
  chromeMoveIndex,
  exportBookmarksMarkdown,
  folderSubtreeIds,
  folderTrail,
  searchChromeBookmarkIds,
  topBookmarkDomains,
  type BookmarkFolder,
  type BookmarkRow,
  type BookmarkSort,
  type BookmarkView,
} from './service'
import type { BookmarkDraft, BookmarkFormValues, FolderDraft } from './BookmarkDialogs'
import type { NamedDraft } from './NamedDialog'

const HIGHLIGHT_MS = 1400
const EMPTY_HITS = new Set<string>()

export function useBookmarkWorkspace(granted: boolean) {
  const sync = useBookmarkSync(granted)
  const { t, showToast, library, workspace, persist, persistPrefs, scheduleReload, workspaceRef, libraryRef } = sync
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounced(query)
  const [folderId, setFolderId] = useState<string | 'all'>('all')
  const [domain, setDomain] = useState<string | 'all'>('all')
  const [view, setView] = useState<BookmarkView>('all')
  const [sortOverride, setSortOverride] = useState<BookmarkSort | null>(null)
  const [navOverride, setNavOverride] = useState<BookmarkNavId | null>(null)
  const [modeOverride, setModeOverride] = useState<BookmarkDisplayMode | null>(null)
  const [chipsOverride, setChipsOverride] = useState<BookmarkFilterChip[] | null>(null)
  const nav = navOverride ?? workspace.prefs.nav
  const mode = modeOverride ?? workspace.prefs.displayMode
  const sort = sortOverride ?? ((workspace.prefs.sort as BookmarkSort) || 'recent')
  const chips = chipsOverride ?? workspace.prefs.chips
  const [collectionId, setCollectionId] = useState<string | 'all'>('all')
  const [projectId, setProjectId] = useState<string | 'all'>('all')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [readingStatus, setReadingStatus] = useState<ReadingStatus | 'all'>('all')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bookmarkDraft, setBookmarkDraft] = useState<BookmarkDraft | null>(null)
  const [folderDraft, setFolderDraft] = useState<FolderDraft | null>(null)
  const [namedDraft, setNamedDraft] = useState<NamedDraft | null>(null)
  const [folderToDelete, setFolderToDelete] = useState<BookmarkFolder | null>(null)
  const [entityToDelete, setEntityToDelete] = useState<{ kind: 'collection' | 'project'; id: string; name: string } | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importDest, setImportDest] = useState('1')
  const [skipDupes, setSkipDupes] = useState(true)
  const [organizeOpen, setOrganizeOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState({ done: 0, total: 0 })
  const [chromeHits, setChromeHits] = useState<Set<string>>(new Set())
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(highlightTimer.current), [])

  const skipChromeSearch = !debouncedQuery || library.rows.length < CHROME_SEARCH_FALLBACK
  useEffect(() => {
    if (skipChromeSearch) return
    let live = true
    void searchChromeBookmarkIds(debouncedQuery).then((ids) => {
      if (live) setChromeHits(new Set(ids))
    })
    return () => {
      live = false
    }
  }, [debouncedQuery, skipChromeSearch])

  const applyIncoming = useCallback(
    async (title?: string, url?: string, note?: string) => {
      if (!url || !/^https?:/i.test(url)) return
      const rows = libraryRef.current.rows
      const current = workspaceRef.current
      const existing = rows.find((row) => canonicalizeBookmarkUrl(row.url) === canonicalizeBookmarkUrl(url))
      if (existing) {
        if (note) {
          const snippets = [...itemMeta(current, existing.id).snippets, note]
          await persist(upsertItem(current, existing.id, { snippets }), 'bookmarks.notesSaved')
        }
        return
      }
      const parent = libraryRef.current.folders.find((folder) => !folder.editable)?.id ?? '1'
      const created = await createBookmark(parent, title || url, url)
      if (note && created.id) await persist(upsertItem(workspaceRef.current, created.id, { snippets: [note], notes: note }))
    },
    [libraryRef, persist, workspaceRef],
  )

  useEffect(() => {
    if (!granted) return
    void consumePayload(BOOKMARKS_TOOL_ID).then((payload) => {
      if (payload) void applyIncoming(payload.pageTitle, payload.pageUrl ?? payload.linkUrl, payload.text)
    })
    return subscribePayload(BOOKMARKS_TOOL_ID, (payload) => {
      void applyIncoming(payload.pageTitle, payload.pageUrl ?? payload.linkUrl, payload.text)
    })
  }, [applyIncoming, granted])

  const list = useMemo(
    () => deriveBookmarkList(library, { query: debouncedQuery, folderId, domain, view, sort }),
    [library, debouncedQuery, folderId, domain, view, sort],
  )
  const groups = useMemo(() => duplicateReviewGroups(library.rows), [library.rows])
  const overlayRows = useMemo(() => {
    const filtered = filterWorkspaceRows(
      list.rows,
      workspace,
      { query: debouncedQuery, nav, folderId, domain, collectionId, projectId, tagIds, readingStatus, chips },
      list.duplicates,
    )
    const hits = skipChromeSearch ? EMPTY_HITS : chromeHits
    const extras =
      hits.size === 0
        ? []
        : library.rows.filter((row) => hits.has(row.id) && !filtered.some((item) => item.id === row.id))
    const merged = extras.length ? [...filtered, ...extras] : filtered
    if (sort === 'accessed' || sort === 'mostAccessed') return sortByAccess(merged, workspace, sort)
    return merged
  }, [list, workspace, debouncedQuery, nav, folderId, domain, collectionId, projectId, tagIds, readingStatus, chips, sort, chromeHits, library.rows, skipChromeSearch])

  const stats = useMemo(() => workspaceStats(library, workspace, list.duplicates), [library, workspace, list.duplicates])
  const domains = useMemo(() => topBookmarkDomains(list.scopeRows), [list.scopeRows])
  const currentFolder = list.current
  const trail = currentFolder ? folderTrail(library.folders, currentFolder.id) : []
  const defaultFolderId = currentFolder?.id ?? library.folders.find((folder) => !folder.editable)?.id ?? '1'
  const suggestions = useMemo(() => organizePreview(library, workspace), [library, workspace])
  const emptyFolders = useMemo(
    () => library.folders.filter((folder) => emptyFolderIds(library).includes(folder.id)),
    [library],
  )
  const filtersActive =
    query.trim() !== '' || folderId !== 'all' || domain !== 'all' || view !== 'all' || chips.length > 0 || tagIds.length > 0
  const reorderable = list.reorderable && nav === 'all' && chips.length === 0 && collectionId === 'all' && projectId === 'all'

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
    downloadBlob(new Blob([text], { type: mime }), `bookmarks-${new Date().toISOString().slice(0, 10)}.${ext}`)
    showToast(t('bookmarks.copied'))
  }

  const selectFolder = (id: string | 'all') => {
    const nextSort = id === 'all' ? (sort === 'manual' ? 'recent' : sort) : folderId === 'all' ? 'manual' : sort
    setSortOverride(nextSort)
    persistPrefs({ sort: nextSort })
    setFolderId(id)
  }

  const resetFilters = () => {
    setQuery('')
    setFolderId('all')
    setDomain('all')
    setView('all')
    setSortOverride('recent')
    setChipsOverride([])
    setTagIds([])
    setCollectionId('all')
    setProjectId('all')
    setReadingStatus('all')
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

  const overlayFromForm = (id: string, values: BookmarkFormValues) =>
    applyItemFields(workspaceRef.current, id, {
      notes: values.notes,
      description: values.description,
      tagIds: values.tagIds,
      collectionIds: values.collectionIds,
      readingStatus: values.readingStatus || undefined,
      priority: values.priority,
      reminderAt: values.reminderAt ? new Date(values.reminderAt).getTime() : undefined,
    })

  const submitBookmark = (values: BookmarkFormValues, draft: BookmarkDraft) => {
    setBookmarkDraft(null)
    if (draft.mode === 'edit' && draft.row) {
      void attempt(async () => {
        await updateBookmark(draft.row!.id, { title: values.title, url: values.url })
        if (values.parentId !== draft.row!.parentId) await moveBookmark(draft.row!.id, { parentId: values.parentId })
        await persist(overlayFromForm(draft.row!.id, values))
        flashRow(draft.row!.id)
      }, 'bookmarks.updated')
      return
    }
    void attempt(async () => {
      const created = await createBookmark(values.parentId, values.title, values.url)
      if (created.id) await persist(overlayFromForm(created.id, values))
    }, 'bookmarks.created')
  }

  const deleteRow = (row: BookmarkRow) =>
    void attempt(
      () => removeBookmark(row.id),
      'bookmarks.deleted',
      () => void attempt(() => createBookmark(row.parentId ?? defaultFolderId, row.title, row.url, row.index), 'bookmarks.restored'),
    )

  const openRow = (row: BookmarkRow) => {
    void persist(recordAccess(workspaceRef.current, row.id))
    void openBookmarkWithThumb(row.id, row.url)
  }

  const commitReorder = (movedId: string, orderedIds: string[]) => {
    const parent = list.current
    const from = overlayRows.findIndex((row) => row.id === movedId)
    const to = orderedIds.indexOf(movedId)
    if (!parent || from < 0 || to < 0 || from === to) return
    const targetIndex = overlayRows[to].index ?? to
    const fromIndex = overlayRows[from].index ?? from
    void attempt(
      () => moveBookmark(movedId, { parentId: parent.id, index: chromeMoveIndex(fromIndex, targetIndex, true) }),
      'bookmarks.moved',
    )
    flashRow(movedId)
  }

  const createTagAndReturnId = (name: string) => {
    const before = new Set(Object.keys(workspaceRef.current.tags))
    const next = createTag(workspaceRef.current, name, 'indigo')
    const id = Object.keys(next.tags).find((key) => !before.has(key)) ?? ''
    void persist(next, 'bookmarks.tag.created')
    return id
  }

  const runScan = async (rows: readonly BookmarkRow[]) => {
    setScanning(true)
    try {
      const health = await scanBookmarkHealth(rows, workspaceRef.current.health, (done, total) => setScanProgress({ done, total }))
      await persist({
        ...workspaceRef.current,
        health,
        prefs: { ...workspaceRef.current.prefs, lastHealthScanAt: Date.now() },
      })
    } catch (cause) {
      showToast(t(cause instanceof Error && cause.message === 'host-denied' ? 'bookmarks.hostDenied' : 'bookmarks.actionFailed'), {
        variant: 'error',
      })
    } finally {
      setScanning(false)
    }
  }

  const applyOrganize = async (items: OrganizeSuggestion[]) => {
    let next = workspaceRef.current
    for (const item of items) next = applyOrganizeItem(next, item)
    setOrganizeOpen(false)
    await persist(next, 'bookmarks.organize.applied', { count: items.length })
  }

  const importFile = async (file: File) => {
    try {
      const text = await file.text()
      const rows = file.name.endsWith('.csv')
        ? parseBookmarkCsv(text)
        : file.name.endsWith('.json')
          ? parseBookmarkJson(JSON.parse(text))
          : parseNetscapeHtml(text)
      if (!rows.length) {
        showToast(t('bookmarks.import.empty'), { variant: 'error' })
        return
      }
      setImportDest(defaultFolderId)
      setImportPreview(buildImportPreview(rows, library.rows))
    } catch {
      showToast(t('bookmarks.import.failed'), { variant: 'error' })
    }
  }

  const confirmImport = async () => {
    if (!importPreview) return
    const count = await importChosen(importPreview, importDest, skipDupes, library.rows, persist, workspaceRef)
    setImportPreview(null)
    showToast(t('bookmarks.import.done', { count }))
    scheduleReload()
  }

  const pickFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.html,.json,.csv,text/html,application/json,text/csv'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) void importFile(file)
    }
    input.click()
  }

  return {
    t,
    library,
    workspace,
    loaded: sync.loaded,
    loading: sync.loading,
    error: sync.error,
    query,
    setQuery,
    folderId,
    domain,
    setDomain,
    view,
    setView,
    sort,
    setSort: (value: BookmarkSort) => {
      setSortOverride(value)
      persistPrefs({ sort: value })
    },
    nav,
    setNav: (value: BookmarkNavId) => {
      setNavOverride(value)
      persistPrefs({ nav: value })
      setCollectionId('all')
      setProjectId('all')
    },
    mode,
    setMode: (value: BookmarkDisplayMode) => {
      setModeOverride(value)
      persistPrefs({ displayMode: value })
    },
    chips,
    toggleChip: (chip: BookmarkFilterChip) => {
      const next = chips.includes(chip) ? chips.filter((item) => item !== chip) : [...chips, chip]
      setChipsOverride(next)
      persistPrefs({ chips: next })
    },
    collectionId,
    setCollectionId,
    projectId,
    setProjectId,
    tagIds,
    setTagIds,
    readingStatus,
    setReadingStatus,
    highlightId,
    selected,
    setSelected,
    bookmarkDraft,
    folderDraft,
    namedDraft,
    folderToDelete,
    entityToDelete,
    setEntityToDelete,
    importPreview,
    importDest,
    skipDupes,
    organizeOpen,
    scanning,
    scanProgress,
    list,
    overlayRows,
    stats,
    domains,
    trail,
    defaultFolderId,
    suggestions,
    emptyFolders,
    missingTitles: missingTitleRows(library.rows),
    groups,
    filtersActive,
    reorderable,
    resetFilters,
    selectFolder,
    load: sync.load,
    copyText,
    download,
    openBatch: () => {
      const batch = overlayRows.slice(0, OPEN_BATCH_LIMIT)
      batch.forEach((row) => void chrome.tabs.create({ url: row.url, active: false }))
      showToast(t('bookmarks.openedBatch', { count: batch.length }))
    },
    startBookmarkDraft,
    startTabDraft,
    editRow: (row: BookmarkRow) =>
      setBookmarkDraft({
        key: row.id,
        mode: 'edit',
        row,
        title: row.title,
        url: row.url,
        parentId: row.parentId ?? defaultFolderId,
      }),
    submitBookmark,
    deleteRow,
    openRow,
    commitReorder,
    moveBy: (row: BookmarkRow, delta: -1 | 1) => {
      const ids = overlayRows.map((item) => item.id)
      const from = ids.indexOf(row.id)
      const to = from + delta
      if (to < 0 || to >= ids.length) return
      const next = [...ids]
      next.splice(to, 0, ...next.splice(from, 1))
      commitReorder(row.id, next)
    },
    setBookmarkDraft,
    setFolderDraft,
    setNamedDraft,
    setFolderToDelete,
    submitFolder: (name: string, parentId: string, draft: FolderDraft) => {
      setFolderDraft(null)
      if (draft.mode === 'rename' && draft.folder) {
        void attempt(() => renameFolder(draft.folder!.id, name), 'bookmarks.folderRenamed')
        return
      }
      if (draft.mode === 'move' && draft.folder) {
        void attempt(() => moveBookmark(draft.folder!.id, { parentId }), 'bookmarks.folderMoved')
        return
      }
      void attempt(() => createFolder(parentId, name), 'bookmarks.folderCreated')
    },
    confirmDeleteFolder: () => {
      const folder = folderToDelete
      if (!folder) return
      if (folderId === folder.id) selectFolder(folder.parentId && folder.parentId !== '0' ? folder.parentId : 'all')
      void attempt(() => removeFolder(folder.id), 'bookmarks.folderDeleted')
    },
    confirmDeleteEntity: () => {
      const entity = entityToDelete
      if (!entity) return
      setEntityToDelete(null)
      if (entity.kind === 'collection') {
        if (collectionId === entity.id) setCollectionId('all')
        void persist(deleteCollection(workspaceRef.current, entity.id), 'bookmarks.collection.deleted')
        return
      }
      if (projectId === entity.id) setProjectId('all')
      void persist(deleteProject(workspaceRef.current, entity.id), 'bookmarks.project.deleted')
    },
    subtreeIds: (id: string) => folderSubtreeIds(library.folders, id),
    persist,
    createTagAndReturnId,
    favorite: (row: BookmarkRow) =>
      void persist(
        upsertItem(workspaceRef.current, row.id, { favorite: !itemMeta(workspaceRef.current, row.id).favorite }),
        'bookmarks.favorited',
      ),
    setReadingStatusFor: (row: BookmarkRow, status: ReadingStatus) =>
      void persist(setReading(workspaceRef.current, row.id, status), 'bookmarks.statusUpdated'),
    assignToCollection: (row: BookmarkRow, id: string, assigned: boolean) =>
      void persist(assignCollection(workspaceRef.current, row.id, id, assigned), 'bookmarks.collection.updated'),
    toggleProjectPin: (row: BookmarkRow) => {
      if (projectId === 'all') return
      void persist(togglePin(workspaceRef.current, projectId, row.id), 'bookmarks.project.updated')
    },
    submitNamed: (draft: NamedDraft) => {
      setNamedDraft(null)
      void persist(namedWorkspace(workspaceRef.current, draft), draft.id ? `bookmarks.${draft.kind}.updated` : `bookmarks.${draft.kind}.created`)
    },
    renameTag: (id: string, name: string) => void persist(renameTagRecord(workspaceRef.current, id, name), 'bookmarks.tag.renamed'),
    mergeTags: (keep: string, drop: string) => void persist(combineTags(workspaceRef.current, keep, drop), 'bookmarks.tag.merged'),
    deleteTag: (id: string) => void persist(removeTag(workspaceRef.current, id), 'bookmarks.tag.deleted'),
    bulkTag: (tagId: string) => {
      let next = workspaceRef.current
      for (const id of selected) next = assignTag(next, id, tagId, true)
      void persist(next, 'bookmarks.tag.created')
    },
    runScan,
    setOrganizeOpen,
    applyOrganize,
    pickFile,
    importPreviewSet: setImportPreview,
    setImportDest,
    setSkipDupes,
    confirmImport,
    keepDuplicate: async (_keeper: BookmarkRow, drop: BookmarkRow[]) => {
      for (const row of drop) await removeBookmark(row.id)
      showToast(t('bookmarks.dupes.merged'))
      scheduleReload()
    },
    mergeDuplicate: async (keeper: BookmarkRow, drop: BookmarkRow[]) => {
      let next = workspaceRef.current
      for (const row of drop) {
        next = mergeDuplicateMeta(next, keeper.id, row.id)
        await removeBookmark(row.id)
      }
      await persist(next, 'bookmarks.dupes.merged')
      scheduleReload()
    },
    keepBoth: () => showToast(t('bookmarks.dupes.kept')),
    exportNested: () => download(exportNestedBookmarkHtml(library), 'text/html', 'html'),
    exportOverlay: () => download(exportOverlayJson({ library, workspace }), 'application/json', 'json'),
    toggleSchedule: (on: boolean) =>
      void persist({
        ...workspaceRef.current,
        prefs: { ...workspaceRef.current.prefs, healthSchedule: on ? 'daily' : 'off' },
      }),
    markdown: (row: BookmarkRow) => exportBookmarksMarkdown([row]),
  }
}

function namedWorkspace(workspace: BookmarkWorkspace, draft: NamedDraft): BookmarkWorkspace {
  if (draft.kind === 'collection') {
    return draft.id
      ? updateCollection(workspace, draft.id, { name: draft.name, icon: draft.icon, color: draft.color })
      : createCollection(workspace, draft.name, draft.icon, draft.color)
  }
  return draft.id
    ? updateProject(workspace, draft.id, { name: draft.name, color: draft.color })
    : createProject(workspace, draft.name, draft.color)
}

function applyOrganizeItem(workspace: BookmarkWorkspace, item: OrganizeSuggestion): BookmarkWorkspace {
  if (item.kind === 'collection' && item.collectionId) {
    return assignCollection(workspace, item.bookmarkId, item.collectionId, true)
  }
  if (item.kind !== 'tag' || !item.tags) return workspace
  let next = workspace
  for (const name of item.tags) {
    let tag = Object.values(next.tags).find((entry) => entry.name.toLowerCase() === name.toLowerCase())
    if (!tag) {
      next = createTag(next, name, 'slate')
      tag = Object.values(next.tags).find((entry) => entry.name.toLowerCase() === name.toLowerCase())
    }
    if (tag) next = assignTag(next, item.bookmarkId, tag.id, true)
  }
  return next
}

async function importChosen(
  preview: ImportPreview,
  dest: string,
  skipDupes: boolean,
  existing: readonly BookmarkRow[],
  persist: (next: BookmarkWorkspace, message?: string) => Promise<void>,
  workspaceRef: { current: BookmarkWorkspace },
): Promise<number> {
  const known = new Set(existing.map((row) => canonicalizeBookmarkUrl(row.url)))
  const chosen = preview.bookmarks.filter((_, index) => preview.selected[index])
  let count = 0
  let next = workspaceRef.current
  for (const bookmark of chosen) {
    if (skipDupes && known.has(canonicalizeBookmarkUrl(bookmark.url))) continue
    const created = await createBookmark(dest, bookmark.title, bookmark.url)
    count += 1
    if (!created.id) continue
    next = overlayImported(next, created.id, bookmark.notes, bookmark.tags)
  }
  if (next !== workspaceRef.current) await persist(next)
  return count
}

function overlayImported(
  workspace: BookmarkWorkspace,
  bookmarkId: string,
  notes: string,
  tags: string[],
): BookmarkWorkspace {
  let next = notes ? upsertItem(workspace, bookmarkId, { notes }) : workspace
  for (const name of tags) {
    let tag = Object.values(next.tags).find((entry) => entry.name.toLowerCase() === name.toLowerCase())
    if (!tag) {
      next = createTag(next, name, 'indigo')
      tag = Object.values(next.tags).find((entry) => entry.name.toLowerCase() === name.toLowerCase())
    }
    if (tag) next = assignTag(next, bookmarkId, tag.id, true)
  }
  return next
}
