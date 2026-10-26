import { get, set } from '@/core/storage'

export const NOTE_COLORS = ['default', 'yellow', 'green', 'pink', 'purple', 'blue', 'gray', 'charcoal'] as const
export type NoteColor = (typeof NOTE_COLORS)[number]

export interface Note {
  id: string
  title: string
  body: string
  pinned: boolean
  color: NoteColor
  archived: boolean
  /** When the note was moved to the trash; `null` while it is live. */
  trashedAt: number | null
  createdAt: number
  updatedAt: number
}

export type NotesSort = 'modified' | 'created' | 'title'
export type NotesFont = 'sans' | 'serif' | 'mono'

export interface NotesPrefs {
  sort: NotesSort
  wordWrap: boolean
  spellcheck: boolean
  font: NotesFont
  zoom: number
  statusBar: boolean
  confirmDelete: boolean
  /** Hides snippets, tags and progress in the list. */
  compact: boolean
  /** Splits the list into Pinned / Today / This week… sections. */
  grouped: boolean
}

export const DEFAULT_PREFS: NotesPrefs = {
  sort: 'modified',
  wordWrap: true,
  spellcheck: true,
  font: 'sans',
  zoom: 100,
  statusBar: true,
  confirmDelete: true,
  compact: false,
  grouped: true,
}

export const ZOOM_MIN = 50
export const ZOOM_MAX = 300
export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

const KEY = 'toolbox.notes'
const PREFS_KEY = 'toolbox.notes.prefs'

export function normalizeNote(raw: Partial<Note>): Note {
  const updatedAt = typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now()
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    title: typeof raw.title === 'string' ? raw.title : '',
    body: typeof raw.body === 'string' ? raw.body : '',
    pinned: raw.pinned === true,
    color: NOTE_COLORS.includes(raw.color as NoteColor) ? (raw.color as NoteColor) : 'default',
    archived: raw.archived === true,
    trashedAt: typeof raw.trashedAt === 'number' ? raw.trashedAt : null,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : updatedAt,
    updatedAt,
  }
}

export function createNote(partial: Partial<Note> = {}): Note {
  const now = Date.now()
  return normalizeNote({ createdAt: now, updatedAt: now, ...partial, id: crypto.randomUUID() })
}

/** Drops notes that have sat in the trash longer than the retention window. */
export function purgeExpiredTrash(notes: Note[], now = Date.now()): Note[] {
  return notes.filter((n) => n.trashedAt == null || now - n.trashedAt < TRASH_RETENTION_MS)
}

export async function getNotes(): Promise<Note[]> {
  const stored = await get<Partial<Note>[]>(KEY)
  return Array.isArray(stored) ? stored.map(normalizeNote) : []
}

export async function saveAllNotes(notes: Note[]): Promise<void> {
  await set(KEY, notes)
}

export async function getPrefs(): Promise<NotesPrefs> {
  const stored = await get<Partial<NotesPrefs>>(PREFS_KEY)
  const prefs = { ...DEFAULT_PREFS, ...(stored ?? {}) }
  prefs.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(prefs.zoom) || 100))
  return prefs
}

export async function savePrefs(prefs: NotesPrefs): Promise<void> {
  await set(PREFS_KEY, prefs)
}

export function sortNotes(notes: Note[], sort: NotesSort): Note[] {
  return [...notes].sort((a, b) => {
    const pin = Number(b.pinned) - Number(a.pinned)
    if (pin) return pin
    if (sort === 'created') return b.createdAt - a.createdAt
    if (sort === 'title') return (a.title || a.body).localeCompare(b.title || b.body, undefined, { sensitivity: 'base' })
    return b.updatedAt - a.updatedAt
  })
}
