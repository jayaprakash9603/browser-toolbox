import { sortNotes, type Note, type NoteColor, type NotesSort } from './notesService'

export const NOTE_VIEWS = ['all', 'pinned', 'checklists', 'archive', 'trash'] as const
export type NotesView = (typeof NOTE_VIEWS)[number]

export interface NotesFilter {
  view: NotesView
  tag: string | null
  color: NoteColor | null
  query: string
}

export const DEFAULT_FILTER: NotesFilter = { view: 'all', tag: null, color: null, query: '' }

// A tag starts after whitespace or an opening bracket, so URL fragments (`page#top`) and
// markdown headings (`# Title`) are never read as tags.
const TAG_RE = /(^|[\s([{,;])#([\p{L}\p{N}_][\p{L}\p{N}_/-]*)/gu
const CHECK_RE = /^\s*- \[([ xX])\] /

export function extractTags(text: string): string[] {
  const out = new Set<string>()
  let inCode = false
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) {
      inCode = !inCode
      continue
    }
    if (inCode) continue
    for (const m of line.replace(/`[^`]*`/g, '').matchAll(TAG_RE)) {
      const tag = m[2].replace(/[/-]+$/, '').toLowerCase()
      if (tag && !/^\d+$/.test(tag)) out.add(tag)
    }
  }
  return [...out]
}

export function noteTags(note: Pick<Note, 'title' | 'body'>): string[] {
  return extractTags(`${note.title}\n${note.body}`)
}

export interface ChecklistProgress {
  done: number
  total: number
}

export function checklistProgress(body: string): ChecklistProgress {
  let done = 0
  let total = 0
  for (const line of body.split('\n')) {
    const m = CHECK_RE.exec(line)
    if (!m) continue
    total += 1
    if (m[1] !== ' ') done += 1
  }
  return { done, total }
}

function hasOpenItems(note: Note): boolean {
  const { done, total } = checklistProgress(note.body)
  return total > done
}

const isLive = (note: Note) => note.trashedAt == null && !note.archived

export function matchesView(note: Note, view: NotesView): boolean {
  switch (view) {
    case 'all':
      return isLive(note)
    case 'pinned':
      return isLive(note) && note.pinned
    case 'checklists':
      return isLive(note) && hasOpenItems(note)
    case 'archive':
      return note.trashedAt == null && note.archived
    case 'trash':
      return note.trashedAt != null
  }
}

export interface NotesCounts {
  views: Record<NotesView, number>
  /** Live notes per tag, sorted by most used. */
  tags: { tag: string; count: number }[]
  colors: Partial<Record<NoteColor, number>>
}

export function notesCounts(notes: Note[]): NotesCounts {
  const views: Record<NotesView, number> = { all: 0, pinned: 0, checklists: 0, archive: 0, trash: 0 }
  const tags = new Map<string, number>()
  const colors: Partial<Record<NoteColor, number>> = {}
  for (const note of notes) {
    for (const view of NOTE_VIEWS) if (matchesView(note, view)) views[view] += 1
    if (note.trashedAt != null) continue
    colors[note.color] = (colors[note.color] ?? 0) + 1
    for (const tag of noteTags(note)) tags.set(tag, (tags.get(tag) ?? 0) + 1)
  }
  return {
    views,
    tags: [...tags].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)),
    colors,
  }
}

export function queryTokens(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/u).filter(Boolean)
}

function matchesQuery(note: Note, tokens: string[]): boolean {
  if (!tokens.length) return true
  const haystack = `${note.title}\n${note.body}`.toLowerCase()
  const tags = noteTags(note)
  return tokens.every((token) =>
    token.startsWith('#') && token.length > 1 ? tags.some((tag) => tag.startsWith(token.slice(1))) : haystack.includes(token),
  )
}

export function filterNotes(notes: Note[], filter: NotesFilter, sort: NotesSort): Note[] {
  const tokens = queryTokens(filter.query)
  const list = notes.filter(
    (note) =>
      matchesView(note, filter.view) &&
      (filter.tag == null || noteTags(note).includes(filter.tag)) &&
      (filter.color == null || note.color === filter.color) &&
      matchesQuery(note, tokens),
  )
  if (filter.view === 'trash') return list.sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0))
  return sortNotes(list, sort)
}

export type SectionId = 'pinned' | 'today' | 'yesterday' | 'week' | 'month' | 'older' | 'notes'

export interface NoteSection {
  id: SectionId
  notes: Note[]
}

const DAY = 24 * 60 * 60 * 1000

function bucket(at: number, now: number): SectionId {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const start = today.getTime()
  if (at >= start) return 'today'
  if (at >= start - DAY) return 'yesterday'
  if (at >= start - 6 * DAY) return 'week'
  if (at >= start - 29 * DAY) return 'month'
  return 'older'
}

/** Splits an already sorted list into Pinned + date sections (or a single section). */
export function groupNotes(
  sorted: Note[],
  { sort, grouped, view, now }: { sort: NotesSort; grouped: boolean; view: NotesView; now: number },
): NoteSection[] {
  const pinnedFirst = view !== 'trash' && view !== 'pinned'
  const pinned = pinnedFirst ? sorted.filter((n) => n.pinned) : []
  const rest = pinnedFirst ? sorted.filter((n) => !n.pinned) : sorted
  const sections: NoteSection[] = pinned.length ? [{ id: 'pinned', notes: pinned }] : []
  if (!grouped || sort === 'title') {
    if (rest.length) sections.push({ id: 'notes', notes: rest })
    return sections
  }
  const stamp = (n: Note) => (view === 'trash' ? (n.trashedAt ?? n.updatedAt) : sort === 'created' ? n.createdAt : n.updatedAt)
  for (const note of rest) {
    const id = bucket(stamp(note), now)
    const last = sections[sections.length - 1]
    if (last?.id === id) last.notes.push(note)
    else sections.push({ id, notes: [note] })
  }
  return sections
}

export interface TextPart {
  text: string
  match: boolean
}

/** Splits `text` around case-insensitive occurrences of the query tokens, for <mark> rendering. */
export function highlightParts(text: string, query: string): TextPart[] {
  const tokens = queryTokens(query)
    .map((token) => (token.startsWith('#') ? token.slice(1) : token))
    .filter(Boolean)
  if (!tokens.length || !text) return [{ text, match: false }]
  const source = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const parts: TextPart[] = []
  let last = 0
  for (const m of text.matchAll(new RegExp(source, 'giu'))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), match: false })
    parts.push({ text: m[0], match: true })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false })
  return parts.length ? parts : [{ text, match: false }]
}

/** Snippet that starts near the first search hit, so matches deep in a note are still visible. */
export function snippetAround(snippet: string, query: string, max = 140): string {
  const tokens = queryTokens(query).filter((token) => !token.startsWith('#'))
  if (!tokens.length) return snippet
  const lower = snippet.toLowerCase()
  const hit = Math.min(...tokens.map((token) => lower.indexOf(token)).filter((i) => i >= 0))
  if (!Number.isFinite(hit) || hit < 40) return snippet
  const from = Math.max(0, hit - 24)
  return `…${snippet.slice(from, from + max)}`
}

export function shortDate(ms: number, now = Date.now()): string {
  const d = new Date(ms)
  const n = new Date(now)
  if (d.toDateString() === n.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() === n.getFullYear() ? {} : { year: 'numeric' }),
  })
}
