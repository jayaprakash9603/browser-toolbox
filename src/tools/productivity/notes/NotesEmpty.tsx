import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import {
  ArchiveIcon,
  FilterXIcon,
  ListChecksIcon,
  NotebookPenIcon,
  PinIcon,
  SearchXIcon,
  Trash2Icon,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/shared/utils/cn'

export type NotesEmptyKind = 'all' | 'pinned' | 'checklists' | 'archive' | 'trash' | 'search' | 'filter'

const ICONS: Record<NotesEmptyKind, { icon: LucideIcon; tone: string }> = {
  all: { icon: NotebookPenIcon, tone: 'bg-primary/12 text-primary' },
  pinned: { icon: PinIcon, tone: 'bg-amber-500/12 text-amber-600 dark:text-amber-400' },
  checklists: { icon: ListChecksIcon, tone: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400' },
  archive: { icon: ArchiveIcon, tone: 'bg-sky-500/12 text-sky-600 dark:text-sky-400' },
  trash: { icon: Trash2Icon, tone: 'bg-muted text-muted-foreground' },
  search: { icon: SearchXIcon, tone: 'bg-muted text-muted-foreground' },
  filter: { icon: FilterXIcon, tone: 'bg-violet-500/12 text-violet-600 dark:text-violet-400' },
}

export function NotesEmpty({ kind, query, children }: { kind: NotesEmptyKind; query?: string; children?: ReactNode }) {
  const { t } = useTranslation()
  const { icon: Icon, tone } = ICONS[kind]
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }}
      className="flex flex-col items-center px-4 py-10 text-center"
    >
      <motion.span
        className={cn('relative mb-3 flex size-14 items-center justify-center rounded-2xl', tone)}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon className="size-7" aria-hidden />
        <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-current opacity-30" aria-hidden />
        <span className="absolute -bottom-1.5 -left-1 size-1.5 rounded-full bg-current opacity-40" aria-hidden />
      </motion.span>
      <p className="text-[14px] font-semibold">{t(`notes.emptyState.${kind}.title`, { query })}</p>
      <p className="mt-1 max-w-[18rem] text-[12px] leading-relaxed text-muted-foreground">
        {t(`notes.emptyState.${kind}.body`, { query })}
      </p>
      {children && <div className="mt-4 flex flex-wrap justify-center gap-1.5">{children}</div>}
    </motion.div>
  )
}
