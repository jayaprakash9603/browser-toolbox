import { get, set } from '@/core/storage'

export interface Note {
  id: string
  title: string
  body: string
  pinned: boolean
  updatedAt: number
}

const KEY = 'toolbox.notes'

export async function getNotes(): Promise<Note[]> {
  const stored = await get<Note[]>(KEY)
  return Array.isArray(stored) ? stored : []
}

export async function saveAllNotes(notes: Note[]): Promise<void> {
  await set(KEY, notes)
}

export async function saveNote(partial: Pick<Note, 'title' | 'body'>): Promise<Note> {
  const notes = await getNotes()
  const note: Note = {
    id: crypto.randomUUID(),
    title: partial.title,
    body: partial.body,
    pinned: false,
    updatedAt: Date.now(),
  }
  await saveAllNotes([note, ...notes])
  return note
}

export async function togglePin(id: string): Promise<void> {
  const notes = await getNotes()
  await saveAllNotes(notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)))
}

export async function deleteNote(id: string): Promise<void> {
  const notes = await getNotes()
  await saveAllNotes(notes.filter((n) => n.id !== id))
}
