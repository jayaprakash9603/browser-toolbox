export const BOOKMARK_WORKSPACE_VERSION = 1
export const BOOKMARKS_TOOL_ID = 'productivity.bookmarks'
export const BOOKMARKS_ROUTE = '/tools/productivity/bookmarks'
export const BOOKMARK_HEALTH_ALARM = 'toolbox.bookmarks.health'
export const BOOKMARK_REMINDER_PREFIX = 'toolbox.bookmarks.reminder.'

export type ReadingStatus = 'unread' | 'reading' | 'completed' | 'archived'
export type ReadingPriority = 'low' | 'normal' | 'high'
export type HealthKind =
  | 'ok'
  | 'redirect'
  | 'broken'
  | 'auth'
  | 'blocked'
  | 'timeout'
  | 'network'
  | 'invalid'
export type BookmarkNavId =
  | 'all'
  | 'collections'
  | 'projects'
  | 'favorites'
  | 'reading'
  | 'tags'
  | 'health'
export type BookmarkDisplayMode = 'visual' | 'compact' | 'detailed' | 'minimal'
export type BookmarkFilterChip =
  | 'favorites'
  | 'recent'
  | 'accessed'
  | 'unread'
  | 'completed'
  | 'untagged'
  | 'uncategorized'
  | 'broken'
  | 'duplicates'

export type CollectionColor =
  | 'indigo'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'sky'
  | 'rose'
  | 'slate'
  | 'teal'

export interface BookmarkTag {
  id: string
  name: string
  color: CollectionColor
}

export interface BookmarkCollection {
  id: string
  name: string
  icon: string
  color: CollectionColor
  bookmarkIds: string[]
  seeded?: boolean
}

export interface BookmarkProject {
  id: string
  name: string
  color: CollectionColor
  bookmarkIds: string[]
  pinnedIds: string[]
}

export interface BookmarkItemMeta {
  tagIds: string[]
  collectionIds: string[]
  projectIds: string[]
  favorite: boolean
  readingStatus?: ReadingStatus
  priority: ReadingPriority
  notes: string
  description: string
  snippets: string[]
  labels: string[]
  reminderAt?: number
  lastReviewedAt?: number
  lastAccessedAt?: number
  accessCount: number
  customOrder?: number
}

export interface BookmarkHealthRecord {
  checkedAt: number
  httpStatus: number | null
  kind: HealthKind
  finalUrl?: string
  error?: string
}

export interface BookmarkWorkspacePrefs {
  nav: BookmarkNavId
  displayMode: BookmarkDisplayMode
  sort: string
  chips: BookmarkFilterChip[]
  healthSchedule: 'off' | 'daily'
  lastHealthScanAt?: number
}

export interface BookmarkWorkspace {
  version: number
  tags: Record<string, BookmarkTag>
  collections: Record<string, BookmarkCollection>
  projects: Record<string, BookmarkProject>
  items: Record<string, BookmarkItemMeta>
  health: Record<string, BookmarkHealthRecord>
  prefs: BookmarkWorkspacePrefs
}

export const EMPTY_ITEM: BookmarkItemMeta = {
  tagIds: [],
  collectionIds: [],
  projectIds: [],
  favorite: false,
  priority: 'normal',
  notes: '',
  description: '',
  snippets: [],
  labels: [],
  accessCount: 0,
}

export const DEFAULT_PREFS: BookmarkWorkspacePrefs = {
  nav: 'all',
  displayMode: 'detailed',
  sort: 'recent',
  chips: [],
  healthSchedule: 'off',
}

export function emptyWorkspace(): BookmarkWorkspace {
  return {
    version: BOOKMARK_WORKSPACE_VERSION,
    tags: {},
    collections: {},
    projects: {},
    items: {},
    health: {},
    prefs: { ...DEFAULT_PREFS },
  }
}

export function itemMeta(
  workspace: BookmarkWorkspace,
  bookmarkId: string,
): BookmarkItemMeta {
  return workspace.items[bookmarkId] ?? EMPTY_ITEM
}
