import { EMPTY_ITEM, itemMeta, type BookmarkCollection, type BookmarkItemMeta, type BookmarkProject, type BookmarkTag, type BookmarkWorkspace, type CollectionColor, type ReadingStatus } from './model'
import { upsertItem } from './storage'
import { mergeIdLists, mergeNotes } from './undo'

function nextId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

export function createTag(workspace: BookmarkWorkspace, name: string, color: CollectionColor): BookmarkWorkspace {
  const id = nextId('tag')
  const tag: BookmarkTag = { id, name: name.trim(), color }
  return { ...workspace, tags: { ...workspace.tags, [id]: tag } }
}

export function renameTag(workspace: BookmarkWorkspace, id: string, name: string): BookmarkWorkspace {
  const tag = workspace.tags[id]
  if (!tag) return workspace
  return { ...workspace, tags: { ...workspace.tags, [id]: { ...tag, name: name.trim() } } }
}

export function deleteTag(workspace: BookmarkWorkspace, id: string): BookmarkWorkspace {
  const tags = { ...workspace.tags }
  delete tags[id]
  const items = { ...workspace.items }
  for (const [bookmarkId, item] of Object.entries(items)) {
    items[bookmarkId] = { ...item, tagIds: item.tagIds.filter((tagId) => tagId !== id) }
  }
  return { ...workspace, tags, items }
}

export function mergeTags(workspace: BookmarkWorkspace, keepId: string, dropId: string): BookmarkWorkspace {
  if (keepId === dropId || !workspace.tags[keepId] || !workspace.tags[dropId]) return workspace
  const items = { ...workspace.items }
  for (const [bookmarkId, item] of Object.entries(items)) {
    const tagIds = item.tagIds.includes(dropId)
      ? mergeIdLists(item.tagIds.filter((id) => id !== dropId), [keepId])
      : item.tagIds
    items[bookmarkId] = { ...item, tagIds }
  }
  const tags = { ...workspace.tags }
  delete tags[dropId]
  return { ...workspace, tags, items }
}

export function createCollection(
  workspace: BookmarkWorkspace,
  name: string,
  icon: string,
  color: CollectionColor,
): BookmarkWorkspace {
  const id = nextId('col')
  const collection: BookmarkCollection = { id, name: name.trim(), icon, color, bookmarkIds: [] }
  return { ...workspace, collections: { ...workspace.collections, [id]: collection } }
}

export function updateCollection(
  workspace: BookmarkWorkspace,
  id: string,
  patch: Partial<Pick<BookmarkCollection, 'name' | 'icon' | 'color'>>,
): BookmarkWorkspace {
  const collection = workspace.collections[id]
  if (!collection) return workspace
  return { ...workspace, collections: { ...workspace.collections, [id]: { ...collection, ...patch } } }
}

export function deleteCollection(workspace: BookmarkWorkspace, id: string): BookmarkWorkspace {
  const collections = { ...workspace.collections }
  delete collections[id]
  const items = { ...workspace.items }
  for (const [bookmarkId, item] of Object.entries(items)) {
    items[bookmarkId] = { ...item, collectionIds: item.collectionIds.filter((cid) => cid !== id) }
  }
  return { ...workspace, collections, items }
}

export function assignCollection(
  workspace: BookmarkWorkspace,
  bookmarkId: string,
  collectionId: string,
  assigned: boolean,
): BookmarkWorkspace {
  const collection = workspace.collections[collectionId]
  if (!collection) return workspace
  const bookmarkIds = assigned
    ? mergeIdLists(collection.bookmarkIds, [bookmarkId])
    : collection.bookmarkIds.filter((id) => id !== bookmarkId)
  const meta = itemMeta(workspace, bookmarkId)
  const collectionIds = assigned
    ? mergeIdLists(meta.collectionIds, [collectionId])
    : meta.collectionIds.filter((id) => id !== collectionId)
  return upsertItem(
    { ...workspace, collections: { ...workspace.collections, [collectionId]: { ...collection, bookmarkIds } } },
    bookmarkId,
    { collectionIds },
  )
}

export function createProject(workspace: BookmarkWorkspace, name: string, color: CollectionColor): BookmarkWorkspace {
  const id = nextId('proj')
  const project: BookmarkProject = { id, name: name.trim(), color, bookmarkIds: [], pinnedIds: [] }
  return { ...workspace, projects: { ...workspace.projects, [id]: project } }
}

export function updateProject(
  workspace: BookmarkWorkspace,
  id: string,
  patch: Partial<Pick<BookmarkProject, 'name' | 'color'>>,
): BookmarkWorkspace {
  const project = workspace.projects[id]
  if (!project) return workspace
  return { ...workspace, projects: { ...workspace.projects, [id]: { ...project, ...patch } } }
}

export function deleteProject(workspace: BookmarkWorkspace, id: string): BookmarkWorkspace {
  const projects = { ...workspace.projects }
  delete projects[id]
  const items = { ...workspace.items }
  for (const [bookmarkId, item] of Object.entries(items)) {
    items[bookmarkId] = { ...item, projectIds: item.projectIds.filter((pid) => pid !== id) }
  }
  return { ...workspace, projects, items }
}

export function assignProject(
  workspace: BookmarkWorkspace,
  bookmarkId: string,
  projectId: string,
  assigned: boolean,
): BookmarkWorkspace {
  const project = workspace.projects[projectId]
  if (!project) return workspace
  const bookmarkIds = assigned
    ? mergeIdLists(project.bookmarkIds, [bookmarkId])
    : project.bookmarkIds.filter((id) => id !== bookmarkId)
  const meta = itemMeta(workspace, bookmarkId)
  const projectIds = assigned
    ? mergeIdLists(meta.projectIds, [projectId])
    : meta.projectIds.filter((id) => id !== projectId)
  return upsertItem(
    { ...workspace, projects: { ...workspace.projects, [projectId]: { ...project, bookmarkIds } } },
    bookmarkId,
    { projectIds },
  )
}

export function togglePin(workspace: BookmarkWorkspace, projectId: string, bookmarkId: string): BookmarkWorkspace {
  const project = workspace.projects[projectId]
  if (!project) return workspace
  const pinnedIds = project.pinnedIds.includes(bookmarkId)
    ? project.pinnedIds.filter((id) => id !== bookmarkId)
    : mergeIdLists(project.pinnedIds, [bookmarkId])
  return { ...workspace, projects: { ...workspace.projects, [projectId]: { ...project, pinnedIds } } }
}

export function setReading(
  workspace: BookmarkWorkspace,
  bookmarkId: string,
  readingStatus: ReadingStatus | undefined,
): BookmarkWorkspace {
  return upsertItem(workspace, bookmarkId, {
    readingStatus,
    lastReviewedAt: Date.now(),
  })
}

export function recordAccess(workspace: BookmarkWorkspace, bookmarkId: string): BookmarkWorkspace {
  const meta = itemMeta(workspace, bookmarkId)
  return upsertItem(workspace, bookmarkId, {
    lastAccessedAt: Date.now(),
    accessCount: meta.accessCount + 1,
  })
}

export function assignTag(
  workspace: BookmarkWorkspace,
  bookmarkId: string,
  tagId: string,
  assigned: boolean,
): BookmarkWorkspace {
  const meta = itemMeta(workspace, bookmarkId)
  const tagIds = assigned
    ? mergeIdLists(meta.tagIds, [tagId])
    : meta.tagIds.filter((id) => id !== tagId)
  return upsertItem(workspace, bookmarkId, { tagIds })
}

export function applyItemFields(
  workspace: BookmarkWorkspace,
  bookmarkId: string,
  patch: Partial<BookmarkItemMeta> & { collectionIds?: string[] },
): BookmarkWorkspace {
  const { collectionIds, ...rest } = patch
  let next = upsertItem(workspace, bookmarkId, rest)
  if (!collectionIds) return next
  for (const collection of Object.values(next.collections)) {
    const want = collectionIds.includes(collection.id)
    const has = collection.bookmarkIds.includes(bookmarkId)
    if (want !== has) next = assignCollection(next, bookmarkId, collection.id, want)
  }
  return next
}

export function mergeDuplicateMeta(
  workspace: BookmarkWorkspace,
  keeperId: string,
  dropId: string,
): BookmarkWorkspace {
  const keeper = itemMeta(workspace, keeperId)
  const drop = workspace.items[dropId] ?? EMPTY_ITEM
  return upsertItem(workspace, keeperId, {
    tagIds: mergeIdLists(keeper.tagIds, drop.tagIds),
    collectionIds: mergeIdLists(keeper.collectionIds, drop.collectionIds),
    projectIds: mergeIdLists(keeper.projectIds, drop.projectIds),
    notes: mergeNotes(keeper.notes, drop.notes),
    description: keeper.description || drop.description,
    snippets: mergeIdLists(keeper.snippets, drop.snippets),
    labels: mergeIdLists(keeper.labels, drop.labels),
    favorite: keeper.favorite || drop.favorite,
    readingStatus: keeper.readingStatus ?? drop.readingStatus,
  })
}
