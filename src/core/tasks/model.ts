export const TASKS_TOOL_ID = 'productivity.tasks'
export const TASKS_ROUTE = '/tools/productivity/tasks'
export const TASKS_STORAGE_KEY = 'toolbox.tasks'
export const TASK_REMINDERS_KEY = 'toolbox.tasks.reminders'
export const TASK_PREFS_KEY = 'toolbox.tasks.prefs'
export const TASK_REMINDER_ALARM = 'toolbox-tasks-reminder'
export const TASK_NOTIFICATION_PREFIX = 'toolbox-task:'
export const INBOX_ID = 'inbox'

/** All-day tasks remind at this local hour on the due day. */
export const ALL_DAY_REMINDER_HOUR = 9
export const SNOOZE_MINUTES = 10
/** Reminders missed by more than this (browser closed) are skipped instead of piling up. */
export const REMINDER_STALE_MS = 6 * 60 * 60_000

export const TASK_PRIORITIES = [1, 2, 3, 4] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const TASK_RECURRENCES = ['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly'] as const
export type TaskRecurrence = (typeof TASK_RECURRENCES)[number]

/** Minutes before the due time. */
export const REMINDER_OFFSETS = [0, 5, 15, 30, 60, 1440] as const
export type ReminderOffset = (typeof REMINDER_OFFSETS)[number]

export const PROJECT_COLORS = [
  'red',
  'orange',
  'amber',
  'green',
  'teal',
  'sky',
  'blue',
  'violet',
  'pink',
  'gray',
] as const
export type ProjectColor = (typeof PROJECT_COLORS)[number]

export const TASK_SORTS = ['smart', 'due', 'priority', 'title', 'created'] as const
export type TaskSort = (typeof TASK_SORTS)[number]

export interface TaskLink {
  url: string
  title: string
  favIconUrl?: string
}

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  notes: string
  projectId: string
  priority: TaskPriority
  labels: string[]
  /** Local midnight for all-day tasks, the exact moment otherwise. */
  due: number | null
  allDay: boolean
  reminder: ReminderOffset | null
  recurrence: TaskRecurrence
  link: TaskLink | null
  subtasks: Subtask[]
  completed: boolean
  completedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface TaskProject {
  id: string
  name: string
  color: ProjectColor
  createdAt: number
}

export interface TasksData {
  tasks: Task[]
  projects: TaskProject[]
}

export interface ReminderRecord {
  /** The reminder moment that was already announced. */
  at: number
  snoozeUntil?: number
}

export type ReminderLog = Record<string, ReminderRecord>

export interface TaskPrefs {
  view: string
  sort: TaskSort
  sound: boolean
  showPageCard: boolean
}

export const DEFAULT_TASK_PREFS: TaskPrefs = {
  view: 'today',
  sort: 'smart',
  sound: false,
  showPageCard: true,
}

const MAX_TITLE = 500
const MAX_NOTES = 20_000
const MAX_LABELS = 20

// ── Dates (local time) ────────────────────────────────────────────────────────

export function startOfDay(ms: number): number {
  const date = new Date(ms)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function addDays(ms: number, days: number): number {
  const date = new Date(ms)
  date.setDate(date.getDate() + days)
  return date.getTime()
}

export function addMonths(ms: number, months: number): number {
  const date = new Date(ms)
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return date.getTime()
}

export function withTime(ms: number, hours: number, minutes: number): number {
  const date = new Date(ms)
  date.setHours(hours, minutes, 0, 0)
  return date.getTime()
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b)
}

export function dayKey(ms: number): string {
  const date = new Date(ms)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function isWeekend(ms: number): boolean {
  const day = new Date(ms).getDay()
  return day === 0 || day === 6
}

// ── Normalization ─────────────────────────────────────────────────────────────

function newId(): string {
  return crypto.randomUUID()
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeLink(raw: unknown): TaskLink | null {
  if (!raw || typeof raw !== 'object') return null
  const link = raw as Partial<TaskLink>
  if (typeof link.url !== 'string' || !link.url.trim()) return null
  return {
    url: link.url.trim(),
    title: typeof link.title === 'string' ? link.title.slice(0, MAX_TITLE) : '',
    ...(typeof link.favIconUrl === 'string' && link.favIconUrl ? { favIconUrl: link.favIconUrl } : {}),
  }
}

function normalizeSubtasks(raw: unknown): Subtask[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is Partial<Subtask> => Boolean(item) && typeof item === 'object')
    .filter((item) => typeof item.title === 'string' && item.title.trim() !== '')
    .map((item) => ({
      id: typeof item.id === 'string' && item.id ? item.id : newId(),
      title: (item.title as string).slice(0, MAX_TITLE),
      done: item.done === true,
    }))
}

export function normalizeLabel(label: string): string {
  return label.trim().replace(/^@+/, '').replace(/\s+/g, '-').slice(0, 40)
}

export function normalizeTask(raw: Partial<Task>): Task {
  const now = Date.now()
  const updatedAt = finiteOrNull(raw.updatedAt) ?? now
  const due = finiteOrNull(raw.due)
  const allDay = due == null ? true : raw.allDay !== false
  const labels = Array.isArray(raw.labels)
    ? [...new Set(raw.labels.filter((l): l is string => typeof l === 'string').map(normalizeLabel))]
        .filter(Boolean)
        .slice(0, MAX_LABELS)
    : []
  const completed = raw.completed === true
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
    title: typeof raw.title === 'string' ? raw.title.slice(0, MAX_TITLE) : '',
    notes: typeof raw.notes === 'string' ? raw.notes.slice(0, MAX_NOTES) : '',
    projectId: typeof raw.projectId === 'string' && raw.projectId ? raw.projectId : INBOX_ID,
    priority: TASK_PRIORITIES.includes(raw.priority as TaskPriority) ? (raw.priority as TaskPriority) : 4,
    labels,
    due: due == null ? null : allDay ? startOfDay(due) : due,
    allDay,
    reminder:
      due != null && REMINDER_OFFSETS.includes(raw.reminder as ReminderOffset)
        ? (raw.reminder as ReminderOffset)
        : null,
    recurrence:
      due != null && TASK_RECURRENCES.includes(raw.recurrence as TaskRecurrence)
        ? (raw.recurrence as TaskRecurrence)
        : 'none',
    link: normalizeLink(raw.link),
    subtasks: normalizeSubtasks(raw.subtasks),
    completed,
    completedAt: completed ? (finiteOrNull(raw.completedAt) ?? updatedAt) : null,
    createdAt: finiteOrNull(raw.createdAt) ?? updatedAt,
    updatedAt,
  }
}

export function normalizeProject(raw: Partial<TaskProject>): TaskProject {
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 60) : 'Project',
    color: PROJECT_COLORS.includes(raw.color as ProjectColor) ? (raw.color as ProjectColor) : 'blue',
    createdAt: finiteOrNull(raw.createdAt) ?? Date.now(),
  }
}

export function normalizeTasksData(raw: unknown): TasksData {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<TasksData>
  const projects = Array.isArray(value.projects)
    ? value.projects
        .filter((p) => p && typeof p === 'object' && (p as TaskProject).id !== INBOX_ID)
        .map(normalizeProject)
    : []
  const projectIds = new Set(projects.map((p) => p.id))
  const tasks = Array.isArray(value.tasks)
    ? value.tasks
        .filter((t) => t && typeof t === 'object')
        .map(normalizeTask)
        .map((t) => (t.projectId === INBOX_ID || projectIds.has(t.projectId) ? t : { ...t, projectId: INBOX_ID }))
    : []
  return { tasks, projects }
}

export function createTask(partial: Partial<Task> = {}, now = Date.now()): Task {
  const timed = partial.due != null && partial.allDay === false
  return normalizeTask({
    ...partial,
    reminder: partial.reminder !== undefined ? partial.reminder : timed ? 0 : null,
    id: newId(),
    createdAt: now,
    updatedAt: now,
    completed: false,
    completedAt: null,
  })
}

export function createProject(name: string, color: ProjectColor, now = Date.now()): TaskProject {
  return normalizeProject({ id: newId(), name, color, createdAt: now })
}

export function createSubtask(title: string): Subtask {
  return { id: newId(), title: title.trim().slice(0, MAX_TITLE), done: false }
}

// ── Due state ─────────────────────────────────────────────────────────────────

export function isOverdue(task: Pick<Task, 'completed' | 'due' | 'allDay'>, now: number): boolean {
  if (task.completed || task.due == null) return false
  return task.allDay ? task.due < startOfDay(now) : task.due < now
}

export function isDueOn(task: Pick<Task, 'due'>, day: number): boolean {
  return task.due != null && isSameDay(task.due, day)
}

// ── Recurrence & completion ───────────────────────────────────────────────────

function stepOnce(due: number, recurrence: TaskRecurrence): number {
  switch (recurrence) {
    case 'daily':
      return addDays(due, 1)
    case 'weekdays': {
      let next = addDays(due, 1)
      while (isWeekend(next)) next = addDays(next, 1)
      return next
    }
    case 'weekly':
      return addDays(due, 7)
    case 'monthly':
      return addMonths(due, 1)
    case 'yearly':
      return addMonths(due, 12)
    default:
      return due
  }
}

/** The next due moment after completing a repeating task, always in the future. */
export function nextOccurrence(
  due: number,
  allDay: boolean,
  recurrence: TaskRecurrence,
  now: number,
): number | null {
  if (recurrence === 'none') return null
  const floor = allDay ? startOfDay(now) : now
  let next = stepOnce(due, recurrence)
  for (let guard = 0; next <= floor && guard < 5000; guard += 1) next = stepOnce(next, recurrence)
  return next
}

export interface CompletionResult {
  task: Task
  /** Repeating tasks move to their next date instead of being completed. */
  rolledTo: number | null
}

export function completeTask(task: Task, now: number): CompletionResult {
  if (task.recurrence !== 'none' && task.due != null) {
    const next = nextOccurrence(task.due, task.allDay, task.recurrence, now)
    if (next != null) {
      return {
        task: {
          ...task,
          due: next,
          subtasks: task.subtasks.map((s) => ({ ...s, done: false })),
          updatedAt: now,
        },
        rolledTo: next,
      }
    }
  }
  return { task: { ...task, completed: true, completedAt: now, updatedAt: now }, rolledTo: null }
}

export function reopenTask(task: Task, now: number): Task {
  return { ...task, completed: false, completedAt: null, updatedAt: now }
}

// ── Reminders ─────────────────────────────────────────────────────────────────

export function reminderTime(task: Task): number | null {
  if (task.completed || task.due == null || task.reminder == null) return null
  const base = task.allDay ? withTime(task.due, ALL_DAY_REMINDER_HOUR, 0) : task.due
  return base - task.reminder * 60_000
}

export interface ReminderPlan {
  notify: Task[]
  log: ReminderLog
  changed: boolean
  nextAt: number | null
}

function sameLog(a: ReminderLog, b: ReminderLog): boolean {
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every((key) => b[key] && a[key].at === b[key].at && a[key].snoozeUntil === b[key].snoozeUntil)
}

/**
 * Decides which reminders are due now, the bookkeeping to store, and when to wake up next.
 * A reminder set to a moment that had already passed when the task was saved stays quiet.
 */
export function planReminders(tasks: Task[], log: ReminderLog, now: number): ReminderPlan {
  const next: ReminderLog = {}
  const notify: Task[] = []
  let nextAt: number | null = null
  const wakeAt = (at: number) => {
    if (nextAt === null || at < nextAt) nextAt = at
  }

  for (const task of tasks) {
    const at = reminderTime(task)
    if (at == null) continue
    const previous = log[task.id]
    if (previous && previous.at === at) {
      if (previous.snoozeUntil == null) {
        next[task.id] = { at }
      } else if (previous.snoozeUntil <= now) {
        notify.push(task)
        next[task.id] = { at }
      } else {
        next[task.id] = { at, snoozeUntil: previous.snoozeUntil }
        wakeAt(previous.snoozeUntil)
      }
      continue
    }
    if (at > now) {
      wakeAt(at)
      continue
    }
    if (now - at <= REMINDER_STALE_MS && at >= task.updatedAt - 60_000) notify.push(task)
    next[task.id] = { at }
  }

  return { notify, log: next, changed: !sameLog(log, next), nextAt }
}

export function snoozeReminder(log: ReminderLog, task: Task, now: number): ReminderLog {
  const at = reminderTime(task)
  if (at == null) return log
  return { ...log, [task.id]: { at, snoozeUntil: now + SNOOZE_MINUTES * 60_000 } }
}

export function taskNotificationId(taskId: string): string {
  return `${TASK_NOTIFICATION_PREFIX}${taskId}`
}

export function taskIdFromNotificationId(notificationId: string): string | null {
  return notificationId.startsWith(TASK_NOTIFICATION_PREFIX)
    ? notificationId.slice(TASK_NOTIFICATION_PREFIX.length) || null
    : null
}

// ── Links ─────────────────────────────────────────────────────────────────────

export function linkHost(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'file:' ? 'file' : parsed.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Two URLs point at the same page when they only differ by fragment or a trailing slash. */
export function samePage(a: string, b: string): boolean {
  const strip = (url: string) => url.replace(/#.*$/, '').replace(/\/+$/, '')
  return strip(a) === strip(b)
}

export function isCapturableUrl(url: string | undefined): url is string {
  return Boolean(url && /^(https?|file):/i.test(url))
}
