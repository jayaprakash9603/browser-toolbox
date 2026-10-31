import { get, set } from '@/core/storage'

const STORAGE_KEY = 'toolbox.readingList.v1'

export interface ReadingItem {
  id: string
  url: string
  title: string
  note: string
  excerpt?: string
  tags: string[]
  savedAt: number
  read: boolean
  starred?: boolean
  readAt?: number
}

export type ReadingFilter = 'all' | 'unread' | 'read' | 'starred'
export type ReadingSort = 'newest' | 'oldest' | 'title' | 'domain'

export async function loadReadingList(): Promise<ReadingItem[]> {
  const list = await get<ReadingItem[]>(STORAGE_KEY)
  return Array.isArray(list) ? list : []
}

export async function saveReadingList(items: ReadingItem[]): Promise<void> {
  await set(STORAGE_KEY, items)
}

export function parseReadingTags(input: string): string[] {
  const seen = new Set<string>()
  for (const part of input.split(/[\s,]+/)) {
    const clean = part.replace(/^#+/, '').trim().toLowerCase()
    if (clean) seen.add(clean)
  }
  return [...seen]
}

export function newReadingItem(
  partial: Pick<ReadingItem, 'url' | 'title'> &
    Partial<Pick<ReadingItem, 'note' | 'tags' | 'excerpt'>>,
): ReadingItem {
  const excerpt = partial.excerpt?.trim()
  return {
    id: crypto.randomUUID(),
    url: partial.url,
    title: partial.title.trim() || partial.url,
    note: partial.note?.trim() ?? '',
    ...(excerpt ? { excerpt } : {}),
    tags: partial.tags ?? [],
    savedAt: Date.now(),
    read: false,
  }
}

export function readingDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function filterReadingList(
  items: ReadingItem[],
  query: string,
  filter: ReadingFilter,
  tag: string | 'all' = 'all',
): ReadingItem[] {
  const q = query.trim().toLowerCase().replace(/^#/, '')
  return items.filter((item) => {
    if (filter === 'unread' && item.read) return false
    if (filter === 'read' && !item.read) return false
    if (filter === 'starred' && !item.starred) return false
    if (tag !== 'all' && !item.tags.includes(tag)) return false
    if (!q) return true
    return (
      item.title.toLowerCase().includes(q) ||
      item.url.toLowerCase().includes(q) ||
      item.note.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q))
    )
  })
}

export function sortReadingList(items: readonly ReadingItem[], sort: ReadingSort): ReadingItem[] {
  const next = [...items]
  const byDate = (a: ReadingItem, b: ReadingItem) => b.savedAt - a.savedAt
  if (sort === 'oldest') return next.sort((a, b) => a.savedAt - b.savedAt)
  if (sort === 'title')
    return next.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
  if (sort === 'domain') {
    return next.sort(
      (a, b) => readingDomain(a.url).localeCompare(readingDomain(b.url)) || byDate(a, b),
    )
  }
  return next.sort(byDate)
}

export function readingTags(items: readonly ReadingItem[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }))
}

export function readingProgress(items: readonly ReadingItem[]): {
  read: number
  total: number
  pct: number
} {
  const total = items.length
  const read = items.filter((item) => item.read).length
  return { read, total, pct: total ? Math.round((read / total) * 100) : 0 }
}

export function readingCounts(items: readonly ReadingItem[]): Record<ReadingFilter, number> {
  return {
    all: items.length,
    unread: items.filter((item) => !item.read).length,
    read: items.filter((item) => item.read).length,
    starred: items.filter((item) => item.starred).length,
  }
}

export function exportReadingMarkdown(items: ReadingItem[]): string {
  return items
    .map((item) => {
      const tags = item.tags.length ? ` ${item.tags.map((tag) => `#${tag}`).join(' ')}` : ''
      const excerpt = item.excerpt ? `\n  > ${item.excerpt.replace(/\s*\n\s*/g, ' ')}` : ''
      return `- [${item.title}](${item.url})${item.note ? ` — ${item.note}` : ''}${tags}${excerpt}`
    })
    .join('\n')
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export function exportReadingCsv(items: readonly ReadingItem[]): string {
  const header = 'title,url,note,tags,status,saved'
  const lines = items.map((item) =>
    [
      csvCell(item.title),
      csvCell(item.url),
      csvCell(item.note),
      csvCell(item.tags.join(' ')),
      csvCell(item.read ? 'read' : 'unread'),
      csvCell(new Date(item.savedAt).toISOString()),
    ].join(','),
  )
  return [header, ...lines].join('\n')
}

export function mergeImportedReading(existing: ReadingItem[], imported: unknown): ReadingItem[] {
  const rows = Array.isArray(imported) ? imported : [imported]
  const urls = new Set(existing.map((item) => item.url))
  const merged = [...existing]
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const candidate = row as Partial<ReadingItem>
    if (
      typeof candidate.url !== 'string' ||
      !/^https?:\/\//i.test(candidate.url) ||
      urls.has(candidate.url)
    )
      continue
    urls.add(candidate.url)
    merged.push({
      ...newReadingItem({
        url: candidate.url,
        title: candidate.title ?? candidate.url,
        note: candidate.note,
      }),
      tags: Array.isArray(candidate.tags) ? candidate.tags : [],
      read: candidate.read === true,
      starred: candidate.starred === true,
      savedAt: candidate.savedAt ?? Date.now(),
    })
  }
  return merged
}
