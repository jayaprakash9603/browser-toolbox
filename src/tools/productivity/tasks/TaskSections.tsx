import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, LayoutGroup, Reorder, motion, useDragControls } from 'motion/react'
import { CalendarClockIcon, GripVerticalIcon } from 'lucide-react'

import { addDays, startOfDay, type Task, type TaskProject } from '@/core/tasks/model'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/utils/cn'

import { AnimatedPopoverContent } from './AnimatedPopover'
import { DuePicker, type DueValue } from './DuePicker'
import { formatDay, formatWeekday, type DayWords, type ParsedView, type TaskSection } from './logic'
import { TaskRow, type TaskRowActions } from './TaskRow'

const ROW_SPRING = { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 } as const

interface TaskSectionsProps {
  sections: TaskSection[]
  view: ParsedView
  projects: TaskProject[]
  now: number
  words: DayWords
  load: Map<string, number>
  highlightId: string | null
  actions: TaskRowActions
  onRescheduleOverdue: (value: DueValue) => void
  onReorder: (tasks: Task[]) => void
  reorderable: boolean
}

function monthDay(day: number): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(day)
}

export function TaskList({
  tasks,
  projects,
  now,
  words,
  load,
  highlightId,
  actions,
  showProject,
  timeOnly,
  onReorder,
  reorderable = false,
}: {
  tasks: Task[]
  projects: TaskProject[]
  now: number
  words: DayWords
  load: Map<string, number>
  highlightId: string | null
  actions: TaskRowActions
  showProject: boolean
  timeOnly: boolean
  onReorder?: (tasks: Task[]) => void
  reorderable?: boolean
}) {
  const [order, setOrder] = useState(tasks)
  const [synced, setSynced] = useState(tasks)
  if (synced !== tasks) {
    setSynced(tasks)
    setOrder(tasks)
  }

  const renderTask = (task: Task) => (
    <TaskRow
      task={task}
      project={projects.find((p) => p.id === task.projectId) ?? null}
      now={now}
      words={words}
      load={load}
      showProject={showProject}
      timeOnly={timeOnly}
      highlight={task.id === highlightId}
      actions={actions}
    />
  )

  const moveBy = (task: Task, step: number) => {
    if (!onReorder) return
    const from = order.findIndex((item) => item.id === task.id)
    const to = from + step
    if (from < 0 || to < 0 || to >= order.length) return
    const next = [...order]
    ;[next[from], next[to]] = [next[to], next[from]]
    setOrder(next)
    onReorder(next)
  }

  if (!reorderable || !onReorder) {
    return (
      <ul className="relative flex flex-col">
        <AnimatePresence initial={false} mode="popLayout">
          {tasks.map((task) => (
            <motion.li
              key={task.id}
              layout="position"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 28, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
              transition={ROW_SPRING}
              className="border-b border-border/50 last:border-b-0"
            >
              {renderTask(task)}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    )
  }

  return (
    <LayoutGroup>
      <Reorder.Group axis="y" values={order} onReorder={setOrder} className="relative flex flex-col">
        {order.map((task, index) => (
          <DraggableTaskRow
            key={task.id}
            task={task}
            index={index}
            total={order.length}
            onDragEnd={() => onReorder(order)}
            onMove={(step) => moveBy(task, step)}
          >
            {renderTask(task)}
          </DraggableTaskRow>
        ))}
      </Reorder.Group>
    </LayoutGroup>
  )
}

function DraggableTaskRow({
  task,
  index,
  total,
  onDragEnd,
  onMove,
  children,
}: {
  task: Task
  index: number
  total: number
  onDragEnd: () => void
  onMove: (step: number) => void
  children: ReactNode
}) {
  const { t } = useTranslation()
  const controls = useDragControls()
  const label = t('tasks.row.reorder', { title: task.title, position: index + 1, total })

  return (
    <Reorder.Item
      value={task}
      layout="position"
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.02, boxShadow: '0 12px 28px -12px rgb(0 0 0 / 0.35)', zIndex: 10 }}
      transition={ROW_SPRING}
      className="border-b border-border/50 last:border-b-0"
    >
      <div className="flex min-w-0 items-start">
        <button
          type="button"
          onPointerDown={(event) => controls.start(event)}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
            event.preventDefault()
            onMove(event.key === 'ArrowUp' ? -1 : 1)
          }}
          aria-label={label}
          aria-keyshortcuts="ArrowUp ArrowDown"
          title={label}
          className="mt-1 flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/70 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-3.5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </Reorder.Item>
  )
}

export function TaskSections({
  sections,
  view,
  projects,
  now,
  words,
  load,
  highlightId,
  actions,
  onRescheduleOverdue,
  onReorder,
  reorderable,
}: TaskSectionsProps) {
  const { t } = useTranslation()
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [reschedule, setReschedule] = useState<DueValue>({ due: null, allDay: true, recurrence: 'none', reminder: null })
  const hasOverdue = sections.some((s) => s.kind === 'overdue')
  const today = startOfDay(now)

  const heading = (section: TaskSection): string | null => {
    switch (section.kind) {
      case 'overdue':
        return t('tasks.sections.overdue')
      case 'day': {
        if (view.kind === 'today' && !hasOverdue) return null
        const date = section.date ?? today
        const name = date < addDays(today, 7) ? formatDay(date, now, words) : formatWeekday(date)
        return `${name} · ${monthDay(date)}`
      }
      case 'later':
        return t('tasks.sections.later')
      case 'results':
        return t('tasks.sections.results', { count: section.tasks.length })
      case 'completedResults':
        return t('tasks.sections.completedResults')
      case 'completedDay':
        return formatDay(section.date ?? today, now, words)
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => {
        const title = heading(section)
        const isToday = section.kind === 'day' && section.date === today
        return (
          <motion.section key={section.id} layout="position" transition={ROW_SPRING} aria-label={title ?? undefined}>
            {title && (
              <header className="mb-0.5 flex items-center gap-2 border-b pb-1.5">
                <h3
                  className={cn(
                    'text-[12.5px] font-semibold',
                    section.kind === 'overdue' && 'text-red-600 dark:text-red-400',
                    isToday && 'text-emerald-700 dark:text-emerald-400',
                  )}
                >
                  {title}
                </h3>
                {section.tasks.length > 0 && section.kind !== 'results' && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">{section.tasks.length}</span>
                )}
                {section.kind === 'overdue' && (
                  <Popover open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
                    <PopoverTrigger asChild>
                      <Button size="xs" variant="ghost" className="ml-auto h-6 gap-1 px-2 text-primary">
                        <CalendarClockIcon />
                        {t('tasks.sections.reschedule')}
                      </Button>
                    </PopoverTrigger>
                    <AnimatedPopoverContent align="end" className="w-72 p-2.5">
                      <DuePicker
                        value={reschedule}
                        now={now}
                        load={load}
                        onChange={setReschedule}
                        onDone={(value) => {
                          setRescheduleOpen(false)
                          if (value.due != null) onRescheduleOverdue(value)
                          setReschedule({ due: null, allDay: true, recurrence: 'none', reminder: null })
                        }}
                      />
                    </AnimatedPopoverContent>
                  </Popover>
                )}
              </header>
            )}
            <TaskList
              tasks={section.tasks}
              projects={projects}
              now={now}
              words={words}
              load={load}
              highlightId={highlightId}
              actions={actions}
              showProject={view.kind !== 'project'}
              timeOnly={section.kind === 'day'}
              onReorder={onReorder}
              reorderable={reorderable}
            />
          </motion.section>
        )
      })}
    </div>
  )
}
