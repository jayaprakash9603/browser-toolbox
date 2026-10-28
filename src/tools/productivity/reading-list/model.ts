import { get, set } from '@/core/storage'

const STORAGE_KEY = 'toolbox.readingList.v1'

export interface ReadingItem {
  id: string
  url: string
  title: string
  note: string
  tags: string[]
  savedAt: number
  read: boolean
}

export async function loadReadingList(): Promise<ReadingItem[]> {
  const list = await get<ReadingItem[]>(STORAGE_KEY)
  return Array.isArray(list) ? list : []
}

export async function saveReadingList(items: ReadingItem[]): Promise<void> {
  await set(STORAGE_KEY, items)
}

export function newReadingItem(partial: Pick<ReadingItem, 'url' | 'title'> & Partial<Pick<ReadingItem, 'note' | 'tags'>>): ReadingItem {
  return {
    id: crypto.randomUUID(),
    url: partial.url,
    title: partial.title.trim() || partial.url,
    note: partial.note?.trim() ?? '',
    tags: partial.tags ?? [],
    savedAt: Date.now(),
    read: false,
  }
}

export function filterReadingList(items: ReadingItem[], query: string, filter: 'all' | 'unread' | 'read'): ReadingItem[] {
  const q = query.trim().toLowerCase()
  return items.filter((item) => {
    if (filter === 'unread' && item.read) return false
    if (filter === 'read' && !item.read) return false
    if (!q) return true
    return (
      item.title.toLowerCase().includes(q) ||
      item.url.toLowerCase().includes(q) ||
      item.note.toLowerCase().includes(q) ||
      item.tags.some((tag) => tag.toLowerCase().includes(q))
    )
  })
}

export function exportReadingMarkdown(items: ReadingItem[]): string {
  return items.map((item) => `- [${item.title}](${item.url})${item.note ? ` — ${item.note}` : ''}`).join('\n')
}
