import { useTranslation } from 'react-i18next'
import { PinIcon } from 'lucide-react'

import { cn } from '@/shared/utils/cn'

import { NOTE_COLOR_STYLES } from './noteColors'
import { noteDisplayTitle, noteSnippet } from './notesFormat'
import type { Note } from './notesService'

function shortDate(ms: number): string {
  const d = new Date(ms)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  })
}

interface NoteListProps {
  notes: Note[]
  activeId: string | null
  onSelect: (id: string) => void
}

export function NoteList({ notes, activeId, onSelect }: NoteListProps) {
  const { t } = useTranslation()
  return (
    <ul className="space-y-1.5" aria-label={t('notes.listLabel')}>
      {notes.map((note) => {
        const active = note.id === activeId
        const snippet = noteSnippet(note)
        return (
          <li key={note.id}>
            <button
              type="button"
              aria-current={active ? 'true' : undefined}
              onClick={() => onSelect(note.id)}
              className={cn(
                'group block w-full cursor-pointer rounded-lg border border-l-4 px-2.5 py-1.5 text-left shadow-xs transition-colors outline-none hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring',
                NOTE_COLOR_STYLES[note.color].surface,
                NOTE_COLOR_STYLES[note.color].accent,
                active && 'ring-2 ring-primary/50',
              )}
            >
              <span className="flex items-center gap-1.5">
                {note.pinned && <PinIcon className="size-3 shrink-0 text-primary" aria-label={t('notes.pinned')} />}
                <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                  {noteDisplayTitle(note, t('notes.untitled'))}
                </span>
                <span className="shrink-0 text-[10px] opacity-60">{shortDate(note.updatedAt)}</span>
              </span>
              {snippet && <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug opacity-70">{snippet}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
