import { get, set } from '@/core/storage'

const STORAGE_KEY = 'toolbox.snippets.v1'

export interface Snippet {
  id: string
  title: string
  body: string
  category: string
  tags: string[]
  pinned: boolean
  createdAt: number
  updatedAt: number
}

export type SnippetSort = 'recent' | 'title' | 'category'

export const DEFAULT_SNIPPET_CATEGORIES = ['General', 'Email', 'Support', 'Code', 'Social'] as const

export async function loadSnippets(): Promise<Snippet[]> {
  const list = await get<Snippet[]>(STORAGE_KEY)
  return Array.isArray(list) ? list : []
}

export async function saveSnippets(snippets: Snippet[]): Promise<void> {
  await set(STORAGE_KEY, snippets)
}

export function newSnippet(partial?: Partial<Pick<Snippet, 'title' | 'body' | 'category'>>): Snippet {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: partial?.title?.trim() || 'Untitled snippet',
    body: partial?.body ?? '',
    category: partial?.category?.trim() || 'General',
    tags: [],
    pinned: false,
    createdAt: now,
    updatedAt: now,
  }
}

export function sortSnippets(snippets: Snippet[], sort: SnippetSort): Snippet[] {
  const pinned = snippets.filter((s) => s.pinned)
  const rest = snippets.filter((s) => !s.pinned)
  const bySort = (list: Snippet[]) => {
    const copy = [...list]
    if (sort === 'title') copy.sort((a, b) => a.title.localeCompare(b.title))
    else if (sort === 'category') copy.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title))
    else copy.sort((a, b) => b.updatedAt - a.updatedAt)
    return copy
  }
  return [...bySort(pinned), ...bySort(rest)]
}

export function filterSnippets(snippets: Snippet[], query: string, category: string | 'all'): Snippet[] {
  const q = query.trim().toLowerCase()
  return snippets.filter((s) => {
    if (category !== 'all' && s.category !== category) return false
    if (!q) return true
    return (
      s.title.toLowerCase().includes(q) ||
      s.body.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
    )
  })
}

export function snippetCategories(snippets: Snippet[]): string[] {
  const set = new Set<string>(DEFAULT_SNIPPET_CATEGORIES)
  snippets.forEach((s) => {
    if (s.category.trim()) set.add(s.category.trim())
  })
  return [...set].sort((a, b) => a.localeCompare(b))
}
