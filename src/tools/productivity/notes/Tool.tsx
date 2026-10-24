import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArchiveIcon,
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  CopyPlusIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  FileDownIcon,
  NotebookPenIcon,
  PaletteIcon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
  PrinterIcon,
  SaveIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'

import { ToolPage } from '@/shared/components/ToolPage'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { SearchInput } from '@/shared/components/SearchInput'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { cn } from '@/shared/utils/cn'

import { useProductivityTool } from '../_shared'
import { NoteEditor } from './NoteEditor'
import { NoteList } from './NoteList'
import { NOTE_COLOR_STYLES } from './noteColors'
import {
  copyNote,
  exportAllAsZip,
  exportBackup,
  exportNote,
  printNote,
  type NoteExportFormat,
} from './notesExport'
import { formatTimestamp, noteDisplayTitle, parseBackup, textFileToNote } from './notesFormat'
import {
  createNote,
  DEFAULT_PREFS,
  getNotes,
  getPrefs,
  normalizeNote,
  NOTE_COLORS,
  saveAllNotes,
  savePrefs,
  sortNotes,
  ZOOM_MAX,
  ZOOM_MIN,
  type Note,
  type NotesPrefs,
  type NotesSort,
} from './notesService'

const EXPORT_FORMATS: { format: NoteExportFormat; label: string }[] = [
  { format: 'txt', label: 'notes.export.txt' },
  { format: 'md', label: 'notes.export.md' },
  { format: 'html', label: 'notes.export.html' },
  { format: 'doc', label: 'notes.export.doc' },
  { format: 'pdf', label: 'notes.export.pdf' },
]

const SORTS: NotesSort[] = ['modified', 'created', 'title']

export default function NotesTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.notes')
  const [notes, setNotes] = useState<Note[]>([])
  const [prefs, setPrefs] = useState<NotesPrefs>(DEFAULT_PREFS)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [freshId, setFreshId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dirty = useRef(false)
  const latest = useRef<Note[]>([])
  const messageTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    let live = true
    void Promise.all([getNotes(), getPrefs()])
      .then(([storedNotes, storedPrefs]) => {
        if (!live) return
        setNotes(storedNotes)
        setPrefs(storedPrefs)
      })
      .finally(() => {
        if (live) setLoaded(true)
      })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    latest.current = notes
    if (!loaded || !dirty.current) return
    const handle = setTimeout(() => {
      dirty.current = false
      void saveAllNotes(notes).finally(() => setSaving(false))
    }, 300)
    return () => clearTimeout(handle)
  }, [notes, loaded])

  useEffect(() => {
    const flush = () => {
      if (dirty.current) {
        dirty.current = false
        void saveAllNotes(latest.current)
      }
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
      clearTimeout(messageTimer.current)
    }
  }, [])

  useEffect(() => {
    if (loaded) void savePrefs(prefs)
  }, [prefs, loaded])

  const flash = (text: string) => {
    clearTimeout(messageTimer.current)
    setMessage(text)
    messageTimer.current = setTimeout(() => setMessage(null), 4000)
  }

  const mutate = (fn: (prev: Note[]) => Note[]) => {
    dirty.current = true
    setSaving(true)
    setNotes(fn)
  }

  const updateNote = (id: string, patch: Partial<Note>, touch = true) => {
    mutate((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, ...(touch ? { updatedAt: Date.now() } : {}) } : n)),
    )
  }

  const updatePrefs = useCallback((patch: Partial<NotesPrefs>) => setPrefs((p) => ({ ...p, ...patch })), [])

  const onZoom = useCallback((change: number | 'reset') => {
    setPrefs((p) => ({
      ...p,
      zoom: change === 'reset' ? 100 : Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, p.zoom + change)),
    }))
  }, [])

  const active = notes.find((n) => n.id === activeId) ?? null
  const fallbackTitle = t('notes.untitled')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? notes.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
      : notes
    return sortNotes(list, prefs.sort)
  }, [notes, query, prefs.sort])

  const addNote = () => {
    const note = createNote()
    mutate((prev) => [note, ...prev])
    setQuery('')
    setActiveId(note.id)
    setFreshId(note.id)
  }

  const duplicate = (note: Note) => {
    const copy = createNote({
      title: note.title.trim() ? t('notes.copyOf', { title: note.title.trim() }) : '',
      body: note.body,
      color: note.color,
    })
    mutate((prev) => [copy, ...prev])
    setActiveId(copy.id)
    flash(t('notes.duplicated'))
  }

  const removeNote = (id: string) => {
    mutate((prev) => prev.filter((n) => n.id !== id))
    setActiveId((current) => (current === id ? null : current))
    flash(t('notes.deleted'))
  }

  const requestDelete = (id: string) => {
    if (prefs.confirmDelete) setPendingDelete(id)
    else removeNote(id)
  }

  const saveNow = () => {
    dirty.current = false
    void saveAllNotes(notes).finally(() => {
      setSaving(false)
      flash(t('notes.saved'))
    })
  }

  const run = (task: () => Promise<void> | void, success?: string) => {
    void Promise.resolve()
      .then(task)
      .then(
        () => success && flash(success),
        () => flash(t('notes.actionFailed')),
      )
  }

  const importFiles = async (files: FileList) => {
    const imported: Note[] = []
    let failed = 0
    for (const file of Array.from(files)) {
      try {
        const text = await file.text()
        if (/\.json$/i.test(file.name) || file.type === 'application/json') {
          imported.push(...parseBackup(text).map((n) => normalizeNote({ ...n, id: undefined })))
        } else {
          imported.push(createNote(textFileToNote(file.name, text)))
        }
      } catch {
        failed += 1
      }
    }
    if (imported.length) mutate((prev) => [...imported, ...prev])
    flash(
      failed
        ? t('notes.importPartial', { count: imported.length, failed })
        : t('notes.imported', { count: imported.length }),
    )
  }

  const savedLabel = active
    ? saving
      ? t('notes.saving')
      : t('notes.edited', { time: formatTimestamp(new Date(active.updatedAt)) })
    : ''

  const pendingNote = notes.find((n) => n.id === pendingDelete)

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="@container flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 gap-3">
          <aside
            className={cn(
              'min-h-0 w-full flex-col gap-2 @[620px]:flex @[620px]:w-60 @[620px]:shrink-0',
              active ? 'hidden' : 'flex',
            )}
          >
            <div className="flex items-center gap-1.5">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder={t('notes.search')}
                ariaLabel={t('notes.search')}
                className="flex-1"
              />
              <Button size="icon-sm" onClick={addNote} aria-label={t('notes.new')} title={t('notes.new')}>
                <PlusIcon />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon-sm" variant="ghost" aria-label={t('notes.listOptions')} title={t('notes.listOptions')}>
                    <EllipsisVerticalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))]"
                >
                  <DropdownMenuLabel>{t('notes.sortBy')}</DropdownMenuLabel>
                  {SORTS.map((sort) => (
                    <DropdownMenuCheckboxItem
                      key={sort}
                      checked={prefs.sort === sort}
                      onCheckedChange={() => updatePrefs({ sort })}
                    >
                      {t(`notes.sort.${sort}`)}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={!notes.length}
                    onSelect={() => run(() => exportAllAsZip(sortNotes(notes, prefs.sort), fallbackTitle))}
                  >
                    <ArchiveIcon />
                    {t('notes.exportAllZip')}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!notes.length} onSelect={() => run(() => exportBackup(notes))}>
                    <DownloadIcon />
                    {t('notes.backup')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
                    <UploadIcon />
                    {t('notes.import')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={prefs.confirmDelete}
                    onCheckedChange={(v) => updatePrefs({ confirmDelete: v === true })}
                  >
                    {t('notes.confirmDelete')}
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".txt,.md,.markdown,.json,text/plain,text/markdown,application/json"
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files
                  if (files?.length) void importFiles(files)
                  e.target.value = ''
                }}
              />
            </div>
            {message && (
              <p role="status" className="rounded-md bg-primary/10 px-2 py-1 text-[11px] text-foreground">
                {message}
              </p>
            )}
            <div className="scrollbar-styled min-h-0 flex-1 overflow-y-auto pr-0.5">
              {!loaded ? (
                <p className="text-[11px] text-muted-foreground">{t('nav.loading')}</p>
              ) : notes.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-10 text-center">
                  <NotebookPenIcon className="size-6 text-muted-foreground" aria-hidden />
                  <p className="text-xs text-muted-foreground">{t('notes.empty')}</p>
                  <Button size="xs" onClick={addNote}>
                    <PlusIcon />
                    {t('notes.new')}
                  </Button>
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-6 text-center text-[11px] text-muted-foreground">{t('notes.noMatches')}</p>
              ) : (
                <NoteList notes={filtered} activeId={activeId} onSelect={setActiveId} />
              )}
            </div>
            {loaded && notes.length > 0 && (
              <p className="text-[10.5px] text-muted-foreground">
                {query.trim()
                  ? t('notes.matchCount', { count: filtered.length, total: notes.length })
                  : t('notes.count', { count: notes.length })}
              </p>
            )}
          </aside>

          <section className={cn('min-w-0 flex-1 flex-col gap-1.5 @[620px]:flex', active ? 'flex' : 'hidden')}>
            {active ? (
              <>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="@[620px]:hidden"
                    onClick={() => setActiveId(null)}
                    aria-label={t('notes.allNotes')}
                    title={t('notes.allNotes')}
                  >
                    <ArrowLeftIcon />
                  </Button>
                  <Input
                    value={active.title}
                    onChange={(e) => updateNote(active.id, { title: e.target.value })}
                    placeholder={noteDisplayTitle({ title: '', body: active.body }, t('notes.title'))}
                    aria-label={t('notes.title')}
                    className="h-8 min-w-0 flex-1 text-sm font-medium"
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => updateNote(active.id, { pinned: !active.pinned }, false)}
                    aria-label={active.pinned ? t('common.unpin') : t('common.pin')}
                    title={active.pinned ? t('common.unpin') : t('common.pin')}
                    aria-pressed={active.pinned}
                  >
                    {active.pinned ? <PinOffIcon className="text-primary" /> : <PinIcon />}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon-sm" variant="ghost" aria-label={t('notes.color')} title={t('notes.color')}>
                        <PaletteIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-0">
                      <DropdownMenuLabel>{t('notes.color')}</DropdownMenuLabel>
                      <div className="grid grid-cols-4 gap-1 p-1">
                        {NOTE_COLORS.map((color) => (
                          <DropdownMenuItem
                            key={color}
                            aria-label={t(`notes.colors.${color}`)}
                            title={t(`notes.colors.${color}`)}
                            onSelect={() => updateNote(active.id, { color }, false)}
                            className="justify-center p-1"
                          >
                            <span
                              className={cn(
                                'flex size-6 items-center justify-center rounded-full border border-foreground/15',
                                NOTE_COLOR_STYLES[color].swatch,
                              )}
                            >
                              {active.color === color && (
                                <CheckIcon
                                  className={cn('size-3.5', color === 'charcoal' ? 'text-white' : 'text-foreground')}
                                />
                              )}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t('notes.noteOptions')}
                        title={t('notes.noteOptions')}
                      >
                        <EllipsisVerticalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="max-h-[min(26rem,var(--radix-dropdown-menu-content-available-height))]"
                    >
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="gap-2 [&_svg]:size-4">
                          <FileDownIcon />
                          {t('notes.exportAs')}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {EXPORT_FORMATS.map(({ format, label }) => (
                            <DropdownMenuItem
                              key={format}
                              onSelect={() => run(() => exportNote(active, format, fallbackTitle))}
                            >
                              {t(label)}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuItem
                        onSelect={() => run(() => copyNote(active, fallbackTitle, false), t('notes.copiedText'))}
                      >
                        <CopyIcon />
                        {t('notes.copyText')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => run(() => copyNote(active, fallbackTitle, true), t('notes.copiedFormatted'))}
                      >
                        <CopyIcon />
                        {t('notes.copyFormatted')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => printNote(active, fallbackTitle)}>
                        <PrinterIcon />
                        {t('notes.print')}
                        <span className="ml-auto text-xs text-muted-foreground">Ctrl+P</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={saveNow}>
                        <SaveIcon />
                        {t('notes.saveNow')}
                        <span className="ml-auto text-xs text-muted-foreground">Ctrl+S</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => duplicate(active)}>
                        <CopyPlusIcon />
                        {t('notes.duplicate')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="font-normal">
                        {t('notes.created', { time: formatTimestamp(new Date(active.createdAt)) })}
                        <br />
                        {t('notes.modified', { time: formatTimestamp(new Date(active.updatedAt)) })}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => requestDelete(active.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2Icon />
                        {t('notes.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <NoteEditor
                  key={active.id}
                  note={active}
                  prefs={prefs}
                  onBodyChange={(body) => updateNote(active.id, { body })}
                  onPrefsChange={updatePrefs}
                  onZoom={onZoom}
                  onSave={saveNow}
                  onPrint={() => printNote(active, fallbackTitle)}
                  autoFocus={active.id === freshId}
                  savedLabel={savedLabel}
                />
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
                <NotebookPenIcon className="size-6 text-muted-foreground" aria-hidden />
                <p className="text-[11px] text-muted-foreground">{t('notes.select')}</p>
              </div>
            )}
          </section>
        </div>
      </div>
      <ConfirmDialog
        open={pendingNote !== undefined}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title={t('notes.deleteTitle')}
        description={t('notes.deleteDescription', {
          title: pendingNote ? noteDisplayTitle(pendingNote, fallbackTitle) : '',
        })}
        confirmLabel={t('notes.delete')}
        destructive
        onConfirm={() => {
          if (pendingDelete) removeNote(pendingDelete)
        }}
      />
    </ToolPage>
  )
}
