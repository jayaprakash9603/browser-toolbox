import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import {
  CalendarIcon,
  CopyPlusIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  FlagIcon,
  ListChecksIcon,
  StickyNoteIcon,
  Trash2Icon,
} from 'lucide-react'

import { TASK_PRIORITIES, linkHost, type Task, type TaskPriority, type TaskProject } from '@/core/tasks/model'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Popover, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/utils/cn'

import { AnimatedPopoverContent } from './AnimatedPopover'
import { DuePicker, type DueValue } from './DuePicker'
import type { DayWords } from './logic'
import { TaskCheckbox } from './TaskCheckbox'
import { DueText, Favicon, ProjectDot } from './TaskMeta'
import { LABEL_TEXT, PRIORITY_STYLES } from './taskStyles'

/** Long enough to see the check land, short enough to undo with a second click. */
const COMPLETE_DELAY_MS = 420

export interface TaskRowActions {
  toggle: (task: Task) => void
  open: (task: Task) => void
  update: (task: Task, patch: Partial<Task>) => void
  remove: (task: Task) => void
  duplicate: (task: Task) => void
}

interface TaskRowProps {
  task: Task
  project: TaskProject | null
  now: number
  words: DayWords
  load: Map<string, number>
  showProject: boolean
  timeOnly: boolean
  highlight: boolean
  actions: TaskRowActions
}

export function TaskRow({ task, project, now, words, load, showProject, timeOnly, highlight, actions }: TaskRowProps) {
  const { t } = useTranslation()
  const [pendingDone, setPendingDone] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commit = useRef(() => {})

  useEffect(() => {
    commit.current = () => actions.toggle(task)
  })

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
        commit.current()
      }
    },
    [],
  )

  const toggle = () => {
    if (task.completed) {
      actions.toggle(task)
      return
    }
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
      setPendingDone(false)
      return
    }
    setPendingDone(true)
    timer.current = setTimeout(() => {
      timer.current = null
      setPendingDone(false)
      commit.current()
    }, COMPLETE_DELAY_MS)
  }

  const checked = task.completed || pendingDone
  const doneSubtasks = task.subtasks.filter((s) => s.done).length
  const dueValue: DueValue = { due: task.due, allDay: task.allDay, recurrence: task.recurrence, reminder: task.reminder }
  const busy = scheduleOpen || menuOpen

  return (
    <div
      className={cn(
        'group/row relative flex items-start gap-2 rounded-lg px-1.5 py-2 transition-colors duration-150',
        'hover:bg-muted/70 focus-within:bg-muted/70',
        busy && 'bg-muted/70',
      )}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest('a, button, [role="menu"]')) return
        actions.open(task)
      }}
    >
      {highlight && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg bg-primary/12 ring-1 ring-primary/30"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.8, ease: 'easeOut', delay: 0.3 }}
        />
      )}
      <TaskCheckbox
        checked={checked}
        priority={task.priority}
        onToggle={toggle}
        label={task.completed ? t('tasks.row.reopen', { title: task.title }) : t('tasks.row.complete', { title: task.title })}
        className="-mt-px"
      />

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => actions.open(task)}
          className={cn(
            'line-clamp-2 w-full cursor-pointer rounded-sm text-left text-[13.5px] leading-5 break-words outline-none focus-visible:ring-2 focus-visible:ring-ring',
            task.completed ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          <span
            className={cn(
              'bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat bg-[position:0_58%] [box-decoration-break:clone] transition-[background-size,color] duration-300 ease-out',
              checked ? 'bg-[length:100%_1px]' : 'bg-[length:0%_1px]',
              pendingDone && 'text-muted-foreground',
            )}
          >
            {task.title}
          </span>
        </button>

        {task.notes.trim() && !task.completed && (
          <p className="mt-0.5 truncate text-[11.5px] leading-4 text-muted-foreground">{task.notes.trim().split('\n')[0]}</p>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] leading-4 empty:hidden">
          {!task.completed && <DueText task={task} now={now} words={words} timeOnly={timeOnly} />}
          {task.priority < 4 && !task.completed && (
            <span className={cn('inline-flex items-center gap-0.5 font-medium', PRIORITY_STYLES[task.priority].text)}>
              <FlagIcon className="size-3" aria-hidden />
              P{task.priority}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span
              className={cn(
                'inline-flex items-center gap-1 tabular-nums',
                doneSubtasks === task.subtasks.length ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
              )}
              title={t('tasks.row.subtasks', { done: doneSubtasks, total: task.subtasks.length })}
            >
              <ListChecksIcon className="size-3" aria-hidden />
              {doneSubtasks}/{task.subtasks.length}
            </span>
          )}
          {task.notes.trim() && task.completed && (
            <StickyNoteIcon className="size-3 text-muted-foreground" aria-label={t('tasks.row.hasNotes')} />
          )}
          {task.link && (
            <a
              href={task.link.url}
              target="_blank"
              rel="noreferrer noopener"
              title={task.link.url}
              className="inline-flex max-w-[11rem] min-w-0 items-center gap-1 rounded-full border border-border/70 bg-background/60 py-px pr-2 pl-1 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Favicon src={task.link.favIconUrl} className="size-3" />
              <span className="truncate">{linkHost(task.link.url)}</span>
            </a>
          )}
          {task.labels.map((label) => (
            <span key={label} className={cn('max-w-[8rem] truncate', LABEL_TEXT)}>
              @{label}
            </span>
          ))}
          {showProject && (
            <span className="ml-auto inline-flex max-w-[9rem] min-w-0 items-center gap-1 text-muted-foreground">
              <span className="truncate">{project?.name ?? t('tasks.inbox')}</span>
              <ProjectDot color={project?.color ?? 'inbox'} />
            </span>
          )}
        </div>
      </div>

      {!task.completed && (
        <div
          className={cn(
            'absolute top-1 right-1 flex items-center gap-0.5 rounded-md bg-muted/95 pl-3 opacity-0 transition-opacity duration-150',
            'group-hover/row:opacity-100 group-focus-within/row:opacity-100',
            '[mask-image:linear-gradient(to_right,transparent,black_0.75rem)]',
            busy && 'opacity-100',
          )}
        >
          <Popover open={scheduleOpen} onOpenChange={setScheduleOpen}>
            <PopoverTrigger asChild>
              <Button
                size="icon-xs"
                variant="ghost"
                className="size-6 text-muted-foreground hover:text-foreground"
                aria-label={t('tasks.row.schedule')}
                title={t('tasks.row.schedule')}
              >
                <CalendarIcon />
              </Button>
            </PopoverTrigger>
            <AnimatedPopoverContent align="end" className="w-72 p-2.5" onClick={(event) => event.stopPropagation()}>
              <DuePicker
                value={dueValue}
                now={now}
                load={load}
                onChange={(next) => actions.update(task, next)}
                onDone={() => setScheduleOpen(false)}
              />
            </AnimatedPopoverContent>
          </Popover>
          {task.link && (
            <Button
              asChild
              size="icon-xs"
              variant="ghost"
              className="size-6 text-muted-foreground hover:text-foreground"
            >
              <a
                href={task.link.url}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={t('tasks.row.openLink')}
                title={t('tasks.row.openLink')}
              >
                <ExternalLinkIcon />
              </a>
            </Button>
          )}
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon-xs"
                variant="ghost"
                className="size-6 text-muted-foreground hover:text-foreground"
                aria-label={t('tasks.row.more')}
                title={t('tasks.row.more')}
              >
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" onClick={(event) => event.stopPropagation()}>
              <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
                {t('tasks.priority.label')}
              </DropdownMenuLabel>
              <div className="flex gap-1 px-1.5 pb-1.5">
                {TASK_PRIORITIES.map((priority: TaskPriority) => (
                  <DropdownMenuItem
                    key={priority}
                    onSelect={() => actions.update(task, { priority })}
                    aria-label={t(`tasks.priority.p${priority}`)}
                    title={t(`tasks.priority.p${priority}`)}
                    className={cn(
                      'flex-1 justify-center rounded-md border border-transparent p-1.5',
                      task.priority === priority && 'border-border bg-accent',
                    )}
                  >
                    <FlagIcon
                      className={cn('size-4', PRIORITY_STYLES[priority].text)}
                      fill={priority < 4 ? 'currentColor' : 'none'}
                    />
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => actions.duplicate(task)}>
                <CopyPlusIcon className="size-4" />
                {t('tasks.row.duplicate')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => actions.remove(task)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2Icon className="size-4" />
                {t('tasks.row.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
