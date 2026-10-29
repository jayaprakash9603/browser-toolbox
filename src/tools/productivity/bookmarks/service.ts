export interface BookmarkRow {
  id: string
  title: string
  url: string
  folderPath: string
  parentId?: string
  index?: number
  dateAdded?: number
}

export interface BookmarkFolder {
  id: string
  title: string
  path: string
  parentId?: string
  index?: number
  depth: number
  directCount: number
  count: number
  editable: boolean
}

export interface BookmarkLibrary {
  rows: BookmarkRow[]
  folders: BookmarkFolder[]
}

export type BookmarkSort = 'manual' | 'recent' | 'title' | 'domain'
export type BookmarkView = 'all' | 'recent' | 'duplicates'

export const FOLDER_SEPARATOR = ' › '
const ROOT_LABEL = 'Bookmarks'
const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000
const ROOT_NODE_ID = '0'

export function parseBookmarkTree(
  nodes: readonly chrome.bookmarks.BookmarkTreeNode[],
  limit = 5000,
): BookmarkLibrary {
  const rows: BookmarkRow[] = []
  const folders: BookmarkFolder[] = []

  const walk = (node: chrome.bookmarks.BookmarkTreeNode, path: string[], depth: number) => {
    if (rows.length >= limit) return
    if (node.url) {
      rows.push({
        id: node.id,
        title: node.title || node.url,
        url: node.url,
        folderPath: path.join(FOLDER_SEPARATOR) || ROOT_LABEL,
        parentId: node.parentId,
        index: node.index,
        dateAdded: node.dateAdded,
      })
      return
    }
    const isRoot = node.id === ROOT_NODE_ID || !node.title
    const nextPath = isRoot ? path : [...path, node.title]
    if (!isRoot) {
      folders.push({
        id: node.id,
        title: node.title,
        path: nextPath.join(FOLDER_SEPARATOR),
        parentId: node.parentId,
        index: node.index,
        depth,
        directCount: 0,
        count: 0,
        editable: node.parentId !== ROOT_NODE_ID,
      })
    }
    node.children?.forEach((child) => walk(child, nextPath, isRoot ? depth : depth + 1))
  }
  nodes.forEach((node) => walk(node, [], 0))

  return { rows, folders: withFolderCounts(folders, rows) }
}

function withFolderCounts(
  folders: BookmarkFolder[],
  rows: readonly BookmarkRow[],
): BookmarkFolder[] {
  const byId = new Map(folders.map((folder) => [folder.id, { ...folder }]))
  for (const row of rows) {
    const direct = row.parentId ? byId.get(row.parentId) : undefined
    if (direct) direct.directCount += 1
    let cursor = direct
    while (cursor) {
      cursor.count += 1
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined
    }
  }
  return folders.map((folder) => byId.get(folder.id) ?? folder)
}

export function flattenBookmarkTree(
  nodes: readonly chrome.bookmarks.BookmarkTreeNode[],
  limit = 1000,
): BookmarkRow[] {
  return parseBookmarkTree(nodes, limit).rows
}

export async function loadBookmarkLibrary(): Promise<BookmarkLibrary> {
  if (!chrome.bookmarks?.getTree) return { rows: [], folders: [] }
  return parseBookmarkTree(await chrome.bookmarks.getTree())
}

export function bookmarkDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function normalizeBookmarkUrl(url: string): string {
  return url
    .trim()
    .replace(/#.*$/, '')
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/\/+$/, '')
    .toLowerCase()
}

export function duplicateBookmarkIds(rows: readonly BookmarkRow[]): Set<string> {
  const groups = new Map<string, string[]>()
  for (const row of rows) {
    const key = normalizeBookmarkUrl(row.url)
    groups.set(key, [...(groups.get(key) ?? []), row.id])
  }
  const ids = new Set<string>()
  for (const group of groups.values()) {
    if (group.length > 1) group.forEach((id) => ids.add(id))
  }
  return ids
}

export function filterBookmarkView(
  rows: readonly BookmarkRow[],
  view: BookmarkView,
  duplicates: ReadonlySet<string>,
  now = Date.now(),
): BookmarkRow[] {
  if (view === 'recent') return rows.filter((row) => (row.dateAdded ?? 0) >= now - RECENT_WINDOW_MS)
  if (view === 'duplicates') return rows.filter((row) => duplicates.has(row.id))
  return [...rows]
}

export function searchBookmarkRows(rows: readonly BookmarkRow[], query: string): BookmarkRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...rows]
  return rows.filter(
    (row) =>
      row.title.toLowerCase().includes(q) ||
      row.url.toLowerCase().includes(q) ||
      row.folderPath.toLowerCase().includes(q),
  )
}

export function rowsInFolderTree(
  rows: readonly BookmarkRow[],
  folder: BookmarkFolder,
): BookmarkRow[] {
  return rows.filter(
    (row) =>
      row.folderPath === folder.path ||
      row.folderPath.startsWith(`${folder.path}${FOLDER_SEPARATOR}`),
  )
}

export function directRows(rows: readonly BookmarkRow[], folderId: string): BookmarkRow[] {
  return rows
    .filter((row) => row.parentId === folderId)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
}

export function childFolders(
  folders: readonly BookmarkFolder[],
  folderId: string,
): BookmarkFolder[] {
  return folders
    .filter((folder) => folder.parentId === folderId)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
}

export function folderTrail(
  folders: readonly BookmarkFolder[],
  folderId: string,
): BookmarkFolder[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const trail: BookmarkFolder[] = []
  let cursor = byId.get(folderId)
  while (cursor) {
    trail.unshift(cursor)
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined
  }
  return trail
}

/** Descendant folder ids including the folder itself; a folder cannot be moved into these. */
export function folderSubtreeIds(
  folders: readonly BookmarkFolder[],
  folderId: string,
): Set<string> {
  const ids = new Set([folderId])
  let grew = true
  while (grew) {
    grew = false
    for (const folder of folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id)
        grew = true
      }
    }
  }
  return ids
}

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** Chrome reads the target index before removal, so moving later in the same folder needs +1. */
export function chromeMoveIndex(fromIndex: number, toIndex: number, sameParent: boolean): number {
  return sameParent && toIndex > fromIndex ? toIndex + 1 : toIndex
}

export function exportBookmarksMarkdown(rows: BookmarkRow[]): string {
  return rows.map((r) => `- [${r.title}](${r.url})`).join('\n')
}

export function exportBookmarksJson(rows: BookmarkRow[]): string {
  return JSON.stringify(rows, null, 2)
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export function exportBookmarksCsv(rows: readonly BookmarkRow[]): string {
  const header = 'title,url,folder,added'
  const lines = rows.map((r) =>
    [
      csvCell(r.title),
      csvCell(r.url),
      csvCell(r.folderPath),
      csvCell(r.dateAdded ? new Date(r.dateAdded).toISOString() : ''),
    ].join(','),
  )
  return [header, ...lines].join('\n')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function exportBookmarksHtml(rows: readonly BookmarkRow[]): string {
  const items = rows
    .map((r) => {
      const added = r.dateAdded ? ` ADD_DATE="${Math.floor(r.dateAdded / 1000)}"` : ''
      return `    <DT><A HREF="${escapeHtml(r.url)}"${added}>${escapeHtml(r.title)}</A>`
    })
    .join('\n')
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n${items}\n</DL><p>\n`
}

function rootOf(row: BookmarkRow): string {
  return row.folderPath.split(FOLDER_SEPARATOR)[0]?.trim() || ROOT_LABEL
}

export function bookmarkFolderRoots(rows: BookmarkRow[], limit = 8): string[] {
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(rootOf(row), (counts.get(rootOf(row)) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name]) => name)
}

export function filterBookmarkRows(rows: BookmarkRow[], folderRoot: string | 'all'): BookmarkRow[] {
  if (folderRoot === 'all') return rows
  return rows.filter((row) => row.folderPath.startsWith(folderRoot))
}

export function topBookmarkDomains(
  rows: readonly BookmarkRow[],
  limit = 12,
): { domain: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const domain = bookmarkDomain(row.url)
    counts.set(domain, (counts.get(domain) ?? 0) + 1)
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([domain, count]) => ({ domain, count }))
}

export function filterBookmarkDomain(
  rows: readonly BookmarkRow[],
  domain: string | 'all',
): BookmarkRow[] {
  if (domain === 'all') return [...rows]
  return rows.filter((row) => bookmarkDomain(row.url) === domain)
}

export function sortBookmarkRows(rows: readonly BookmarkRow[], sort: BookmarkSort): BookmarkRow[] {
  const next = [...rows]
  const byTitle = (a: BookmarkRow, b: BookmarkRow) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  if (sort === 'title') return next.sort(byTitle)
  if (sort === 'domain') {
    return next.sort(
      (a, b) => bookmarkDomain(a.url).localeCompare(bookmarkDomain(b.url)) || byTitle(a, b),
    )
  }
  if (sort === 'manual') return next
  return next.sort((a, b) => (b.dateAdded ?? 0) - (a.dateAdded ?? 0))
}

export function folderMatchCount(rows: readonly BookmarkRow[], root: string): number {
  return rows.filter((row) => rootOf(row) === root).length
}
