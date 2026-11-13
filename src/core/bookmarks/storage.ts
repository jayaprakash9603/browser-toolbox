import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

import { seededCollections } from './defaults'
import {
  BOOKMARK_WORKSPACE_VERSION,
  emptyWorkspace,
  type BookmarkItemMeta,
  type BookmarkWorkspace,
  type BookmarkWorkspacePrefs,
} from './model'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asRecord<T>(value: unknown): Record<string, T> {
  return isRecord(value) ? (value as Record<string, T>) : {}
}

export function parseBookmarkWorkspace(raw: unknown): BookmarkWorkspace {
  const base = emptyWorkspace()
  if (!isRecord(raw)) {
    return { ...base, collections: seededCollections() }
  }
  const collections = asRecord<BookmarkWorkspace['collections'][string]>(raw.collections)
  return {
    version: BOOKMARK_WORKSPACE_VERSION,
    tags: asRecord(raw.tags),
    collections: Object.keys(collections).length ? collections : seededCollections(),
    projects: asRecord(raw.projects),
    items: asRecord(raw.items),
    health: asRecord(raw.health),
    prefs: { ...base.prefs, ...(isRecord(raw.prefs) ? raw.prefs : {}) } as BookmarkWorkspacePrefs,
  }
}

export async function loadBookmarkWorkspace(): Promise<BookmarkWorkspace> {
  const stored = await get<unknown>(STORAGE_KEYS.bookmarkWorkspace)
  const workspace = parseBookmarkWorkspace(stored)
  if (!stored) await saveBookmarkWorkspace(workspace)
  return workspace
}

export async function saveBookmarkWorkspace(workspace: BookmarkWorkspace): Promise<void> {
  await set(STORAGE_KEYS.bookmarkWorkspace, workspace)
}

export async function patchBookmarkWorkspace(
  mutate: (workspace: BookmarkWorkspace) => BookmarkWorkspace,
): Promise<BookmarkWorkspace> {
  const next = mutate(await loadBookmarkWorkspace())
  await saveBookmarkWorkspace(next)
  return next
}

export function upsertItem(
  workspace: BookmarkWorkspace,
  bookmarkId: string,
  patch: Partial<BookmarkItemMeta>,
): BookmarkWorkspace {
  const current = workspace.items[bookmarkId] ?? {
    tagIds: [],
    collectionIds: [],
    projectIds: [],
    favorite: false,
    priority: 'normal' as const,
    notes: '',
    description: '',
    snippets: [],
    labels: [],
    accessCount: 0,
  }
  return {
    ...workspace,
    items: { ...workspace.items, [bookmarkId]: { ...current, ...patch } },
  }
}
