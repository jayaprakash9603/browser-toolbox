import { get, set } from '@/core/storage'

const STORAGE_KEY = 'toolbox.snippets.v1'

export interface Snippet {
  id: string
  title: string
  body: string
  category: string
  tags: string[]
  pinned: boolean
  shortcut?: string
  useCount?: number
  lastUsedAt?: number
  createdAt: number
  updatedAt: number
}

export type SnippetSort = 'recent' | 'popular' | 'title' | 'category'

export const DEFAULT_SNIPPET_CATEGORIES = ['General', 'Email', 'Support', 'Code', 'Social'] as const

export const BUILTIN_SNIPPET_TOKENS = [
  'date',
  'time',
  'datetime',
  'url',
  'title',
  'domain',
] as const

const BUILTIN_SET = new Set<string>(BUILTIN_SNIPPET_TOKENS)
const TOKEN_PATTERN = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g

export async function loadSnippets(): Promise<Snippet[]> {
  const list = await get<Snippet[]>(STORAGE_KEY)
  return Array.isArray(list) ? list : []
}

export async function saveSnippets(snippets: Snippet[]): Promise<void> {
  await set(STORAGE_KEY, snippets)
}

export function newSnippet(
  partial?: Partial<Pick<Snippet, 'title' | 'body' | 'category' | 'tags' | 'shortcut' | 'pinned'>>,
): Snippet {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: partial?.title?.trim() || 'Untitled snippet',
    body: partial?.body ?? '',
    category: partial?.category?.trim() || 'General',
    tags: partial?.tags ?? [],
    shortcut: partial?.shortcut?.trim() || undefined,
    pinned: partial?.pinned ?? false,
    useCount: 0,
    createdAt: now,
    updatedAt: now,
  }
}

export function sortSnippets(snippets: Snippet[], sort: SnippetSort): Snippet[] {
  const pinned = snippets.filter((s) => s.pinned)
  const rest = snippets.filter((s) => !s.pinned)
  const bySort = (list: Snippet[]) => {
    const copy = [...list]
    if (sort === 'title') {
      copy.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sort === 'category') {
      copy.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title))
    } else if (sort === 'popular') {
      copy.sort((a, b) => (b.useCount ?? 0) - (a.useCount ?? 0) || b.updatedAt - a.updatedAt)
    } else {
      copy.sort((a, b) => b.updatedAt - a.updatedAt)
    }
    return copy
  }
  return [...bySort(pinned), ...bySort(rest)]
}

export function filterSnippets(
  snippets: Snippet[],
  query: string,
  category: string | 'all',
  tag: string | 'all' = 'all',
): Snippet[] {
  const q = query.trim().toLowerCase().replace(/^#/, '')
  return snippets.filter((s) => {
    if (category !== 'all' && s.category !== category) return false
    if (tag !== 'all' && !s.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return false
    if (!q) return true
    return (
      s.title.toLowerCase().includes(q) ||
      s.body.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      (s.shortcut?.toLowerCase().includes(q) ?? false) ||
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

export function categorySnippetCount(
  snippets: readonly Snippet[],
  category: string | 'all',
): number {
  if (category === 'all') return snippets.length
  return snippets.filter((s) => s.category === category).length
}

export function snippetTags(snippets: readonly Snippet[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const s of snippets) {
    for (const raw of s.tags) {
      const normalized = raw.trim().toLowerCase()
      if (normalized) counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }))
}

export function parseSnippetTags(input: string): string[] {
  const seen = new Set<string>()
  for (const part of input.split(/[\s,]+/)) {
    const clean = part.replace(/^#+/, '').trim().toLowerCase()
    if (clean) seen.add(clean)
  }
  return [...seen]
}

export function extractSnippetVariables(body: string): string[] {
  const found = new Set<string>()
  for (const match of body.matchAll(TOKEN_PATTERN)) {
    if (match[1]) found.add(match[1])
  }
  return [...found]
}

export function extractCustomVariables(body: string): string[] {
  return extractSnippetVariables(body).filter((token) => !BUILTIN_SET.has(token.toLowerCase()))
}

export interface SnippetResolveContext {
  url?: string
  title?: string
  now?: Date
}

function safeDomain(url?: string): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function resolveSnippetBody(
  body: string,
  values: Record<string, string> = {},
  context: SnippetResolveContext = {},
): string {
  const now = context.now ?? new Date()
  const isoDate = now.toISOString().slice(0, 10)
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const builtIns: Record<string, string> = {
    date: isoDate,
    time: timeStr,
    datetime: `${isoDate} ${timeStr}`,
    url: context.url ?? '',
    title: context.title ?? '',
    domain: safeDomain(context.url),
  }

  return body.replace(TOKEN_PATTERN, (full, rawName: string) => {
    const custom = values[rawName]
    if (custom !== undefined && custom !== '') return custom
    const lower = rawName.toLowerCase()
    if (lower in builtIns && builtIns[lower] !== '') return builtIns[lower]
    return full
  })
}

export function recordSnippetUse(
  snippets: readonly Snippet[],
  id: string,
  now = Date.now(),
): Snippet[] {
  return snippets.map((s) =>
    s.id === id ? { ...s, useCount: (s.useCount ?? 0) + 1, lastUsedAt: now } : s,
  )
}

export function duplicateSnippet(snippet: Snippet): Snippet {
  const now = Date.now()
  return {
    ...snippet,
    id: crypto.randomUUID(),
    title: snippet.title.endsWith(' (copy)') ? `${snippet.title} 2` : `${snippet.title} (copy)`,
    pinned: false,
    useCount: 0,
    createdAt: now,
    updatedAt: now,
  }
}

export function mergeImportedSnippets(existing: Snippet[], imported: Snippet[]): Snippet[] {
  const ids = new Set(existing.map((s) => s.id))
  const merged = [...existing]
  for (const row of imported) {
    if (!row.body?.trim()) continue
    const item: Snippet = ids.has(row.id)
      ? {
          ...row,
          id: crypto.randomUUID(),
          tags: Array.isArray(row.tags) ? row.tags : [],
          updatedAt: Date.now(),
        }
      : { ...row, tags: Array.isArray(row.tags) ? row.tags : [], updatedAt: Date.now() }
    ids.add(item.id)
    merged.push(item)
  }
  return merged
}

export function snippetStats(body: string) {
  const lines = body.split(/\n/).length
  const chars = body.length
  const words = body.trim() ? body.trim().split(/\s+/).length : 0
  return { lines, chars, words }
}

export function exportSnippetsMarkdown(snippets: readonly Snippet[]): string {
  return snippets
    .map((s) => {
      const meta = [s.category, s.shortcut, ...s.tags.map((t) => `#${t}`)]
        .filter(Boolean)
        .join(' · ')
      return `## ${s.title}\n${meta ? `_${meta}_\n\n` : '\n'}\`\`\`\n${s.body}\n\`\`\``
    })
    .join('\n\n')
}

export function createStarterSnippets(): Snippet[] {
  return [
    newSnippet({
      title: 'Follow-up email',
      category: 'Email',
      shortcut: '/followup',
      tags: ['email', 'outreach'],
      pinned: true,
      body: 'Hi {{name}},\n\nChecking in on {{topic}} from our last conversation. Let me know if you need anything else from my side.\n\nBest regards,',
    }),
    newSnippet({
      title: 'Bug report summary',
      category: 'Support',
      shortcut: '/bug',
      tags: ['qa', 'bug'],
      body: '### Bug Report ({{date}})\n- **Page:** [{{title}}]({{url}})\n- **Expected:** {{expected}}\n- **Actual:** {{actual}}\n- **Steps:**\n  1. ',
    }),
    newSnippet({
      title: 'PR review checklist',
      category: 'Code',
      shortcut: '/pr',
      tags: ['code', 'review'],
      body: '### Review Summary\n- [x] Logic & edge cases verified\n- [x] Accessibility & keyboard nav checked\n- [x] Unit tests passing\n\nNotes: {{notes}}',
    }),
    newSnippet({
      title: 'Markdown page citation',
      category: 'General',
      shortcut: '/cite',
      tags: ['research', 'markdown'],
      body: '- [{{title}}]({{url}}) — saved {{date}}',
    }),
  ]
}
