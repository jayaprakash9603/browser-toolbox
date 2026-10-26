import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  PaletteIcon,
  PinIcon,
  PinOffIcon,
  RotateCcwIcon,
  Trash2Icon,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { cn } from '@/shared/utils/cn'

import { ColorMenu } from './ColorMenu'
import { noteDisplayTitle } from './notesFormat'
import { noteTags } from './notesLogic'
import type { Note, NoteColor } from './notesService'

interface NoteHeaderProps {
  note: Note
  showBack: boolean
  activeTag: string | null
  onBack: () => void
  onTitle: (title: string) => void
  onTogglePin: () => void
  onColor: (color: NoteColor) => void
  onToggleArchive: () => void
  onRestore: () => void
  onDeleteForever: () => void
  onTag: (tag: string) => void
  /** Items for the "Note options" menu. */
  options: ReactNode
}

export function NoteHeader({
  note,
  showBack,
  activeTag,
  onBack,
  onTitle,
  onTogglePin,
  onColor,
  onToggleArchive,
  onRestore,
  onDeleteForever,
  onTag,
  options,
}: NoteHeaderProps) {
  const { t } = useTranslation()
  const inTrash = note.trashedAt != null
  const tags = noteTags(note)

  return (
    <div className="flex flex-col gap-1.5">
      <AnimatePresence initial={false}>
        {inTrash && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-1.5 text-[12px]">
              <Trash2Icon className="size-3.5 shrink-0 text-destructive" aria-hidden />
              <span className="min-w-0 flex-1">{t('notes.inTrash')}</span>
              <Button size="xs" variant="outline" onClick={onRestore}>
                <RotateCcwIcon />
                {t('notes.restore')}
              </Button>
              <Button size="xs" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDeleteForever}>
                {t('notes.deleteForever')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1">
        {showBack && (
          <Button size="icon-sm" variant="ghost" onClick={onBack} aria-label={t('notes.allNotes')} title={t('notes.allNotes')}>
            <ArrowLeftIcon />
          </Button>
        )}
        <input
          value={note.title}
          onChange={(e) => onTitle(e.target.value)}
          readOnly={inTrash}
          placeholder={noteDisplayTitle({ title: '', body: note.body }, t('notes.title'))}
          aria-label={t('notes.title')}
          className="h-9 min-w-0 flex-1 rounded-md bg-transparent px-1.5 text-[17px] font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60 hover:bg-accent/40 focus-visible:bg-accent/40"
        />
        {!inTrash && (
          <>
            {!note.archived && (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={onTogglePin}
                aria-label={note.pinned ? t('common.unpin') : t('common.pin')}
                title={note.pinned ? t('common.unpin') : t('common.pin')}
                aria-pressed={note.pinned}
              >
                <motion.span key={String(note.pinned)} initial={{ scale: 0.5, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} className="flex">
                  {note.pinned ? <PinOffIcon className="text-primary" /> : <PinIcon />}
                </motion.span>
              </Button>
            )}
            <ColorMenu value={note.color} onChange={onColor}>
              <Button size="icon-sm" variant="ghost" aria-label={t('notes.color')} title={t('notes.color')}>
                <PaletteIcon />
              </Button>
            </ColorMenu>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onToggleArchive}
              aria-label={note.archived ? t('notes.unarchive') : t('notes.archive')}
              title={note.archived ? t('notes.unarchive') : t('notes.archive')}
            >
              {note.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
            </Button>
          </>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label={t('notes.noteOptions')} title={t('notes.noteOptions')}>
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[min(26rem,var(--radix-dropdown-menu-content-available-height))]">
            {options}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1.5">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={activeTag === tag}
              onClick={() => onTag(tag)}
              title={t('notes.filters.byTag', { tag })}
              className={cn(
                'cursor-pointer rounded-full px-2 text-[11px] leading-5 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                activeTag === tag
                  ? 'bg-violet-500 text-white'
                  : 'bg-violet-500/12 text-violet-700 hover:bg-violet-500/20 dark:text-violet-300',
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
