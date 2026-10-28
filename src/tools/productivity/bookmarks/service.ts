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
