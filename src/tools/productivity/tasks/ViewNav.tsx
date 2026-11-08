import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { CalendarRangeIcon, CircleCheckBigIcon, InboxIcon, PlusIcon, TagIcon } from 'lucide-react'

import type { TaskProject } from '@/core/tasks/model'
import { cn } from '@/shared/utils/cn'

import type { ViewCounts } from './logic'
import { ProjectDot } from './TaskMeta'

interface ViewNavProps {
  current: string
  counts: ViewCounts
  projects: TaskProject[]
  labels: string[]
  layout: 'rail' | 'sidebar'
  todayDate: number
  onSelect: (id: string) => void
  onAddProject: () => void
}

interface NavItem {
  id: string
  label: string
  icon: ReactNode
  count?: number
  alert?: boolean
}

function TodayGlyph({ date }: { date: number }) {
  return (
    <span
      aria-hidden
      className="relative flex size-4 shrink-0 items-end justify-center rounded-[4px] border-[1.5px] border-current pb-px text-[8px] leading-none font-bold tabular-nums"
    >
      <span className="absolute inset-x-0 top-0 h-[3px] bg-current" />
      {new Date(date).getDate()}
    </span>
  )
}

export function ViewNav({ current, counts, projects, labels, layout, todayDate, onSelect, onAddProject }: ViewNavProps) {
  const { t } = useTranslation()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const list = listRef.current
    const active = list?.querySelector<HTMLElement>('[aria-current="page"]')
    if (layout !== 'rail' || !list || !active) return
    list.scrollTo?.({ left: active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2, behavior: 'smooth' })
  }, [current, layout])

  const main: NavItem[] = [
    {
      id: 'today',
      label: t('tasks.views.today'),
      icon: <TodayGlyph date={todayDate} />,
      count: counts.today,
      alert: counts.overdue > 0,
    },
    { id: 'upcoming', label: t('tasks.views.upcoming'), icon: <CalendarRangeIcon className="size-4" aria-hidden />, count: counts.upcoming },
    { id: 'inbox', label: t('tasks.views.inbox'), icon: <InboxIcon className="size-4" aria-hidden />, count: counts.inbox },
  ]
  const projectItems: NavItem[] = projects.map((project) => ({
    id: `project:${project.id}`,
    label: project.name,
    icon: <ProjectDot color={project.color} className="mx-1" />,
    count: counts.projects[project.id] ?? 0,
  }))
  const labelItems: NavItem[] = labels.map((label) => ({
    id: `label:${label}`,
    label: `@${label}`,
    icon: <TagIcon className="size-3.5 text-violet-500" aria-hidden />,
    count: counts.labels[label.toLowerCase()] ?? 0,
  }))
  const completed: NavItem = {
    id: 'completed',
    label: t('tasks.views.completed'),
    icon: <CircleCheckBigIcon className="size-4" aria-hidden />,
  }

  const renderItem = (item: NavItem) => {
    const active = item.id === current
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={active ? 'page' : undefined}
        title={item.label}
        className={cn(
          'relative flex shrink-0 cursor-pointer items-center gap-1.5 text-[12.5px] font-medium outline-none transition-colors duration-150',
          'focus-visible:ring-2 focus-visible:ring-ring',
          layout === 'rail' ? 'h-8 rounded-full px-3' : 'h-8 w-full rounded-lg px-2.5',
          active ? 'text-primary' : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground',
        )}
      >
        {active && (
          <motion.span
            layoutId="tasks-nav-pill"
            aria-hidden
            className={cn(
              'absolute inset-0 bg-primary/10 ring-1 ring-primary/20 ring-inset',
              layout === 'rail' ? 'rounded-full' : 'rounded-lg',
            )}
            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
          />
        )}
        <span className="relative flex items-center">{item.icon}</span>
        <span className={cn('relative truncate', layout === 'rail' ? 'max-w-[9rem]' : 'flex-1 text-left')}>
          {item.label}
        </span>
        {item.count != null && item.count > 0 && (
          <motion.span
            key={item.count}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 22 }}
            className={cn(
              'relative min-w-4 rounded-full px-1 text-center text-[10.5px] leading-4 tabular-nums',
              item.alert
                ? 'bg-red-500/15 font-semibold text-red-600 dark:text-red-400'
                : active
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            {item.count}
          </motion.span>
        )}
      </button>
    )
  }

  const addProject = (
    <button
      type="button"
      onClick={onAddProject}
      aria-label={t('tasks.project.new')}
      title={t('tasks.project.new')}
      className={cn(
        'flex shrink-0 cursor-pointer items-center justify-center text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
        layout === 'rail' ? 'size-8 rounded-full border border-dashed' : 'size-6 rounded-md',
      )}
    >
      <PlusIcon className="size-3.5" />
    </button>
  )

  if (layout === 'rail') {
    return (
      <nav aria-label={t('tasks.views.label')} className="-mx-1">
        <div
          ref={listRef}
          className="scrollbar-none flex items-center gap-1 overflow-x-auto px-1 py-0.5 [mask-image:linear-gradient(to_right,transparent,black_0.5rem,black_calc(100%-1.5rem),transparent)]"
        >
          {main.map(renderItem)}
          <span className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden />
          {projectItems.map(renderItem)}
          {addProject}
          {labelItems.length > 0 && <span className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden />}
          {labelItems.map(renderItem)}
          <span className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden />
          {renderItem(completed)}
          <span className="w-4 shrink-0" aria-hidden />
        </div>
      </nav>
    )
  }

  return (
    <nav aria-label={t('tasks.views.label')} className="scrollbar-styled flex w-48 shrink-0 flex-col gap-4 overflow-y-auto pr-1">
      <div className="flex flex-col gap-0.5">
        {main.map(renderItem)}
        {renderItem(completed)}
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between px-2.5 pb-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t('tasks.views.projects')}
          </span>
          {addProject}
        </div>
        {projectItems.length ? (
          projectItems.map(renderItem)
        ) : (
          <p className="px-2.5 text-[11.5px] text-muted-foreground">{t('tasks.views.noProjects')}</p>
        )}
      </div>
      {labelItems.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="px-2.5 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t('tasks.views.labels')}
          </span>
          {labelItems.map(renderItem)}
        </div>
      )}
    </nav>
  )
}
