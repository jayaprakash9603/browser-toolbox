import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PinIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { TextEditor } from '@/shared/components/TextEditor'
import { SearchInput } from '@/shared/components/SearchInput'
import { useProductivityTool } from '../_shared'
import { deleteNote, getNotes, saveNote, togglePin, type Note } from './notesService'

export default function NotesTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.notes')
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let live = true
    void getNotes()
      .then((value) => {
        if (live) setNotes(value)
      })
      .finally(() => {
        if (live) setLoaded(true)
      })
    return () => {
      live = false
    }
  }, [])

  const active = notes.find((n) => n.id === activeId) ?? null
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? notes.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
      : notes
    return [...list].sort(
      (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt,
    )
  }, [notes, query])

  const persist = async (next: Note[]) => {
    setNotes(next)
    await saveAll(next)
  }
  const saveAll = async (next: Note[]) => {
    const { saveAllNotes } = await import('./notesService')
    await saveAllNotes(next)
  }

  const createNote = async () => {
    const note = await saveNote({ title: t('notes.untitled'), body: '' })
    setNotes((prev) => [note, ...prev])
    setActiveId(note.id)
  }

  const updateActive = async (patch: Partial<Note>) => {
    if (!active) return
    const updated = { ...active, ...patch, updatedAt: Date.now() }
    await persist(notes.map((n) => (n.id === active.id ? updated : n)))
  }

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t('notes.search')}
            ariaLabel={t('notes.search')}
            className="flex-1"
          />
          <Button size="icon-sm" onClick={() => void createNote()} aria-label={t('notes.new')}>
            <PlusIcon />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 gap-2">
          <div className="w-28 shrink-0 space-y-1 overflow-y-auto">
            {!loaded ? (
              <p className="text-[10px] text-muted-foreground">{t('nav.loading')}</p>
            ) : filtered.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">{t('notes.empty')}</p>
            ) : (
              filtered.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setActiveId(note.id)}
                  className={`flex w-full items-center gap-1 rounded border px-1.5 py-1 text-left text-[11px] ${note.id === activeId ? 'border-primary bg-accent' : 'hover:bg-accent/60'}`}
                >
                  {note.pinned && <PinIcon className="size-2.5 shrink-0 text-primary" />}
                  <span className="min-w-0 flex-1 truncate">
                    {note.title || t('notes.untitled')}
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {active ? (
              <>
                <div className="flex items-center gap-1">
                  <Input
                    value={active.title}
                    onChange={(e) => void updateActive({ title: e.target.value })}
                    placeholder={t('notes.title')}
                    aria-label={t('notes.title')}
                    className="h-7 flex-1 text-xs"
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      void togglePin(active.id).then(() =>
                        persist(
                          notes.map((n) => (n.id === active.id ? { ...n, pinned: !n.pinned } : n)),
                        ),
                      )
                    }}
                    aria-label={t('common.pin')}
                    aria-pressed={active.pinned}
                  >
                    <PinIcon className={active.pinned ? 'text-primary' : ''} />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      void deleteNote(active.id).then(() => {
                        const next = notes.filter((n) => n.id !== active.id)
                        setNotes(next)
                        setActiveId(null)
                      })
                    }}
                    aria-label={t('common.delete')}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                <TextEditor
                  value={active.body}
                  onChange={(body) => void updateActive({ body })}
                  placeholder={t('notes.body')}
                  ariaLabel={t('notes.body')}
                  fill
                  mono={false}
                />
              </>
            ) : (
              <p className="rounded-md border border-dashed py-10 text-center text-[11px] text-muted-foreground">
                {t('notes.select')}
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolPage>
  )
}
