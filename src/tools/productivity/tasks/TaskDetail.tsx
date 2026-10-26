import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import {
  AtSignIcon,
  BellIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  CopyPlusIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  FlagIcon,
  FolderIcon,
  InboxIcon,
  Link2Icon,
  ListChecksIcon,
  PlusIcon,
  RepeatIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'

import type { ActivePage } from '@/core/tasks/activePage'
import {
  INBOX_ID,
  TASK_PRIORITIES,
  createSubtask,
  linkHost,
  normalizeLabel,
  type Subtask,
  type Task,
  type TaskProject,
} from '@/core/tasks/model'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Popover, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/utils/cn'

import { AnimatedPopoverContent } from './AnimatedPopover'
import { DuePicker } from './DuePicker'
import { reminderLabel, useDayWords } from './labels'
import { dueTone, formatDateTime, formatDue } from './logic'
import { TaskCheckbox } from './TaskCheckbox'
import { Favicon, ProjectDot } from './TaskMeta'
import { DUE_TONE_STYLES, LABEL_TEXT, PRIORITY_STYLES } from './taskStyles'

export interface TaskDetailActions {
  update: (task: Task, patch: Partial<Task>) => void
  toggle: (task: Task) => void
  remove: (task: Task) => void
  duplicate: (task: Task) => void
  copy: (task: Task) => void
}

interface TaskDetailProps {
  task: Task | null
  projects: TaskProject[]
  knownLabels: string[]
  now: number
  load: Map<string, number>
  activePage: ActivePage | null
  actions: TaskDetailActions
  onClose: () => void
}

export function TaskDetail({ task, onClose, ...rest }: TaskDetailProps) {
  const dragControls = useDragControls()
  return (
    <DialogPrimitive.Root open={task != null} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {task && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.18 } }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-2xl border border-b-0 bg-background shadow-2xl outline-none"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                drag="y"
                dragListener={false}
                dragControls={dragControls}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.05, bottom: 0.6 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 110 || info.velocity.y > 600) onClose()
                }}
              >
                <div
                  className="flex shrink-0 cursor-grab touch-none justify-center pt-2 pb-1 active:cursor-grabbing"
                  onPointerDown={(event) => dragControls.start(event)}
                  aria-hidden
                >
                  <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
                </div>
                <DetailBody key={task.id} task={task} onClose={onClose} {...rest} />
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

type DetailBodyProps = Omit<TaskDetailProps, 'task'> & { task: Task }

function DetailBody({ task, projects, knownLabels, now, load, activePage, actions, onClose }: DetailBodyProps) {
  const { t } = useTranslation()
  const words = useDayWords()
  const labelListId = useId()
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes)
  const [labelDraft, setLabelDraft] = useState('')
  const [subtaskDraft, setSubtaskDraft] = useState('')
  const [dueOpen, setDueOpen] = useState(false)
  const pending = useRef({ title, notes, task })

  useEffect(() => {
    pending.current = { title, notes, task }
  })

  const commitText = () => {
    const { title: nextTitle, notes: nextNotes, task: latest } = pending.current
    const patch: Partial<Task> = {}
    if (nextTitle.trim() && nextTitle.trim() !== latest.title) patch.title = nextTitle.trim()
    if (nextNotes !== latest.notes) patch.notes = nextNotes
    if (Object.keys(patch).length) actions.update(latest, patch)
  }

  const commitRef = useRef(commitText)
  useEffect(() => {
    commitRef.current = commitText
  })
  useEffect(() => () => commitRef.current(), [])

  const project = projects.find((p) => p.id === task.projectId) ?? null
  const doneSubtasks = task.subtasks.filter((s) => s.done).length
  const progress = task.subtasks.length ? doneSubtasks / task.subtasks.length : 0

  const setSubtasks = (subtasks: Subtask[]) => actions.update(task, { subtasks })

  const addLabel = () => {
    const label = normalizeLabel(labelDraft.replace(/^@/, ''))
    setLabelDraft('')
    if (!label || task.labels.some((l) => l.toLowerCase() === label.toLowerCase())) return
    actions.update(task, { labels: [...task.labels, label] })
  }

  const addSubtask = () => {
    const titleText = subtaskDraft.trim()
    if (!titleText) return
    setSubtaskDraft('')
    setSubtasks([...task.subtasks, createSubtask(titleText)])
  }

  const unusedLabels = knownLabels.filter((label) => !task.labels.some((l) => l.toLowerCase() === label.toLowerCase()))

  return (
    <div className="scrollbar-styled flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
      <div className="flex items-start gap-2">
        <TaskCheckbox
          checked={task.completed}
          priority={task.priority}
          onToggle={() => actions.toggle(task)}
          label={task.completed ? t('tasks.row.reopen', { title: task.title }) : t('tasks.row.complete', { title: task.title })}
          className="mt-0.5"
        />
        <DialogPrimitive.Title asChild>
          <textarea
            value={title}
            rows={1}
            onChange={(event) => setTitle(event.target.value.replace(/\r?\n/g, ' '))}
            onBlur={commitText}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
            }}
            maxLength={500}
            aria-label={t('tasks.detail.title')}
            className={cn(
              'min-h-7 flex-1 resize-none rounded-md bg-transparent px-1 py-0.5 text-[16px] leading-6 font-semibold outline-none [field-sizing:content] focus-visible:bg-muted/60',
              task.completed && 'text-muted-foreground line-through',
            )}
          />
        </DialogPrimitive.Title>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label={t('tasks.row.more')} title={t('tasks.row.more')}>
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => actions.copy(task)}>
              <CopyIcon className="size-4" />
              {t('tasks.detail.copy')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => actions.duplicate(task)}>
              <CopyPlusIcon className="size-4" />
              {t('tasks.row.duplicate')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                actions.remove(task)
                onClose()
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2Icon className="size-4" />
              {t('tasks.row.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DialogPrimitive.Close asChild>
          <Button size="icon-sm" variant="ghost" aria-label={t('dialogs.close')} title={t('dialogs.close')}>
            <XIcon />
          </Button>
        </DialogPrimitive.Close>
      </div>

      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        onBlur={commitText}
        placeholder={t('tasks.detail.notesPlaceholder')}
        aria-label={t('tasks.detail.notes')}
        maxLength={20000}
        className="-mt-2 ml-8 min-h-10 resize-none rounded-md bg-transparent px-1 py-1 text-[13px] leading-5 text-foreground/90 outline-none [field-sizing:content] placeholder:text-muted-foreground/70 focus-visible:bg-muted/60"
      />

      {task.link ? (
        <div className="group/link flex items-center gap-2.5 rounded-xl border bg-muted/30 p-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
            <Favicon src={task.link.favIconUrl} className="size-4" />
          </span>
          <a
            href={task.link.url}
            target="_blank"
            rel="noreferrer noopener"
            className="min-w-0 flex-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="block truncate text-[12.5px] font-medium group-hover/link:text-primary">
              {task.link.title || linkHost(task.link.url)}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">{task.link.url}</span>
          </a>
          <Button asChild size="icon-xs" variant="ghost">
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
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => actions.update(task, { link: null })}
            aria-label={t('tasks.composer.removeLink')}
            title={t('tasks.composer.removeLink')}
          >
            <XIcon />
          </Button>
        </div>
      ) : (
        activePage && (
          <Button
            size="xs"
            variant="outline"
            className="self-start"
            onClick={() =>
              actions.update(task, {
                link: {
                  url: activePage.url,
                  title: activePage.title,
                  ...(activePage.favIconUrl ? { favIconUrl: activePage.favIconUrl } : {}),
                },
              })
            }
          >
            <Link2Icon />
            {t('tasks.detail.attachPage', { host: linkHost(activePage.url) })}
          </Button>
        )
      )}

      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-[12.5px]">
        <dt className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarIcon className="size-3.5" aria-hidden />
          {t('tasks.detail.date')}
        </dt>
        <dd className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Popover open={dueOpen} onOpenChange={setDueOpen}>
            <PopoverTrigger asChild>
              <Button
                size="xs"
                variant="outline"
                className={cn(
                  'max-w-full',
                  task.due != null ? DUE_TONE_STYLES[dueTone(task.due, task.allDay, now)] : 'text-muted-foreground',
                )}
              >
                {task.due != null ? formatDue(task.due, task.allDay, now, words) : t('tasks.detail.noDate')}
                <ChevronDownIcon className="opacity-60" />
              </Button>
            </PopoverTrigger>
            <AnimatedPopoverContent align="start" className="w-72 p-2.5">
              <DuePicker
                value={{ due: task.due, allDay: task.allDay, recurrence: task.recurrence, reminder: task.reminder }}
                now={now}
                load={load}
                onChange={(value) => actions.update(task, value)}
                onDone={() => setDueOpen(false)}
              />
            </AnimatedPopoverContent>
          </Popover>
          {task.due != null && task.recurrence !== 'none' && (
            <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
              <RepeatIcon className="size-3" aria-hidden />
              {t(`tasks.repeat.${task.recurrence}`)}
            </span>
          )}
          {task.due != null && task.reminder != null && (
            <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
              <BellIcon className="size-3" aria-hidden />
              {reminderLabel(t, task.reminder, task.allDay)}
            </span>
          )}
        </dd>

        <dt className="flex items-center gap-1.5 text-muted-foreground">
          <FlagIcon className="size-3.5" aria-hidden />
          {t('tasks.priority.label')}
        </dt>
        <dd className="flex items-center gap-1" role="radiogroup" aria-label={t('tasks.priority.label')}>
          {TASK_PRIORITIES.map((priority) => {
            const selected = task.priority === priority
            return (
              <motion.button
                key={priority}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={t(`tasks.priority.p${priority}`)}
                title={t(`tasks.priority.p${priority}`)}
                whileTap={{ scale: 0.9 }}
                onClick={() => actions.update(task, { priority })}
                className={cn(
                  'flex h-7 cursor-pointer items-center gap-1 rounded-md border px-2 text-[11.5px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  selected ? cn('border-current', PRIORITY_STYLES[priority].soft, PRIORITY_STYLES[priority].text) : 'border-transparent text-muted-foreground hover:bg-accent',
                )}
              >
                <FlagIcon
                  className={cn('size-3.5', PRIORITY_STYLES[priority].text)}
                  fill={priority < 4 ? 'currentColor' : 'none'}
                  aria-hidden
                />
                P{priority}
              </motion.button>
            )
          })}
        </dd>

        <dt className="flex items-center gap-1.5 text-muted-foreground">
          <FolderIcon className="size-3.5" aria-hidden />
          {t('tasks.composer.project')}
        </dt>
        <dd>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="xs" variant="outline" className="max-w-full">
                {project ? <ProjectDot color={project.color} /> : <InboxIcon className="text-primary" />}
                <span className="truncate">{project?.name ?? t('tasks.inbox')}</span>
                <ChevronDownIcon className="opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 w-48">
              <DropdownMenuItem onSelect={() => actions.update(task, { projectId: INBOX_ID })}>
                <InboxIcon className="size-4 text-primary" />
                {t('tasks.inbox')}
                {task.projectId === INBOX_ID && <CheckIcon className="ml-auto size-3.5 text-primary" />}
              </DropdownMenuItem>
              {projects.length > 0 && <DropdownMenuSeparator />}
              {projects.map((item) => (
                <DropdownMenuItem key={item.id} onSelect={() => actions.update(task, { projectId: item.id })}>
                  <ProjectDot color={item.color} className="mx-1" />
                  <span className="truncate">{item.name}</span>
                  {task.projectId === item.id && <CheckIcon className="ml-auto size-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </dd>

        <dt className="flex items-center gap-1.5 self-start pt-1 text-muted-foreground">
          <AtSignIcon className="size-3.5" aria-hidden />
          {t('tasks.composer.labels')}
        </dt>
        <dd className="flex min-w-0 flex-wrap items-center gap-1">
          <AnimatePresence initial={false} mode="popLayout">
            {task.labels.map((label) => (
              <motion.span
                key={label}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
                className={cn(
                  'inline-flex h-6 items-center gap-0.5 rounded-full bg-violet-500/10 pr-0.5 pl-2 text-[11.5px] font-medium',
                  LABEL_TEXT,
                )}
              >
                @{label}
                <button
                  type="button"
                  onClick={() => actions.update(task, { labels: task.labels.filter((l) => l !== label) })}
                  aria-label={t('tasks.detail.removeLabel', { label })}
                  className="flex size-5 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-violet-500/15"
                >
                  <XIcon className="size-3" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          <input
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault()
                addLabel()
              }
            }}
            onBlur={() => labelDraft.trim() && addLabel()}
            list={labelListId}
            placeholder={t('tasks.detail.addLabel')}
            aria-label={t('tasks.detail.addLabel')}
            className="h-6 w-28 min-w-0 flex-1 rounded-md bg-transparent px-1.5 text-[12px] outline-none placeholder:text-muted-foreground/70 focus-visible:bg-muted/60"
          />
          <datalist id={labelListId}>
            {unusedLabels.map((label) => (
              <option key={label} value={label} />
            ))}
          </datalist>
        </dd>
      </dl>

      <section className="flex flex-col gap-2" aria-label={t('tasks.detail.subtasks')}>
        <div className="flex items-center gap-2">
          <ListChecksIcon className="size-3.5 text-muted-foreground" aria-hidden />
          <h3 className="text-[12.5px] font-semibold">{t('tasks.detail.subtasks')}</h3>
          {task.subtasks.length > 0 && (
            <>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {doneSubtasks}/{task.subtasks.length}
              </span>
              <span className="ml-1 h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.span
                  className="block h-full origin-left rounded-full bg-emerald-500"
                  initial={false}
                  animate={{ scaleX: progress }}
                  transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                />
              </span>
            </>
          )}
        </div>
        <ul className="flex flex-col">
          <AnimatePresence initial={false}>
            {task.subtasks.map((subtask) => (
              <motion.li
                key={subtask.id}
                layout="position"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 16, transition: { duration: 0.14 } }}
                className="group/sub flex items-center gap-1.5 rounded-md py-0.5 pr-1 hover:bg-muted/60"
              >
                <TaskCheckbox
                  size="sm"
                  checked={subtask.done}
                  priority={4}
                  onToggle={() =>
                    setSubtasks(task.subtasks.map((s) => (s.id === subtask.id ? { ...s, done: !s.done } : s)))
                  }
                  label={subtask.done ? t('tasks.row.reopen', { title: subtask.title }) : t('tasks.row.complete', { title: subtask.title })}
                />
                <input
                  defaultValue={subtask.title}
                  onBlur={(event) => {
                    const next = event.target.value.trim()
                    if (!next) event.target.value = subtask.title
                    else if (next !== subtask.title) {
                      setSubtasks(task.subtasks.map((s) => (s.id === subtask.id ? { ...s, title: next } : s)))
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                  aria-label={t('tasks.detail.subtaskTitle')}
                  className={cn(
                    'h-7 min-w-0 flex-1 rounded-sm bg-transparent px-1 text-[13px] outline-none focus-visible:bg-background',
                    subtask.done && 'text-muted-foreground line-through',
                  )}
                />
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="size-6 text-muted-foreground opacity-0 group-hover/sub:opacity-100 focus-visible:opacity-100"
                  onClick={() => setSubtasks(task.subtasks.filter((s) => s.id !== subtask.id))}
                  aria-label={t('tasks.detail.removeSubtask', { title: subtask.title })}
                  title={t('tasks.detail.removeSubtask', { title: subtask.title })}
                >
                  <XIcon />
                </Button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <div className="flex items-center gap-1.5 rounded-md border border-dashed px-1.5 focus-within:border-primary/50 focus-within:border-solid">
          <PlusIcon className="size-3.5 text-muted-foreground" aria-hidden />
          <input
            value={subtaskDraft}
            onChange={(event) => setSubtaskDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addSubtask()
              }
            }}
            placeholder={t('tasks.detail.addSubtask')}
            aria-label={t('tasks.detail.addSubtask')}
            maxLength={500}
            className="h-8 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/70"
          />
        </div>
      </section>

      <p className="border-t pt-3 text-[11px] text-muted-foreground">
        {t('tasks.detail.created', { time: formatDateTime(task.createdAt) })}
        {task.completedAt != null && ` · ${t('tasks.detail.completed', { time: formatDateTime(task.completedAt) })}`}
      </p>
    </div>
  )
}
