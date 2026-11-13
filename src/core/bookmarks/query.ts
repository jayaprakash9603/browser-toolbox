import type { BookmarkLibrary, BookmarkRow } from '@/tools/productivity/bookmarks/service'

import { canonicalizeBookmarkUrl, hostnameOf } from './urls'
import {
  itemMeta,
  type BookmarkFilterChip,
  type BookmarkNavId,
  type BookmarkWorkspace,
  type HealthKind,
  type ReadingStatus,
} from './model'

const RECENT_MS = 7 * 24 * 60 * 60 * 1000
const RECENT_30D_MS = 30 * 24 * 60 * 60 * 1000

export interface BookmarkQueryState {
  query: string
  nav: BookmarkNavId
  folderId: string | 'all'
  domain: string | 'all'
  collectionId: string | 'all'
  projectId: string | 'all'
  tagIds: string[]
  readingStatus: ReadingStatus | 'all'
  chips: BookmarkFilterChip[]
}

export interface BookmarkStats {
  bookmarks: number
  folders: number
  uncategorized: number
  favorites: number
  unread: number
  duplicates: number
  broken: number
  recent: number
}

export function haystackFor(
  row: BookmarkRow,
  workspace: BookmarkWorkspace,
): string {
  const meta = itemMeta(workspace, row.id)
  const tags = meta.tagIds.map((id) => workspace.tags[id]?.name ?? '').join(' ')
  const collections = meta.collectionIds
    .map((id) => workspace.collections[id]?.name ?? '')
    .join(' ')
  return [
    row.title,
    row.url,
    hostnameOf(row.url),
    row.folderPath,
    collections,
    tags,
    meta.notes,
    meta.description,
    meta.labels.join(' '),
    meta.snippets.join(' '),
  ]
    .join('\n')
    .toLowerCase()
}

export function matchesQuery(
  row: BookmarkRow,
  workspace: BookmarkWorkspace,
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return haystackFor(row, workspace).includes(q)
}

function hasChip(chips: readonly BookmarkFilterChip[], chip: BookmarkFilterChip): boolean {
  return chips.includes(chip)
}

function matchesChips(
  row: BookmarkRow,
  workspace: BookmarkWorkspace,
  chips: readonly BookmarkFilterChip[],
  duplicateIds: ReadonlySet<string>,
  now: number,
): boolean {
  const meta = itemMeta(workspace, row.id)
  const health = workspace.health[canonicalizeBookmarkUrl(row.url)]
  if (hasChip(chips, 'favorites') && !meta.favorite) return false
  if (hasChip(chips, 'recent') && (row.dateAdded ?? 0) < now - RECENT_MS) return false
  if (hasChip(chips, 'accessed') && !meta.lastAccessedAt) return false
  if (hasChip(chips, 'unread') && meta.readingStatus !== 'unread') return false
  if (hasChip(chips, 'completed') && meta.readingStatus !== 'completed') return false
  if (hasChip(chips, 'untagged') && meta.tagIds.length > 0) return false
  if (hasChip(chips, 'uncategorized') && meta.collectionIds.length > 0) return false
  if (hasChip(chips, 'broken') && health?.kind !== 'broken') return false
  if (hasChip(chips, 'duplicates') && !duplicateIds.has(row.id)) return false
  return true
}

export function filterWorkspaceRows(
  rows: readonly BookmarkRow[],
  workspace: BookmarkWorkspace,
  state: BookmarkQueryState,
  duplicateIds: ReadonlySet<string>,
  now = Date.now(),
): BookmarkRow[] {
  return rows.filter((row) => {
    if (!matchesQuery(row, workspace, state.query)) return false
    if (state.domain !== 'all' && hostnameOf(row.url) !== state.domain) return false
    const meta = itemMeta(workspace, row.id)
    if (state.nav === 'favorites' && !meta.favorite) return false
    if (state.nav === 'reading' && !meta.readingStatus) return false
    if (state.collectionId !== 'all' && !meta.collectionIds.includes(state.collectionId)) return false
    if (state.projectId !== 'all' && !meta.projectIds.includes(state.projectId)) return false
    if (state.tagIds.some((id) => !meta.tagIds.includes(id))) return false
    if (state.readingStatus !== 'all' && meta.readingStatus !== state.readingStatus) return false
    return matchesChips(row, workspace, state.chips, duplicateIds, now)
  })
}

export function sortByAccess(
  rows: readonly BookmarkRow[],
  workspace: BookmarkWorkspace,
  mode: 'accessed' | 'mostAccessed',
): BookmarkRow[] {
  const next = [...rows]
  if (mode === 'mostAccessed') {
    return next.sort(
      (a, b) => itemMeta(workspace, b.id).accessCount - itemMeta(workspace, a.id).accessCount,
    )
  }
  return next.sort(
    (a, b) =>
      (itemMeta(workspace, b.id).lastAccessedAt ?? 0) -
      (itemMeta(workspace, a.id).lastAccessedAt ?? 0),
  )
}

export function workspaceStats(
  library: BookmarkLibrary,
  workspace: BookmarkWorkspace,
  duplicateIds: ReadonlySet<string>,
  now = Date.now(),
): BookmarkStats {
  let uncategorized = 0
  let favorites = 0
  let unread = 0
  let broken = 0
  let recent = 0
  for (const row of library.rows) {
    const meta = itemMeta(workspace, row.id)
    if (meta.collectionIds.length === 0) uncategorized += 1
    if (meta.favorite) favorites += 1
    if (meta.readingStatus === 'unread') unread += 1
    if (workspace.health[canonicalizeBookmarkUrl(row.url)]?.kind === 'broken') broken += 1
    if ((row.dateAdded ?? 0) >= now - RECENT_MS) recent += 1
  }
  return {
    bookmarks: library.rows.length,
    folders: library.folders.length,
    uncategorized,
    favorites,
    unread,
    duplicates: duplicateIds.size,
    broken,
    recent,
  }
}

export function emptyFolderIds(library: BookmarkLibrary): string[] {
  return library.folders.filter((folder) => folder.count === 0).map((folder) => folder.id)
}

export function missingTitleRows(rows: readonly BookmarkRow[]): BookmarkRow[] {
  return rows.filter((row) => !row.title.trim() || row.title === row.url)
}

export function healthKindOf(
  workspace: BookmarkWorkspace,
  url: string,
): HealthKind | undefined {
  return workspace.health[canonicalizeBookmarkUrl(url)]?.kind
}

export { RECENT_30D_MS }
