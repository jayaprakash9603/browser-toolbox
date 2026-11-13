import { duplicateBookmarkIds } from '@/tools/productivity/bookmarks/service'
import type { BookmarkLibrary, BookmarkRow } from '@/tools/productivity/bookmarks/service'

import { suggestCollectionId, suggestTagNames } from './classify'
import { itemMeta, type BookmarkWorkspace } from './model'
import { canonicalizeBookmarkUrl } from './urls'

export type OrganizeKind = 'collection' | 'tag' | 'uncategorized' | 'duplicate' | 'obsolete'

export interface OrganizeSuggestion {
  id: string
  kind: OrganizeKind
  bookmarkId: string
  collectionId?: string
  tags?: string[]
  reason: string
}

const STALE_MS = 365 * 24 * 60 * 60 * 1000

export function collectionSuggestions(
  library: BookmarkLibrary,
  workspace: BookmarkWorkspace,
): OrganizeSuggestion[] {
  const next: OrganizeSuggestion[] = []
  for (const row of library.rows) {
    const meta = itemMeta(workspace, row.id)
    if (meta.collectionIds.length) continue
    const collectionId = suggestCollectionId(row, workspace)
    next.push({
      id: `collection:${row.id}`,
      kind: 'collection',
      bookmarkId: row.id,
      collectionId,
      reason: collectionId,
    })
  }
  return next
}

export function tagSuggestions(
  library: BookmarkLibrary,
  workspace: BookmarkWorkspace,
): OrganizeSuggestion[] {
  const next: OrganizeSuggestion[] = []
  for (const row of library.rows) {
    if (itemMeta(workspace, row.id).tagIds.length) continue
    const tags = suggestTagNames(row)
    if (!tags.length) continue
    next.push({ id: `tag:${row.id}`, kind: 'tag', bookmarkId: row.id, tags, reason: tags.join(', ') })
  }
  return next
}

export function uncategorizedSuggestions(library: BookmarkLibrary, workspace: BookmarkWorkspace) {
  return library.rows
    .filter((row) => itemMeta(workspace, row.id).collectionIds.length === 0)
    .map((row) => ({
      id: `uncategorized:${row.id}`,
      kind: 'uncategorized' as const,
      bookmarkId: row.id,
      reason: row.folderPath,
    }))
}

export function duplicateSuggestions(library: BookmarkLibrary): OrganizeSuggestion[] {
  const ids = duplicateBookmarkIds(library.rows)
  return library.rows
    .filter((row) => ids.has(row.id))
    .map((row) => ({
      id: `duplicate:${row.id}`,
      kind: 'duplicate' as const,
      bookmarkId: row.id,
      reason: canonicalizeBookmarkUrl(row.url),
    }))
}

export function obsoleteSuggestions(library: BookmarkLibrary, now = Date.now()): OrganizeSuggestion[] {
  return library.rows
    .filter((row) => (row.dateAdded ?? now) < now - STALE_MS)
    .map((row) => ({
      id: `obsolete:${row.id}`,
      kind: 'obsolete' as const,
      bookmarkId: row.id,
      reason: 'stale',
    }))
}

export function organizePreview(
  library: BookmarkLibrary,
  workspace: BookmarkWorkspace,
  now = Date.now(),
): OrganizeSuggestion[] {
  return [
    ...collectionSuggestions(library, workspace),
    ...tagSuggestions(library, workspace),
    ...duplicateSuggestions(library),
    ...obsoleteSuggestions(library, now),
  ]
}

export function rowById(library: BookmarkLibrary, id: string): BookmarkRow | undefined {
  return library.rows.find((row) => row.id === id)
}
