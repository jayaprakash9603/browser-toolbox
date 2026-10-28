export interface BookmarkRow {
  id: string
  title: string
  url: string
  folderPath: string
  dateAdded?: number
}

export async function searchBookmarks(query: string, limit = 200): Promise<BookmarkRow[]> {
  if (!chrome.bookmarks?.search) return []
  const trimmed = query.trim()
  const nodes = trimmed ? await chrome.bookmarks.search(trimmed) : await chrome.bookmarks.getRecent(Math.min(limit, 100))
  const rows: BookmarkRow[] = []
  for (const node of nodes) {
    if (!node.url) continue
    rows.push({
      id: node.id,
      title: node.title || node.url,
      url: node.url,
      folderPath: node.parentId ? await pathForParent(node.parentId) : 'Bookmarks',
      dateAdded: node.dateAdded,
    })
    if (rows.length >= limit) break
  }
  rows.sort((a, b) => (b.dateAdded ?? 0) - (a.dateAdded ?? 0))
  return rows
}

async function pathForParent(parentId: string): Promise<string> {
  try {
    const [node] = await chrome.bookmarks.get(parentId)
    if (!node) return 'Bookmarks'
    const parts: string[] = []
    let currentId: string | undefined = node.id
    while (currentId && currentId !== '0') {
      const found: chrome.bookmarks.BookmarkTreeNode[] = await chrome.bookmarks.get(currentId)
      const current: chrome.bookmarks.BookmarkTreeNode | undefined = found[0]
      if (!current) break
      if (current.title) parts.unshift(current.title)
      currentId = current.parentId
    }
    return parts.join(' › ') || 'Bookmarks'
  } catch {
    return 'Bookmarks'
  }
}

export function exportBookmarksMarkdown(rows: BookmarkRow[]): string {
  return rows.map((r) => `- [${r.title}](${r.url})`).join('\n')
}

export function exportBookmarksJson(rows: BookmarkRow[]): string {
  return JSON.stringify(rows, null, 2)
}

export function bookmarkFolderRoots(rows: BookmarkRow[], limit = 8): string[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const root = row.folderPath.split(' › ')[0]?.trim() || 'Bookmarks'
    counts.set(root, (counts.get(root) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name]) => name)
}

export function filterBookmarkRows(rows: BookmarkRow[], folderRoot: string | 'all'): BookmarkRow[] {
  if (folderRoot === 'all') return rows
  return rows.filter((row) => row.folderPath.startsWith(folderRoot))
}

export type BookmarkSort = 'recent' | 'title' | 'folder'

export function sortBookmarkRows(rows: readonly BookmarkRow[], sort: BookmarkSort): BookmarkRow[] {
  const next = [...rows]
  if (sort === 'title') {
    next.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
    return next
  }
  if (sort === 'folder') {
    next.sort(
      (a, b) =>
        a.folderPath.localeCompare(b.folderPath, undefined, { sensitivity: 'base' }) ||
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
    )
    return next
  }
  return next
}

export function folderMatchCount(rows: readonly BookmarkRow[], root: string): number {
  return rows.filter((row) => (row.folderPath.split(' › ')[0]?.trim() || 'Bookmarks') === root).length
}
