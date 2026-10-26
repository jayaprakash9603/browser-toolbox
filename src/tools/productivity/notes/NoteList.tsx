import { memo, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  PaletteIcon,
  PinIcon,
  PinOffIcon,
  RotateCcwIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { ColorMenu } from './ColorMenu'
import { NOTE_COLOR_STYLES } from './noteColors'
import { noteDisplayTitle, noteSnippet } from './notesFormat'
import {
  checklistProgress,
  highlightParts,
  noteTags,
  shortDate,
  snippetAround,
  type NoteSection,
  type NotesView,
} from './notesLogic'
import type { Note, NoteColor } from './notesService'

export interface NoteRowActions {
  open: (note: Note) => void
  togglePin: (note: Note) => void
  setColor: (note: Note, color: NoteColor) => void
  toggleArchive: (note: Note) => void
  trash: (note: Note) => void
  restore: (note: Note) => void
  deleteForever: (note: Note) => void
}

function Highlighted({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightParts(text, query).map((part, i) =>
        part.match ? (
          <mark key={i} className="rounded-[3px] bg-amber-300/70 px-px text-inherit dark:bg-amber-400/40">
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  )
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const { t } = useTranslation()
  const complete = done === total
  return (
    <span className="flex items-center gap-1.5" title={t('notes.progress', { done, total })}>
      <span className="relative h-1 w-12 overflow-hidden rounded-full bg-foreground/10" aria-hidden>
        <motion.span
          className={cn('absolute inset-y-0 left-0 w-full origin-left rounded-full', complete ? 'bg-emerald-500' : 'bg-primary')}
          initial={false}
          animate={{ scaleX: total ? done / total : 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        />
      </span>
      <span className={cn('tabular-nums', complete && 'text-emerald-600 dark:text-emerald-400')}>
        {t('notes.progress', { done, total })}
      </span>
    </span>
  )
}

interface NoteRowProps {
  note: Note
  active: boolean
  fresh: boolean
  query: string
  compact: boolean
  view: NotesView
  now: number
  actions: NoteRowActions
}

const NoteRow = memo(function NoteRow({ note, active, fresh, query, compact, view, now, actions }: NoteRowProps) {
  const { t } = useTranslation()
  const title = noteDisplayTitle(note, t('notes.untitled'))
  const snippet = compact ? '' : snippetAround(noteSnippet(note, query ? 2000 : 140), query).slice(0, 160)
  const tags = compact ? [] : noteTags(note)
  const progress = compact ? null : checklistProgress(note.body)
  const colors = NOTE_COLOR_STYLES[note.color]
  const inTrash = view === 'trash'
  const stamp = inTrash ? (note.trashedAt ?? note.updatedAt) : note.updatedAt
  const quick = 'size-7 rounded-md text-current/70 hover:bg-foreground/10 hover:text-current'

  return (
    <div
      className={cn(
        'group/row relative overflow-hidden rounded-xl border border-l-[3px] shadow-xs transition-[box-shadow,border-color,transform] duration-200',
        'hover:-translate-y-px hover:border-foreground/20 hover:shadow-md focus-within:border-foreground/20',
        colors.surface,
        colors.accent,
        active && 'border-primary/50 ring-2 ring-primary/40',
      )}
    >
      {fresh && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-primary/15 ring-2 ring-primary/50 ring-inset"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        />
      )}
      <button
        type="button"
        data-note-row
        aria-current={active ? 'true' : undefined}
        onClick={() => actions.open(note)}
        className="block w-full cursor-pointer px-3 py-2 text-left outline-none focus-visible:bg-foreground/5"
      >
        <span className="flex items-center gap-1.5">
          {note.pinned && !inTrash && (
            <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} className="flex">
              <PinIcon className="size-3 shrink-0 fill-primary/30 text-primary" aria-label={t('notes.pinned')} />
            </motion.span>
          )}
          <span className="min-w-0 flex-1 truncate text-[13px] leading-5 font-semibold">
            <Highlighted text={title} query={query} />
          </span>
          <span className="shrink-0 text-[10.5px] tabular-nums opacity-60 transition-opacity group-hover/row:opacity-0 group-focus-within/row:opacity-0 pointer-coarse:opacity-0">
            {shortDate(stamp, now)}
          </span>
        </span>
        {snippet && (
          <span className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug opacity-70">
            <Highlighted text={snippet} query={query} />
          </span>
        )}
        {((progress && progress.total > 0) || tags.length > 0) && (
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] opacity-80">
            {progress && progress.total > 0 && <ProgressBar done={progress.done} total={progress.total} />}
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-violet-500/12 px-1.5 leading-4 font-medium text-violet-700 dark:text-violet-300">
                #{tag}
              </span>
            ))}
            {tags.length > 3 && <span className="opacity-70">+{tags.length - 3}</span>}
          </span>
        )}
      </button>

      <div
        className={cn(
          'absolute top-1 right-1 flex items-center gap-0.5 rounded-lg p-0.5 opacity-0 transition-opacity duration-150',
          'group-hover/row:opacity-100 group-focus-within/row:opacity-100 pointer-coarse:opacity-100 has-[[data-state=open]]:opacity-100',
          colors.surface,
        )}
      >
        {inTrash ? (
          <>
            <Button
              size="icon-xs"
              variant="ghost"
              className={quick}
              onClick={() => actions.restore(note)}
              aria-label={t('notes.quick.restore', { title })}
              title={t('notes.restore')}
            >
              <RotateCcwIcon />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              className={cn(quick, 'hover:text-destructive')}
              onClick={() => actions.deleteForever(note)}
              aria-label={t('notes.quick.deleteForever', { title })}
              title={t('notes.deleteForever')}
            >
              <XIcon />
            </Button>
          </>
        ) : (
          <>
            {!note.archived && (
              <Button
                size="icon-xs"
                variant="ghost"
                className={quick}
                onClick={() => actions.togglePin(note)}
                aria-pressed={note.pinned}
                aria-label={t(note.pinned ? 'notes.quick.unpin' : 'notes.quick.pin', { title })}
                title={note.pinned ? t('common.unpin') : t('common.pin')}
              >
                {note.pinned ? <PinOffIcon /> : <PinIcon />}
              </Button>
            )}
            <ColorMenu value={note.color} onChange={(color) => actions.setColor(note, color)}>
              <Button
                size="icon-xs"
                variant="ghost"
                className={quick}
                aria-label={t('notes.quick.color', { title })}
                title={t('notes.color')}
              >
                <PaletteIcon />
              </Button>
            </ColorMenu>
            <Button
              size="icon-xs"
              variant="ghost"
              className={quick}
              onClick={() => actions.toggleArchive(note)}
              aria-label={t(note.archived ? 'notes.quick.unarchive' : 'notes.quick.archive', { title })}
              title={note.archived ? t('notes.unarchive') : t('notes.archive')}
            >
              {note.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              className={cn(quick, 'hover:text-destructive')}
              onClick={() => actions.trash(note)}
              aria-label={t('notes.quick.trash', { title })}
              title={t('notes.trash')}
            >
              <Trash2Icon />
            </Button>
          </>
        )}
      </div>
    </div>
  )
})

interface NoteListProps {
  sections: NoteSection[]
  activeId: string | null
  freshId: string | null
  query: string
  compact: boolean
  view: NotesView
  now: number
  actions: NoteRowActions
}

/** Arrow keys move between rows; Home/End jump to the ends. */
function onListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const target = event.target as HTMLElement
  if (!target.matches('[data-note-row]')) return
  const rows = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-note-row]')]
  const index = rows.indexOf(target)
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? rows.length - 1
        : Math.min(rows.length - 1, Math.max(0, index + (event.key === 'ArrowDown' ? 1 : -1)))
  event.preventDefault()
  rows[next]?.focus()
}

export function NoteList({ sections, activeId, freshId, query, compact, view, now, actions }: NoteListProps) {
  const { t } = useTranslation()
  const single = sections.length === 1 && sections[0].id === 'notes'
  return (
    <div className="flex flex-col gap-3" onKeyDown={onListKeyDown}>
      {sections.map((section) => (
        <section key={section.id} aria-label={t(`notes.section.${section.id}`)}>
          {!single && (
            <h3 className="sticky top-0 z-10 -mx-1 mb-1.5 flex items-center gap-1.5 bg-background/85 px-1 py-1 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase backdrop-blur-sm">
              {t(`notes.section.${section.id}`)}
              <span className="font-medium tabular-nums opacity-70">{section.notes.length}</span>
            </h3>
          )}
          <ul className="flex flex-col gap-1.5" aria-label={t('notes.listLabel')}>
            <AnimatePresence initial={false}>
              {section.notes.map((note) => (
                <motion.li
                  key={note.id}
                  layout="position"
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -24, transition: { duration: 0.16 } }}
                  transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                >
                  <NoteRow
                    note={note}
                    active={note.id === activeId}
                    fresh={note.id === freshId}
                    query={query}
                    compact={compact}
                    view={view}
                    now={now}
                    actions={actions}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      ))}
    </div>
  )
}
