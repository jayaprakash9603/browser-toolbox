import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import {
  ArchiveIcon,
  ArrowDownUpIcon,
  ChevronDownIcon,
  CopyIcon,
  CopyPlusIcon,
  CornerDownLeftIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  FileDownIcon,
  PenLineIcon,
  PlusIcon,
  PrinterIcon,
  SaveIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from 'lucide-react'

import { getActiveWebTab } from '@/chrome/contentScriptClient'
import { ToolPage } from '@/shared/components/ToolPage'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { SearchInput } from '@/shared/components/SearchInput'
import { Button } from '@/shared/components/ui/button'
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

import './i18n'
import { useProductivityTool } from '../_shared'
import { ColorSwatch } from './ColorMenu'
import { useElementWidth, useNotesStore, useNow } from './hooks'
import { NoteEditor } from './NoteEditor'
import { NoteHeader } from './NoteHeader'
import { NoteList, type NoteRowActions } from './NoteList'
import { NotesEmpty, type NotesEmptyKind } from './NotesEmpty'
import { NotesHome, TEMPLATE_STYLES } from './NotesHome'
import { NotesNav } from './NotesNav'
import { NotesToast, useNotesToast } from './NotesToast'
import { copyNote, exportAllAsZip, exportBackup, exportNote, printNote, type NoteExportFormat } from './notesExport'
import { formatTimestamp, noteDisplayTitle, parseBackup, textFileToNote } from './notesFormat'
import { DEFAULT_FILTER, filterNotes, groupNotes, notesCounts, type NotesFilter, type NotesView } from './notesLogic'
import { createNote, normalizeNote, sortNotes, ZOOM_MAX, ZOOM_MIN, type Note, type NoteColor, type NotesSort } from './notesService'
import { NOTE_TEMPLATES, templateNote, type NoteTemplate } from './templates'

const EXPORT_FORMATS: { format: NoteExportFormat; label: string }[] = [
  { format: 'txt', label: 'notes.export.txt' },
  { format: 'md', label: 'notes.export.md' },
  { format: 'html', label: 'notes.export.html' },
  { format: 'doc', label: 'notes.export.doc' },
  { format: 'pdf', label: 'notes.export.pdf' },
]

const SORTS: NotesSort[] = ['modified', 'created', 'title']
const THREE_COLUMNS = 860
const TWO_COLUMNS = 580
const FLASH_MS = 1800

type PendingDelete = { kind: 'note'; note: Note } | { kind: 'emptyTrash'; count: number }

function isTyping(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]') != null
}

export default function NotesTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.notes')
  const { notes, prefs, loaded, saving, mutate, saveNow, setPrefs, updatePrefs } = useNotesStore()
  const toast = useNotesToast()
  const now = useNow()

  const [filter, setFilter] = useState<NotesFilter>(DEFAULT_FILTER)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [draft, setDraft] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const width = useElementWidth(rootRef)
  const layout = width >= THREE_COLUMNS ? 'three' : width >= TWO_COLUMNS ? 'two' : 'one'
  const fallbackTitle = t('notes.untitled')

  const counts = useMemo(() => notesCounts(notes), [notes])
  const filtered = useMemo(() => filterNotes(notes, filter, prefs.sort), [notes, filter, prefs.sort])
  const sections = useMemo(
    () => groupNotes(filtered, { sort: prefs.sort, grouped: prefs.grouped && !filter.query.trim(), view: filter.view, now }),
    [filtered, prefs.sort, prefs.grouped, filter.query, filter.view, now],
  )
  const recent = useMemo(
    () => sortNotes(notes.filter((n) => n.trashedAt == null && !n.archived), 'modified').slice(0, 4),
    [notes],
  )
  const active = notes.find((n) => n.id === activeId) ?? null
  const hasFilters = filter.tag != null || filter.color != null
  const isLiveView = filter.view !== 'archive' && filter.view !== 'trash'

  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const flash = (id: string) => {
    clearTimeout(flashTimer.current)
    setFlashId(id)
    flashTimer.current = setTimeout(() => setFlashId(null), FLASH_MS)
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateNote = (id: string, patch: Partial<Note>, touch = true) =>
    mutate((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch, ...(touch ? { updatedAt: Date.now() } : {}) } : n)))

  /** Puts back the given snapshots (and removes `removeIds`), for Undo. */
  const restoreSnapshots = (snapshots: Note[], removeIds: string[] = []) =>
    mutate((prev) => {
      const byId = new Map(snapshots.map((n) => [n.id, n]))
      const kept = prev.filter((n) => !removeIds.includes(n.id)).map((n) => byId.get(n.id) ?? n)
      const missing = snapshots.filter((n) => !prev.some((p) => p.id === n.id))
      return [...missing, ...kept]
    })

  const undoAction = (snapshots: Note[], removeIds: string[] = []) => ({
    label: t('notes.undo'),
    undo: true,
    run: () => restoreSnapshots(snapshots, removeIds),
  })

  const leaveIfHidden = (id: string) => {
    if (activeId === id) setActiveId(null)
  }

  /** New notes land in a live view and inherit the active tag/color filter so they stay visible. */
  const startNote = (partial: Pick<Note, 'title' | 'body'>, { open = true } = {}) => {
    const tagged = filter.tag && !partial.body.includes(`#${filter.tag}`) ? `${partial.body}${partial.body ? '\n\n' : ''}#${filter.tag} ` : partial.body
    const note = createNote({ ...partial, body: tagged, ...(filter.color ? { color: filter.color } : {}) })
    mutate((prev) => [note, ...prev])
    if (!isLiveView) setFilter((f) => ({ ...f, view: 'all' }))
    else if (filter.view === 'pinned') setFilter((f) => ({ ...f, view: 'all' }))
    if (open) {
      setActiveId(note.id)
      setFocusId(note.id)
    } else {
      flash(note.id)
    }
    return note
  }

  const createFromTemplate = async (template: NoteTemplate) => {
    setFilter((f) => ({ ...f, query: '' }))
    if (template !== 'page') {
      startNote(templateNote(template, t))
      return
    }
    let page: { title: string; url: string } | null = null
    try {
      const tab = await getActiveWebTab()
      if (tab?.url) page = { title: tab.title ?? '', url: tab.url }
    } catch {
      page = null
    }
    if (!page) {
      toast.show(t('notes.toast.noPage'))
      return
    }
    startNote(templateNote('page', t, { page }))
  }

  const quickAdd = (open: boolean) => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    const note = startNote({ title: '', body: text }, { open })
    if (!open) {
      toast.show(t('notes.toast.added'), { label: t('notes.toast.open'), run: () => setActiveId(note.id) })
    }
  }

  const togglePin = (note: Note) => {
    updateNote(note.id, { pinned: !note.pinned }, false)
    toast.show(t(note.pinned ? 'notes.toast.unpinned' : 'notes.toast.pinned'), undoAction([note]))
  }

  const setColor = (note: Note, color: NoteColor) => updateNote(note.id, { color }, false)

  const toggleArchive = (note: Note) => {
    updateNote(note.id, { archived: !note.archived, pinned: note.archived ? note.pinned : false }, false)
    leaveIfHidden(note.id)
    toast.show(t(note.archived ? 'notes.toast.unarchived' : 'notes.toast.archived'), undoAction([note]))
  }

  const trash = (note: Note) => {
    updateNote(note.id, { trashedAt: Date.now() }, false)
    leaveIfHidden(note.id)
    toast.show(t('notes.toast.trashed'), undoAction([note]))
  }

  const restore = (note: Note) => {
    updateNote(note.id, { trashedAt: null }, false)
    toast.show(t('notes.toast.restored'), undoAction([note]))
  }

  const removeForever = (note: Note) => {
    mutate((prev) => prev.filter((n) => n.id !== note.id))
    leaveIfHidden(note.id)
    toast.show(t('notes.toast.deletedForever'), prefs.confirmDelete ? undefined : undoAction([note]))
  }

  const requestDeleteForever = (note: Note) => {
    if (prefs.confirmDelete) setPendingDelete({ kind: 'note', note })
    else removeForever(note)
  }

  const emptyTrash = () => {
    const gone = notes.filter((n) => n.trashedAt != null)
    mutate((prev) => prev.filter((n) => n.trashedAt == null))
    if (active?.trashedAt != null) setActiveId(null)
    toast.show(t('notes.toast.trashEmptied', { count: gone.length }))
  }

  const duplicate = (note: Note) => {
    const copy = createNote({
      title: note.title.trim() ? t('notes.copyOf', { title: note.title.trim() }) : '',
      body: note.body,
      color: note.color,
    })
    mutate((prev) => [copy, ...prev])
    setActiveId(copy.id)
    flash(copy.id)
    toast.show(t('notes.duplicated'), undoAction([], [copy.id]))
  }

  const run = (task: () => Promise<void> | void, success?: string) => {
    void Promise.resolve()
      .then(task)
      .then(
        () => success && toast.show(success),
        () => toast.show(t('notes.actionFailed')),
      )
  }

  const save = () => {
    void saveNow().then(() => toast.show(t('notes.saved')))
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
    toast.show(
      failed
        ? t('notes.importPartial', { count: imported.length, failed })
        : t('notes.imported', { count: imported.length }),
      imported.length ? undoAction([], imported.map((n) => n.id)) : undefined,
    )
  }

  const onZoom = useCallback(
    (change: number | 'reset') =>
      setPrefs((p) => ({
        ...p,
        zoom: change === 'reset' ? 100 : Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, p.zoom + change)),
      })),
    [setPrefs],
  )

  const rowActions: NoteRowActions = {
    open: (note) => setActiveId(note.id),
    togglePin,
    setColor,
    toggleArchive,
    trash,
    restore,
    deleteForever: requestDeleteForever,
  }

  // ── Filters ────────────────────────────────────────────────────────────────

  const setView = (view: NotesView) => setFilter((f) => ({ ...f, view }))
  const setTag = (tag: string | null) => setFilter((f) => ({ ...f, tag, view: f.view === 'trash' ? 'all' : f.view }))
  const setColorFilter = (color: NoteColor | null) => setFilter((f) => ({ ...f, color }))
  const clearFilters = () => setFilter((f) => ({ ...f, tag: null, color: null, query: '' }))

  // ── Keyboard ───────────────────────────────────────────────────────────────

  const keyState = useRef({ layout, activeId, hasFilters, toast, startBlank: () => {} })
  useEffect(() => {
    keyState.current = { layout, activeId, hasFilters, toast, startBlank: () => void createFromTemplate('blank') }
  })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const state = keyState.current
      const typing = isTyping(event.target)
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !typing && state.toast.runAction(true)) {
        event.preventDefault()
        return
      }
      if (typing || event.ctrlKey || event.metaKey || event.altKey) return
      if (document.querySelector('[role="dialog"], [role="menu"]')) return
      if (event.key === 'n') {
        event.preventDefault()
        state.startBlank()
      } else if (event.key === 'Escape') {
        if (state.activeId && state.layout === 'one') setActiveId(null)
        else if (state.hasFilters) setFilter((f) => ({ ...f, tag: null, color: null }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Rendering ──────────────────────────────────────────────────────────────

  const savedLabel = active
    ? saving
      ? t('notes.saving')
      : t('notes.edited', { time: formatTimestamp(new Date(active.updatedAt)) })
    : ''

  const emptyKind: NotesEmptyKind = filter.query.trim()
    ? 'search'
    : hasFilters
      ? 'filter'
      : filter.view

  const templateMenuItems = NOTE_TEMPLATES.map((template) => {
    const { icon: Icon } = TEMPLATE_STYLES[template]
    return (
      <DropdownMenuItem key={template} onSelect={() => void createFromTemplate(template)}>
        <Icon className="size-4" />
        {t(`notes.template.${template}`)}
      </DropdownMenuItem>
    )
  })

  const listHeader = (
    <div className="flex shrink-0 flex-col gap-2 px-[var(--density-page-pad)] pt-[var(--density-page-pad)] pb-2">
      <div className="flex items-center gap-1.5">
        <SearchInput
          value={filter.query}
          onChange={(query) => setFilter((f) => ({ ...f, query }))}
          placeholder={t('notes.search')}
          ariaLabel={t('notes.search')}
          shortcut="/"
          className="min-w-0 flex-1"
        />
        <div className="flex shrink-0 overflow-hidden rounded-md shadow-sm">
          <Button
            size="icon-sm"
            className="rounded-none"
            onClick={() => void createFromTemplate('blank')}
            aria-label={t('notes.new')}
            title={`${t('notes.new')} (N)`}
          >
            <PlusIcon />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon-sm"
                className="w-6 rounded-none border-l border-primary-foreground/20"
                aria-label={t('notes.template.menu')}
                title={t('notes.template.menu')}
              >
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>{t('notes.template.menu')}</DropdownMenuLabel>
              {templateMenuItems}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label={t('notes.listOptions')} title={t('notes.listOptions')}>
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[min(26rem,var(--radix-dropdown-menu-content-available-height))] w-56">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2 [&_svg]:size-4">
                <ArrowDownUpIcon />
                {t('notes.sortBy')}
                <span className="ml-auto text-xs text-muted-foreground">{t(`notes.sort.${prefs.sort}`)}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {SORTS.map((sort) => (
                  <DropdownMenuCheckboxItem key={sort} checked={prefs.sort === sort} onCheckedChange={() => updatePrefs({ sort })}>
                    {t(`notes.sort.${sort}`)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuCheckboxItem checked={prefs.grouped} onCheckedChange={(v) => updatePrefs({ grouped: v === true })}>
              {t('notes.groupByDate')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={prefs.compact} onCheckedChange={(v) => updatePrefs({ compact: v === true })}>
              {t('notes.compact')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!notes.length}
              onSelect={() => run(() => exportAllAsZip(sortNotes(notes.filter((n) => n.trashedAt == null), prefs.sort), fallbackTitle))}
            >
              <ArchiveIcon className="size-4" />
              {t('notes.exportAllZip')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!notes.length} onSelect={() => run(() => exportBackup(notes))}>
              <DownloadIcon className="size-4" />
              {t('notes.backup')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
              <UploadIcon className="size-4" />
              {t('notes.import')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={prefs.confirmDelete}
              onCheckedChange={(v) => updatePrefs({ confirmDelete: v === true })}
            >
              {t('notes.confirmDelete')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuItem
              disabled={!counts.views.trash}
              onSelect={() => setPendingDelete({ kind: 'emptyTrash', count: counts.views.trash })}
              className="text-destructive focus:text-destructive"
            >
              <Trash2Icon className="size-4" />
              {t('notes.emptyTrash')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLiveView && (
        <form
          className="group/quick relative"
          onSubmit={(e) => {
            e.preventDefault()
            quickAdd(false)
          }}
        >
          <PenLineIcon
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/quick:text-primary"
            aria-hidden
          />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                quickAdd(true)
              } else if (e.key === 'Escape' && draft) {
                e.preventDefault()
                e.stopPropagation()
                setDraft('')
              }
            }}
            placeholder={t('notes.quick.placeholder')}
            aria-label={t('notes.quick.label')}
            className="h-8 w-full rounded-lg border border-dashed border-input bg-transparent pr-9 pl-8 text-[12.5px] outline-none transition-[border-color,background-color,box-shadow] placeholder:text-muted-foreground/80 hover:border-foreground/25 focus-visible:border-solid focus-visible:border-primary/50 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-primary/15"
          />
          <AnimatePresence>
            {draft.trim() && (
              <motion.button
                type="submit"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md bg-primary text-primary-foreground"
                aria-label={t('notes.quick.save')}
                title={t('notes.quick.save')}
              >
                <CornerDownLeftIcon className="size-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </form>
      )}

      {layout !== 'three' && (
        <NotesNav filter={filter} counts={counts} layout="rail" onView={setView} onTag={setTag} onColor={setColorFilter} />
      )}

      <AnimatePresence initial={false}>
        {hasFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap items-center gap-1 overflow-hidden"
          >
            {filter.tag && (
              <button
                type="button"
                onClick={() => setTag(null)}
                aria-label={t('notes.filters.removeTag', { tag: filter.tag })}
                className="flex h-6 cursor-pointer items-center gap-1 rounded-full bg-violet-500/12 pr-1.5 pl-2 text-[11.5px] font-medium text-violet-700 outline-none hover:bg-violet-500/20 focus-visible:ring-2 focus-visible:ring-ring dark:text-violet-300"
              >
                #{filter.tag}
                <XIcon className="size-3" aria-hidden />
              </button>
            )}
            {filter.color && (
              <button
                type="button"
                onClick={() => setColorFilter(null)}
                aria-label={t('notes.filters.removeColor', { color: t(`notes.colors.${filter.color}`) })}
                className="flex h-6 cursor-pointer items-center gap-1 rounded-full bg-muted pr-1.5 pl-1.5 text-[11.5px] font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ColorSwatch color={filter.color} className="size-3" />
                {t(`notes.colors.${filter.color}`)}
                <XIcon className="size-3" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="h-6 cursor-pointer rounded-full px-2 text-[11.5px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t('notes.filters.clear')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  const listBody = !loaded ? (
    <div className="flex flex-col gap-1.5" aria-busy="true" aria-label={t('nav.loading')}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" style={{ opacity: 1 - i * 0.2 }} />
      ))}
    </div>
  ) : filtered.length === 0 ? (
    <NotesEmpty kind={emptyKind} query={filter.query.trim()}>
      {emptyKind === 'all' &&
        NOTE_TEMPLATES.slice(0, 3).map((template) => {
          const { icon: Icon } = TEMPLATE_STYLES[template]
          return (
            <Button key={template} size="xs" variant={template === 'blank' ? 'default' : 'outline'} onClick={() => void createFromTemplate(template)}>
              <Icon />
              {t(`notes.template.${template}`)}
            </Button>
          )
        })}
      {(emptyKind === 'filter' || emptyKind === 'search') && (
        <Button size="xs" variant="outline" onClick={clearFilters}>
          {t('notes.filters.clear')}
        </Button>
      )}
    </NotesEmpty>
  ) : (
    <>
      {filter.view === 'trash' && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11.5px] text-muted-foreground">
          <span className="min-w-0 flex-1">{t('notes.trashHint')}</span>
          <Button
            size="xs"
            variant="ghost"
            className="h-6 text-destructive hover:text-destructive"
            onClick={() => setPendingDelete({ kind: 'emptyTrash', count: counts.views.trash })}
          >
            {t('notes.emptyTrash')}
          </Button>
        </div>
      )}
      <NoteList
        sections={sections}
        activeId={activeId}
        freshId={flashId}
        query={filter.query}
        compact={prefs.compact}
        view={filter.view}
        now={now}
        actions={rowActions}
      />
    </>
  )

  const footer = loaded && (
    <div className="flex shrink-0 items-center gap-2 border-t px-[var(--density-page-pad)] py-1.5 text-[10.5px] text-muted-foreground">
      <span className="min-w-0 flex-1 truncate">
        {filter.query.trim() || hasFilters
          ? t('notes.matchCount', { count: filtered.length, total: counts.views[filter.view] })
          : t('notes.count', { count: filtered.length })}
      </span>
      <span className="flex items-center gap-1" aria-live="off">
        <span className={cn('size-1.5 rounded-full transition-colors', saving ? 'animate-pulse bg-amber-500' : 'bg-emerald-500')} aria-hidden />
        {saving ? t('notes.saving') : t('notes.saved')}
      </span>
    </div>
  )

  const noteOptions = active && (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="gap-2 [&_svg]:size-4">
          <FileDownIcon />
          {t('notes.exportAs')}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {EXPORT_FORMATS.map(({ format, label }) => (
            <DropdownMenuItem key={format} onSelect={() => run(() => exportNote(active, format, fallbackTitle))}>
              {t(label)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuItem onSelect={() => run(() => copyNote(active, fallbackTitle, false), t('notes.copiedText'))}>
        <CopyIcon className="size-4" />
        {t('notes.copyText')}
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => run(() => copyNote(active, fallbackTitle, true), t('notes.copiedFormatted'))}>
        <CopyIcon className="size-4" />
        {t('notes.copyFormatted')}
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => printNote(active, fallbackTitle)}>
        <PrinterIcon className="size-4" />
        {t('notes.print')}
        <span className="ml-auto text-xs text-muted-foreground">Ctrl+P</span>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={save}>
        <SaveIcon className="size-4" />
        {t('notes.saveNow')}
        <span className="ml-auto text-xs text-muted-foreground">Ctrl+S</span>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => duplicate(active)}>
        <CopyPlusIcon className="size-4" />
        {t('notes.duplicate')}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="font-normal text-muted-foreground">
        {t('notes.created', { time: formatTimestamp(new Date(active.createdAt)) })}
        <br />
        {t('notes.modified', { time: formatTimestamp(new Date(active.updatedAt)) })}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {active.trashedAt == null ? (
        <DropdownMenuItem onSelect={() => trash(active)} className="text-destructive focus:text-destructive">
          <Trash2Icon className="size-4" />
          {t('notes.trash')}
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem onSelect={() => requestDeleteForever(active)} className="text-destructive focus:text-destructive">
          <Trash2Icon className="size-4" />
          {t('notes.deleteForever')}
        </DropdownMenuItem>
      )}
    </>
  )

  const editorPane = active ? (
    <motion.div
      key={active.id}
      initial={{ opacity: 0, x: layout === 'one' ? 24 : 0, y: layout === 'one' ? 0 : 6 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{ type: 'spring', stiffness: 460, damping: 38 }}
      className="flex min-h-0 flex-1 flex-col gap-1.5"
    >
      <NoteHeader
        note={active}
        showBack={layout === 'one'}
        activeTag={filter.tag}
        onBack={() => setActiveId(null)}
        onTitle={(title) => updateNote(active.id, { title })}
        onTogglePin={() => togglePin(active)}
        onColor={(color) => setColor(active, color)}
        onToggleArchive={() => toggleArchive(active)}
        onRestore={() => restore(active)}
        onDeleteForever={() => requestDeleteForever(active)}
        onTag={(tag) => setTag(filter.tag === tag ? null : tag)}
        options={noteOptions}
      />
      <NoteEditor
        key={active.id}
        note={active}
        prefs={prefs}
        onBodyChange={(body) => updateNote(active.id, { body })}
        onPrefsChange={updatePrefs}
        onZoom={onZoom}
        onSave={save}
        onPrint={() => printNote(active, fallbackTitle)}
        autoFocus={active.id === focusId}
        savedLabel={savedLabel}
        readOnly={active.trashedAt != null}
      />
    </motion.div>
  ) : layout !== 'one' && loaded ? (
    <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="flex min-h-0 flex-1">
      <NotesHome recent={recent} counts={counts} now={now} onTemplate={(template) => void createFromTemplate(template)} onOpen={(note) => setActiveId(note.id)} />
    </motion.div>
  ) : null

  const showList = layout !== 'one' || !active

  return (
    <ToolPage tool={tool} contentClassName="overflow-hidden p-0">
      <MotionConfig reducedMotion="user">
        <div ref={rootRef} className="relative flex min-h-0 flex-1">
          {layout === 'three' && (
            <aside className="flex min-h-0 w-44 shrink-0 border-r py-[var(--density-page-pad)] pl-[var(--density-page-pad)]">
              <NotesNav filter={filter} counts={counts} layout="sidebar" onView={setView} onTag={setTag} onColor={setColorFilter} />
            </aside>
          )}

          {showList && (
            <section
              aria-label={t('notes.listLabel')}
              className={cn('flex min-h-0 min-w-0 flex-col', layout === 'one' ? 'flex-1' : 'w-[19rem] shrink-0 border-r')}
            >
              {listHeader}
              <div className="scrollbar-styled min-h-0 flex-1 overflow-y-auto px-[var(--density-page-pad)] pt-1 pb-16">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${filter.view}:${filter.tag ?? ''}:${filter.color ?? ''}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.08 } }}
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  >
                    {listBody}
                  </motion.div>
                </AnimatePresence>
              </div>
              {footer}
            </section>
          )}

          {(layout !== 'one' || active) && (
            <section className="flex min-h-0 min-w-0 flex-1 flex-col p-[var(--density-page-pad)]">
              <AnimatePresence mode="wait" initial={false}>
                {editorPane}
              </AnimatePresence>
            </section>
          )}

          <NotesToast api={toast} />
        </div>

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
        <ConfirmDialog
          open={pendingDelete !== null}
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null)
          }}
          title={pendingDelete?.kind === 'emptyTrash' ? t('notes.emptyTrashTitle') : t('notes.deleteTitle')}
          description={
            pendingDelete?.kind === 'emptyTrash'
              ? t('notes.emptyTrashDescription', { count: pendingDelete.count })
              : t('notes.deleteDescription', {
                  title: pendingDelete?.kind === 'note' ? noteDisplayTitle(pendingDelete.note, fallbackTitle) : '',
                })
          }
          confirmLabel={pendingDelete?.kind === 'emptyTrash' ? t('notes.emptyTrash') : t('notes.deleteForever')}
          destructive
          onConfirm={() => {
            if (pendingDelete?.kind === 'note') removeForever(pendingDelete.note)
            else if (pendingDelete?.kind === 'emptyTrash') emptyTrash()
          }}
        />
      </MotionConfig>
    </ToolPage>
  )
}
