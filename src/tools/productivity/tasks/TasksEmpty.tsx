import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import {
  CalendarRangeIcon,
  CircleCheckBigIcon,
  FolderOpenIcon,
  InboxIcon,
  PartyPopperIcon,
  SearchXIcon,
  SunIcon,
  TagIcon,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/shared/utils/cn'

export type EmptyKind = 'todayDone' | 'today' | 'upcoming' | 'inbox' | 'project' | 'label' | 'completed' | 'search'

const ICONS: Record<EmptyKind, { icon: LucideIcon; tone: string }> = {
  todayDone: { icon: PartyPopperIcon, tone: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400' },
  today: { icon: SunIcon, tone: 'bg-amber-500/12 text-amber-600 dark:text-amber-400' },
  upcoming: { icon: CalendarRangeIcon, tone: 'bg-violet-500/12 text-violet-600 dark:text-violet-400' },
  inbox: { icon: InboxIcon, tone: 'bg-primary/12 text-primary' },
  project: { icon: FolderOpenIcon, tone: 'bg-sky-500/12 text-sky-600 dark:text-sky-400' },
  label: { icon: TagIcon, tone: 'bg-violet-500/12 text-violet-600 dark:text-violet-400' },
  completed: { icon: CircleCheckBigIcon, tone: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400' },
  search: { icon: SearchXIcon, tone: 'bg-muted text-muted-foreground' },
}

export function TasksEmpty({ kind, query }: { kind: EmptyKind; query?: string }) {
  const { t } = useTranslation()
  const { icon: Icon, tone } = ICONS[kind]
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }}
      className="flex flex-col items-center px-6 py-10 text-center"
    >
      <motion.span
        className={cn('relative mb-3 flex size-14 items-center justify-center rounded-2xl', tone)}
        animate={{ y: [0, -4, 0], rotate: kind === 'todayDone' ? [0, -6, 6, 0] : 0 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon className="size-7" aria-hidden />
        <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-current opacity-30" aria-hidden />
        <span className="absolute -bottom-1.5 -left-1 size-1.5 rounded-full bg-current opacity-40" aria-hidden />
      </motion.span>
      <p className="text-[14px] font-semibold">{t(`tasks.empty.${kind}.title`, { query })}</p>
      <p className="mt-1 max-w-[18rem] text-[12px] leading-relaxed text-muted-foreground">
        {t(`tasks.empty.${kind}.body`, { query })}
      </p>
    </motion.div>
  )
}
