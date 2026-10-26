import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import {
  BookOpenTextIcon,
  FilePlus2Icon,
  GlobeIcon,
  ListChecksIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/shared/utils/cn'

import { NOTE_COLOR_STYLES } from './noteColors'
import { noteDisplayTitle, noteSnippet } from './notesFormat'
import { shortDate, type NotesCounts } from './notesLogic'
import type { Note } from './notesService'
import { NOTE_TEMPLATES, type NoteTemplate } from './templates'

export const TEMPLATE_STYLES: Record<NoteTemplate, { icon: LucideIcon; tone: string }> = {
  blank: { icon: FilePlus2Icon, tone: 'bg-primary/12 text-primary' },
  checklist: { icon: ListChecksIcon, tone: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400' },
  meeting: { icon: UsersIcon, tone: 'bg-sky-500/12 text-sky-600 dark:text-sky-400' },
  journal: { icon: BookOpenTextIcon, tone: 'bg-amber-500/12 text-amber-600 dark:text-amber-400' },
  page: { icon: GlobeIcon, tone: 'bg-violet-500/12 text-violet-600 dark:text-violet-400' },
}

function greetingKey(now: number): string {
  const hour = new Date(now).getHours()
  return hour < 12 ? 'notes.home.morning' : hour < 18 ? 'notes.home.afternoon' : 'notes.home.evening'
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 32 } },
}

interface NotesHomeProps {
  recent: Note[]
  counts: NotesCounts
  now: number
  onTemplate: (template: NoteTemplate) => void
  onOpen: (note: Note) => void
}

export function NotesHome({ recent, counts, now, onTemplate, onOpen }: NotesHomeProps) {
  const { t } = useTranslation()
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="scrollbar-styled mx-auto flex w-full max-w-xl flex-col gap-6 overflow-y-auto px-1 py-4"
    >
      <motion.header variants={item}>
        <h2 className="text-xl leading-7 font-semibold tracking-tight">{t(greetingKey(now))}</h2>
        <p className="text-[12px] text-muted-foreground">
          {[
            t('notes.home.statNotes', { count: counts.views.all }),
            t('notes.home.statTodos', { count: counts.views.checklists }),
            t('notes.home.statTags', { count: counts.tags.length }),
          ].join(' · ')}
        </p>
      </motion.header>

      <section className="flex flex-col gap-2">
        <motion.h3 variants={item} className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {t('notes.home.start')}
        </motion.h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
          {NOTE_TEMPLATES.map((template) => {
            const { icon: Icon, tone } = TEMPLATE_STYLES[template]
            return (
              <motion.button
                key={template}
                variants={item}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onTemplate(template)}
                className="flex cursor-pointer flex-col items-start gap-2 rounded-xl border bg-card p-3 text-left shadow-xs outline-none transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className={cn('flex size-8 items-center justify-center rounded-lg', tone)}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-[12.5px] font-semibold">{t(`notes.template.${template}`)}</span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">
                    {t(`notes.template.${template}Hint`)}
                  </span>
                </span>
              </motion.button>
            )
          })}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="flex flex-col gap-2">
          <motion.h3 variants={item} className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t('notes.home.recent')}
          </motion.h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
            {recent.map((note) => {
              const colors = NOTE_COLOR_STYLES[note.color]
              const snippet = noteSnippet(note, 120)
              return (
                <motion.button
                  key={note.id}
                  variants={item}
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpen(note)}
                  className={cn(
                    'flex h-24 cursor-pointer flex-col rounded-xl border border-t-[3px] p-3 text-left shadow-xs outline-none transition-[border-color,box-shadow] hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring',
                    colors.surface,
                    colors.topAccent,
                  )}
                >
                  <span className="flex w-full items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">
                      {noteDisplayTitle(note, t('notes.untitled'))}
                    </span>
                    <span className="shrink-0 text-[10.5px] opacity-60">{shortDate(note.updatedAt, now)}</span>
                  </span>
                  {snippet && <span className="mt-1 line-clamp-3 text-[11px] leading-snug opacity-70">{snippet}</span>}
                </motion.button>
              )
            })}
          </div>
        </section>
      )}

      <motion.p variants={item} className="text-[11px] leading-relaxed text-muted-foreground">
        {t('notes.home.keys')}
      </motion.p>
    </motion.div>
  )
}
